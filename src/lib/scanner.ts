export type DigitContractType =
  | 'DIGITDIFF'
  | 'DIGITOVER'
  | 'DIGITUNDER'
  | 'DIGITEVEN'
  | 'DIGITODD'

export interface DigitSignal {
  contractType: DigitContractType
  displayName: string
  digit?: number
  rationale: string
  edge: number
  winProbability: number
  /**
   * Statistical significance of the deviation from the expected
   * (fair/uniform) distribution, expressed as a z-score. Higher
   * = less likely to be random noise. This — not raw win
   * probability — is what signals are ranked by, since raw win
   * probability trivially favors extreme thresholds (e.g. "Over 1"
   * wins ~80% of the time on ANY random data, significant or not).
   */
  zScore: number
}

export interface ScanResult {
  symbol: string
  display_name: string
  market: string
  submarket: string
  lastDigit: number
  lastPrice: number
  tickCount: number
  digitCounts: number[]
  digitFreq: number[]
  signals: DigitSignal[]
  bestSignal: DigitSignal | null
  overallScore: number
}

export interface RawSymbol {
  market: string
  market_display_name?: string
  submarket: string
  submarket_display_name?: string
  underlying_symbol?: string
  symbol?: string
  underlying_symbol_name?: string
  display_name?: string
  exchange_is_open: number
  pip_size?: number
  pip?: number
}

const TICK_HISTORY_COUNT = 500

export function lastDigitOf(quote: number): number {
  if (!Number.isFinite(quote)) return 0
  const text = String(Math.abs(quote))
  if (!text.includes('.')) return Math.trunc(Math.abs(quote)) % 10
  const places = text.split('.')[1].length
  const intVal = Math.round(Math.abs(quote) * Math.pow(10, places))
  return intVal % 10
}

function computeDigitStats(tickQuotes: number[]) {
  const counts = new Array(10).fill(0)
  for (const q of tickQuotes) {
    const d = lastDigitOf(q)
    counts[d]++
  }
  const total = tickQuotes.length || 1
  const freq = counts.map((c) => c / total)
  return { counts, freq, total }
}

function overProb(freq: number[], digit: number): number {
  let p = 0
  for (let i = digit + 1; i < 10; i++) p += freq[i]
  return p
}

function underProb(freq: number[], digit: number): number {
  let p = 0
  for (let i = 0; i < digit; i++) p += freq[i]
  return p
}

function evenProb(freq: number[]): number {
  return freq[0] + freq[2] + freq[4] + freq[6] + freq[8]
}

function oddProb(freq: number[]): number {
  return freq[1] + freq[3] + freq[5] + freq[7] + freq[9]
}

/**
 * Standard error of a sample proportion under the null hypothesis
 * that the true probability is `expected` (binomial std. error).
 */
function stdErr(expected: number, n: number): number {
  if (n <= 0) return Infinity
  return Math.sqrt((expected * (1 - expected)) / n)
}

/**
 * z-score of an observed proportion vs. the expected proportion
 * under a fair/uniform digit distribution. This is the key fix:
 * raw "edge" (observed - expected) is NOT comparable across
 * thresholds, because the natural sampling noise of a proportion
 * scales with sqrt(p·(1-p)). A threshold like "Over 1" has an
 * expected probability of 0.8 — noise there is ~33% wider than at
 * "Over 8" (expected 0.1) — so raw edge will spuriously favor
 * extreme thresholds on ANY random data, not just markets with a
 * genuine anomaly. Dividing by the standard error puts every
 * threshold, and every signal type, on the same statistical
 * footing so the scanner surfaces real deviations instead of an
 * artifact of the metric.
 */
function zScoreOf(observed: number, expected: number, n: number): number {
  const se = stdErr(expected, n)
  if (!Number.isFinite(se) || se === 0) return 0
  return (observed - expected) / se
}

// A signal needs at least this many ticks and this much statistical
// significance (~90% one-tailed confidence at z=1.28, ~87% at 1.15)
// before the scanner will surface it as a real edge. Below this it's
// treated as noise, not a trading opportunity.
const MIN_SAMPLE_SIZE = 100
const Z_SIGNIFICANCE_THRESHOLD = 1.28

