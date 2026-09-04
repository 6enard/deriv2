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

  let mostFreqDigit = 0
  for (let i = 1; i < 10; i++) {
    if (counts[i] > counts[mostFreqDigit]) mostFreqDigit = i
  }

  // Differs: always include — covers 90% of outcomes by definition
  const differsWinProb = 1 - freq[mostFreqDigit]
  signals.push({
    contractType: 'DIGITDIFF',
    displayName: `Differs ${mostFreqDigit}`,
    digit: mostFreqDigit,
    edge: Math.max(freq[mostFreqDigit] - 0.1, 0),
    winProbability: differsWinProb,
    rationale: `Digit ${mostFreqDigit} appeared ${(freq[mostFreqDigit] * 100).toFixed(1)}% of the time. Differs wins ${(differsWinProb * 100).toFixed(1)}% of the time historically.`,
  })

  // Over / Under — best thresholds
  let bestOverDigit = 4
  let bestOverEdge = -Infinity
  let bestUnderDigit = 5
  let bestUnderEdge = -Infinity

  for (let d = 1; d <= 8; d++) {
    const op = overProb(freq, d)
    const oe = op - (9 - d) / 10
    if (oe > bestOverEdge) { bestOverEdge = oe; bestOverDigit = d }
    const up = underProb(freq, d)
    const ue = up - d / 10
    if (ue > bestUnderEdge) { bestUnderEdge = ue; bestUnderDigit = d }
  }

  if (bestOverEdge > 0) {
    const op = overProb(freq, bestOverDigit)
    signals.push({
      contractType: 'DIGITOVER',
      displayName: `Over ${bestOverDigit}`,
      digit: bestOverDigit,
      edge: bestOverEdge,
      winProbability: op,
      rationale: `Digits above ${bestOverDigit} occurred ${(op * 100).toFixed(1)}% of the time — ${(bestOverEdge * 100).toFixed(1)}% above expected ${((9 - bestOverDigit) / 10 * 100).toFixed(0)}%.`,
    })
  }

  if (bestUnderEdge > 0) {
    const up = underProb(freq, bestUnderDigit)
    signals.push({
      contractType: 'DIGITUNDER',
      displayName: `Under ${bestUnderDigit}`,
      digit: bestUnderDigit,
      edge: bestUnderEdge,
      winProbability: up,
      rationale: `Digits below ${bestUnderDigit} occurred ${(up * 100).toFixed(1)}% of the time — ${(bestUnderEdge * 100).toFixed(1)}% above expected ${(bestUnderDigit / 10 * 100).toFixed(0)}%.`,
    })
  }

  // Even / Odd
  const eProb = evenProb(freq)
  const oProb = oddProb(freq)
  const evenEdge = eProb - 0.5
  const oddEdge = oProb - 0.5

  if (evenEdge > 0) {
    signals.push({
      contractType: 'DIGITEVEN',
      displayName: 'Even',
      edge: evenEdge,
      winProbability: eProb,
      rationale: `Even digits appeared ${(eProb * 100).toFixed(1)}% of the time — ${(evenEdge * 100).toFixed(1)}% above the 50% baseline.`,
    })
  }
  if (oddEdge > 0) {
    signals.push({
      contractType: 'DIGITODD',
      displayName: 'Odd',
      edge: oddEdge,
      winProbability: oProb,
      rationale: `Odd digits appeared ${(oProb * 100).toFixed(1)}% of the time — ${(oddEdge * 100).toFixed(1)}% above the 50% baseline.`,
    })
  }

  signals.sort((a, b) => b.edge - a.edge)

  // Always ensure at least one signal — if none met threshold, add a
  // Differs fallback on the most frequent digit (90% coverage by definition)
  if (signals.length === 0) {
    signals.push({
      contractType: 'DIGITDIFF',
      displayName: `Differs ${mostFreqDigit}`,
      digit: mostFreqDigit,
      edge: 0,
      winProbability: 1 - freq[mostFreqDigit],
      rationale: `Digit ${mostFreqDigit} appeared ${(freq[mostFreqDigit] * 100).toFixed(1)}% of the time. Differs covers the remaining ${(100 - freq[mostFreqDigit] * 100).toFixed(1)}% of outcomes.`,
    })
  }

  const bestSignal = signals.length > 0 ? signals[0] : null

  // Win Probability Score: the overall score now represents how likely
  // the best signal would have won based on historical tick data.
  // 100 = highest chance of winning, 0 = lowest.
  // We blend the raw historical win rate with a small statistical
  // confidence boost from sample size, capped at 99% since no strategy
  // is truly guaranteed.
  const baseWinProb = bestSignal ? bestSignal.winProbability : 0
  const sampleConfidence = Math.min(total / 500, 1) * 0.05
  const overallScore = Math.min(99, Math.round((baseWinProb + sampleConfidence) * 100))

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