// Over/Under barriers are restricted to this mid-range. Barriers at
// the extremes (0, 1, 8, 9) have a structurally high "win rate" by
// definition — e.g. Over 1 wins whenever the last digit isn't 0 or 1,
// ~80% of the time on perfectly random data — but pay out very
// little and reflect no real edge. Real trading tools avoid
// recommending these as "signals" since they're just a property of
// the contract, not of the market.
const OVER_UNDER_BARRIER_RANGE = [2, 3, 4, 5, 6, 7]

export interface ScanWs {
  send: (req: Record<string, unknown>) => Promise<any>
}

export async function fetchTickHistory(ws: ScanWs, symbol: string, count: number = TICK_HISTORY_COUNT): Promise<number[]> {
  const res = await ws.send({
    ticks_history: symbol,
    end: 'latest',
    count,
    style: 'ticks',
  })
  if (res?.error) throw new Error(res.error.message || 'Failed to fetch ticks')
  const prices = res?.prices ?? res?.history?.prices
  if (!Array.isArray(prices)) return []
  return prices.map((p: any) => Number(p)).filter((n: number) => Number.isFinite(n))
}

export function analyzeTicks(
  symbol: string,
  display_name: string,
  tickQuotes: number[],
  market: string = '',
  submarket: string = '',
): ScanResult {
  const { counts, freq, total } = computeDigitStats(tickQuotes)
  const lastPrice = tickQuotes.length > 0 ? tickQuotes[tickQuotes.length - 1] : 0
  const lastDigit = tickQuotes.length > 0 ? lastDigitOf(lastPrice) : 0
  const signals: DigitSignal[] = []

  const hasEnoughSamples = total >= MIN_SAMPLE_SIZE

  let mostFreqDigit = 0
  for (let i = 1; i < 10; i++) {
    if (counts[i] > counts[mostFreqDigit]) mostFreqDigit = i
  }

  // Differs: only a real "signal" if the digit is genuinely
  // over-represented (statistically hot), not just because Differs
  // has a high win rate by construction (~90% for ANY digit).
  if (hasEnoughSamples) {
    const hotFreq = freq[mostFreqDigit]
    const differsZ = zScoreOf(hotFreq, 0.1, total)
    if (differsZ >= Z_SIGNIFICANCE_THRESHOLD) {
      const differsWinProb = 1 - hotFreq
      signals.push({
        contractType: 'DIGITDIFF',
        displayName: `Differs ${mostFreqDigit}`,
        digit: mostFreqDigit,
        edge: hotFreq - 0.1,
        winProbability: differsWinProb,
        zScore: differsZ,
        rationale: `Digit ${mostFreqDigit} appeared ${(hotFreq * 100).toFixed(1)}% of the time — statistically hot vs. the 10% baseline (z=${differsZ.toFixed(2)}). Differs wins ${(differsWinProb * 100).toFixed(1)}% of the time historically.`,
      })
    }
  }

  // Over / Under — evaluate mid-range barriers only (see
  // OVER_UNDER_BARRIER_RANGE) and rank by statistical significance
  // (z-score), not raw win probability or raw edge.
  if (hasEnoughSamples) {
    let bestOverDigit: number | null = null
    let bestOverZ = -Infinity
    let bestUnderDigit: number | null = null
    let bestUnderZ = -Infinity

    for (const d of OVER_UNDER_BARRIER_RANGE) {
      const op = overProb(freq, d)
      const oExpected = (9 - d) / 10
      const oz = zScoreOf(op, oExpected, total)
      if (oz > bestOverZ) { bestOverZ = oz; bestOverDigit = d }

      const up = underProb(freq, d)
      const uExpected = d / 10
      const uz = zScoreOf(up, uExpected, total)
      if (uz > bestUnderZ) { bestUnderZ = uz; bestUnderDigit = d }
    }

    if (bestOverDigit !== null && bestOverZ >= Z_SIGNIFICANCE_THRESHOLD) {
      const op = overProb(freq, bestOverDigit)
      const expected = (9 - bestOverDigit) / 10
      signals.push({
        contractType: 'DIGITOVER',
        displayName: `Over ${bestOverDigit}`,
        digit: bestOverDigit,
        edge: op - expected,
        winProbability: op,
        zScore: bestOverZ,
        rationale: `Digits above ${bestOverDigit} occurred ${(op * 100).toFixed(1)}% of the time vs. an expected ${(expected * 100).toFixed(0)}% — a statistically significant deviation (z=${bestOverZ.toFixed(2)}).`,
      })
    }

    if (bestUnderDigit !== null && bestUnderZ >= Z_SIGNIFICANCE_THRESHOLD) {
      const up = underProb(freq, bestUnderDigit)
      const expected = bestUnderDigit / 10
      signals.push({
        contractType: 'DIGITUNDER',
        displayName: `Under ${bestUnderDigit}`,
        digit: bestUnderDigit,
        edge: up - expected,
        winProbability: up,
        zScore: bestUnderZ,
        rationale: `Digits below ${bestUnderDigit} occurred ${(up * 100).toFixed(1)}% of the time vs. an expected ${(expected * 100).toFixed(0)}% — a statistically significant deviation (z=${bestUnderZ.toFixed(2)}).`,
      })
    }
  }

  // Even / Odd
  if (hasEnoughSamples) {
    const eProb = evenProb(freq)
    const oProb = oddProb(freq)
    const evenZ = zScoreOf(eProb, 0.5, total)
    const oddZ = zScoreOf(oProb, 0.5, total)

    if (evenZ >= Z_SIGNIFICANCE_THRESHOLD) {
      signals.push({
        contractType: 'DIGITEVEN',
        displayName: 'Even',
        edge: eProb - 0.5,
        winProbability: eProb,
        zScore: evenZ,
        rationale: `Even digits appeared ${(eProb * 100).toFixed(1)}% of the time — a statistically significant deviation from the 50% baseline (z=${evenZ.toFixed(2)}).`,
      })
    }
    if (oddZ >= Z_SIGNIFICANCE_THRESHOLD) {
      signals.push({
        contractType: 'DIGITODD',
        displayName: 'Odd',
        edge: oProb - 0.5,
        winProbability: oProb,
        zScore: oddZ,
        rationale: `Odd digits appeared ${(oProb * 100).toFixed(1)}% of the time — a statistically significant deviation from the 50% baseline (z=${oddZ.toFixed(2)}).`,
      })
    }
  }

  // Rank by statistical significance, not raw win probability — this
  // is what stops a structurally-high-win-rate-but-meaningless
  // threshold (e.g. Over 1) from permanently sitting at #1 across
  // every market.
  signals.sort((a, b) => b.zScore - a.zScore)

  // No fallback signal is injected anymore. If nothing in this
  // market clears the significance bar, it genuinely has no
  // detectable edge right now — showing a fabricated "best" signal
  // for every single market is exactly what was misleading users.
  const bestSignal = signals.length > 0 ? signals[0] : null

  // Overall score reflects statistical confidence first (how unlikely
  // this deviation is to be random noise), blended with the resulting
  // win probability for context. A market with no significant signal
  // scores low instead of being dressed up as a top pick.
  let overallScore = 0
  if (bestSignal) {
    const confidence = Math.min(1, bestSignal.zScore / 3)
    overallScore = Math.min(
      99,
      Math.round(confidence * 70 + bestSignal.winProbability * 100 * 0.3),
    )
  }

  return {
    symbol,
    display_name,
    market,
    submarket,
    lastDigit,
    lastPrice,
    tickCount: total,
    digitCounts: counts,
    digitFreq: freq,
    signals,
    bestSignal,
    overallScore,
  }
}

export function filterVolatilitySymbols(symbols: RawSymbol[]): RawSymbol[] {
  return symbols.filter(
    (s) => s.market === 'synthetic_index' && s.submarket === 'random_index',
  )
}

export async function scanVolatilityMarkets(
  symbols: RawSymbol[],
  ws: ScanWs,
  tickCount: number = TICK_HISTORY_COUNT,
  onProgress?: (done: number, total: number) => void,
): Promise<ScanResult[]> {
  const volSymbols = filterVolatilitySymbols(symbols)
  if (volSymbols.length === 0) return []

  const results: ScanResult[] = []
  const batchSize = 5
  let completed = 0

  for (let i = 0; i < volSymbols.length; i += batchSize) {
    const batch = volSymbols.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(async (s) => {
        try {
          const symbol = s.underlying_symbol || s.symbol || ''
          if (!symbol) return null
          const ticks = await fetchTickHistory(ws, symbol, tickCount)
          if (ticks.length < 30) return null
          return analyzeTicks(
            symbol,
            s.underlying_symbol_name || s.display_name || symbol,
            ticks,
            s.market || '',
            s.submarket || '',
          )
        } catch (fetchErr) {
          console.warn('[Scanner] Failed to fetch ticks for', s.underlying_symbol || s.symbol, fetchErr)
          return null
        }
      }),
    )
    for (const r of batchResults) {
      if (r) results.push(r)
    }
    completed += batch.length
    onProgress?.(completed, volSymbols.length)
  }

  results.sort((a, b) => b.overallScore - a.overallScore)
  return results
}

export interface BotConfig {
  stake: number
  duration: number
  durationUnit: string
  useMartingale: boolean
  martingaleSteps: number
  martingaleMultiplier: number
  stopLoss: number
  takeProfit: number
}

export function buildBotXmlFromSignal(
  result: ScanResult,
  signal: DigitSignal,
  config?: Partial<BotConfig>,
): string {
  const symbol = result.symbol
  const contractType = signal.contractType
  const digit = signal.digit ?? 5
  const market = result.market || 'synthetic_index'
  const submarket = result.submarket || 'random_index'

  const stake = config?.stake ?? 1
  const useMartingale = config?.useMartingale ?? false
  const martingaleMultiplier = config?.martingaleMultiplier ?? 2
  const stopLoss = config?.stopLoss ?? 0
  const takeProfit = config?.takeProfit ?? 0

  // Digit contracts are only offered with tick durations on Deriv.
  // Valid range is 1–10 ticks.
  const rawDuration = config?.duration ?? 1
  const duration = Math.max(1, Math.min(10, Math.floor(rawDuration)))
  const durationUnit = 't'

  let tradeType = 'matchesdiffers'
  if (contractType === 'DIGITOVER' || contractType === 'DIGITUNDER') tradeType = 'overunder'
  else if (contractType === 'DIGITEVEN' || contractType === 'DIGITODD') tradeType = 'evenodd'

  // Even/Odd don't use a prediction digit.
  const needsPrediction =
    contractType === 'DIGITDIFF' ||
    contractType === 'DIGITOVER' ||
    contractType === 'DIGITUNDER'

  const afterBlocks: string[] = []

  if (useMartingale) {
    afterBlocks.push(
      `      <block type="controls_if">
        <value name="IF0">
          <block type="logic_compare">
            <field name="OP">EQ</field>
            <value name="A"><block type="contract_check_result"><field name="CHECK_RESULT">lose</field></block></value>
            <value name="B"><block type="logic_boolean"><field name="BOOL">TRUE</field></block></value>
          </block>
        </value>
        <statement name="DO0">
          <block type="set_stake">
            <value name="STAKE">
              <block type="math_arithmetic">
                <field name="OP">MULTIPLY</field>
                <value name="A"><block type="get_stake"></block></value>
                <value name="B"><shadow type="math_number"><field name="NUM">${martingaleMultiplier}</field></shadow></value>
              </block>
            </value>
          </block>
        </statement>
      </block>`,
    )
    afterBlocks.push(
      `      <block type="controls_if">
        <value name="IF0">
          <block type="logic_compare">
            <field name="OP">EQ</field>
            <value name="A"><block type="contract_check_result"><field name="CHECK_RESULT">win</field></block></value>
            <value name="B"><block type="logic_boolean"><field name="BOOL">TRUE</field></block></value>
          </block>
        </value>
        <statement name="DO0">
          <block type="set_stake">
            <value name="STAKE"><shadow type="math_number"><field name="NUM">${stake}</field></shadow></value>
          </block>
        </statement>
      </block>`,
    )
  }

  // Build a condition that is true only when neither stop-loss nor
  // take-profit has been reached. trade_again is placed inside DO0
  // so it only runs (looping the bot) when we should keep trading.
  // If either threshold is hit, trade_again is skipped and the code
  // falls through to the break; at the end of the while loop, stopping the bot.
  if (stopLoss > 0 || takeProfit > 0) {
    const stopLossXml = stopLoss > 0
      ? `<block type="logic_compare">
            <field name="OP">LTE</field>
            <value name="A"><block type="total_profit"></block></value>
            <value name="B"><shadow type="math_number"><field name="NUM">-${stopLoss}</field></shadow></value>
          </block>`
      : ''

    const takeProfitXml = takeProfit > 0
      ? `<block type="logic_compare">
            <field name="OP">GTE</field>
            <value name="A"><block type="total_profit"></block></value>
            <value name="B"><shadow type="math_number"><field name="NUM">${takeProfit}</field></shadow></value>
          </block>`
      : ''

    let conditionXml: string

    if (stopLoss > 0 && takeProfit > 0) {
      conditionXml = `<block type="logic_negate">
        <value name="BOOL">
          <block type="logic_operation">
            <field name="OP">OR</field>
            <value name="A">${stopLossXml}</value>
            <value name="B">${takeProfitXml}</value>
          </block>
        </value>
      </block>`
    } else {
      const inner = stopLoss > 0 ? stopLossXml : takeProfitXml
      conditionXml = `<block type="logic_negate">
        <value name="BOOL">${inner}</value>
      </block>`
    }

    afterBlocks.push(
      `      <block type="controls_if">
        <value name="IF0">${conditionXml}</value>
        <statement name="DO0">
          <block type="trade_again"></block>
        </statement>
      </block>`,
    )
  } else {
    afterBlocks.push(`      <block type="trade_again"></block>`)
  }

  let afterXml = afterBlocks[afterBlocks.length - 1]
  for (let i = afterBlocks.length - 2; i >= 0; i--) {
    afterXml = afterBlocks[i].replace(
      /<\/block>\s*$/,
      `\n        <next>\n${afterXml}\n        </next>\n      </block>`,
    )
  }

  return `<xml xmlns="https://developers.google.com/blockly/xml" collection="false" is_dbot="true">
  <block type="trade_definition" x="0" y="0">
    <statement name="TRADE_OPTIONS">
      <block type="trade_definition_market" deletable="false" movable="false">
        <field name="MARKET_LIST">${market}</field>
        <field name="SUBMARKET_LIST">${submarket}</field>
        <field name="SYMBOL_LIST">${symbol}</field>
        <next>
          <block type="trade_definition_tradetype" deletable="false" movable="false">
            <field name="TRADETYPECAT_LIST">digits</field>
            <field name="TRADETYPE_LIST">${tradeType}</field>
            <next>
              <block type="trade_definition_contracttype" deletable="false" movable="false">
                <field name="TYPE_LIST">${contractType}</field>
                <next>
                  <block type="trade_definition_candleinterval" deletable="false" movable="false">
                    <field name="CANDLEINTERVAL_LIST">60</field>
                    <next>
                      <block type="trade_definition_restartbuysell" deletable="false" movable="false">
                        <field name="TIME_MACHINE_ENABLED">false</field>
                        <next>
                          <block type="trade_definition_restartonerror" deletable="false" movable="false">
                            <field name="RESTARTONERROR">true</field>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
    <statement name="SUBMARKET">
      <block type="trade_definition_tradeoptions">
        <mutation has_prediction="${needsPrediction}" has_first_barrier="false" has_second_barrier="false"></mutation>
        <field name="DURATIONTYPE_LIST">${durationUnit}</field>
        <field name="CURRENCY_LIST">USD</field>
        <value name="DURATION"><shadow type="math_number"><field name="NUM">${duration}</field></shadow></value>
        <value name="AMOUNT"><shadow type="math_number"><field name="NUM">${stake}</field></shadow></value>
        ${needsPrediction ? `<value name="PREDICTION"><shadow type="math_number"><field name="NUM">${digit}</field></shadow></value>` : ''}
      </block>
    </statement>
  </block>
  <block type="during_purchase" x="720" y="0">
    <statement name="DURING_PURCHASE_STACK">
      <block type="controls_if"><value name="IF0"><block type="check_sell"></block></value></block>
    </statement>
  </block>
  <block type="after_purchase" x="720" y="248">
    <statement name="AFTERPURCHASE_STACK">
${afterXml}
    </statement>
  </block>
  <block type="before_purchase" x="0" y="576">
    <statement name="BEFOREPURCHASE_STACK">
      <block type="purchase"><field name="PURCHASE_LIST">${contractType}</field></block>
    </statement>
  </block>
</xml>`
}

export interface ScanRecommendation {
  symbol: string
  display_name: string
  contractType: DigitContractType
  digit?: number
  displayName: string
}
