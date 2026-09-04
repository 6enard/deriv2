export type DigitContractType =
  | 'DIGITMATCH'
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
}

export interface ScanResult {
  symbol: string
  display_name: string
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

function chiSquared(freq: number[]): number {
  const expected = 0.1
  let chi = 0
  for (let i = 0; i < 10; i++) {
    const diff = freq[i] - expected
    chi += (diff * diff) / expected
  }
  return chi
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
  if (!Array.isArray(res?.prices)) return []
  return res.prices.map((p: any) => Number(p)).filter((n: number) => Number.isFinite(n))
}

export function analyzeTicks(
  symbol: string,
  display_name: string,
  tickQuotes: number[],
): ScanResult {
  const { counts, freq, total } = computeDigitStats(tickQuotes)
  const lastPrice = tickQuotes.length > 0 ? tickQuotes[tickQuotes.length - 1] : 0
  const lastDigit = tickQuotes.length > 0 ? lastDigitOf(lastPrice) : 0
  const signals: DigitSignal[] = []
  const chi = chiSquared(freq)

  let mostFreqDigit = 0
  for (let i = 1; i < 10; i++) {
    if (counts[i] > counts[mostFreqDigit]) mostFreqDigit = i
  }

  // Matches: over-represented digit has positive edge
  const matchEdge = freq[mostFreqDigit] - 0.1
  if (matchEdge > 0) {
    signals.push({
      contractType: 'DIGITMATCH',
      displayName: `Matches ${mostFreqDigit}`,
      digit: mostFreqDigit,
      edge: matchEdge,
      rationale: `Digit ${mostFreqDigit} appeared ${(freq[mostFreqDigit] * 100).toFixed(1)}% of the time — ${(matchEdge * 100).toFixed(1)}% above the expected 10% baseline.`,
    })
  }

  // Differs: always include — covers 90% of outcomes by definition
  signals.push({
    contractType: 'DIGITDIFF',
    displayName: `Differs ${mostFreqDigit}`,
    digit: mostFreqDigit,
    edge: Math.max(freq[mostFreqDigit] - 0.1, 0),
    rationale: `Digit ${mostFreqDigit} appeared ${(freq[mostFreqDigit] * 100).toFixed(1)}% of the time. Differs covers the remaining ${(100 - freq[mostFreqDigit] * 100).toFixed(1)}% of outcomes.`,
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
    signals.push({
      contractType: 'DIGITOVER',
      displayName: `Over ${bestOverDigit}`,
      digit: bestOverDigit,
      edge: bestOverEdge,
      rationale: `Digits above ${bestOverDigit} occurred ${(overProb(freq, bestOverDigit) * 100).toFixed(1)}% of the time — ${(bestOverEdge * 100).toFixed(1)}% above expected ${((9 - bestOverDigit) / 10 * 100).toFixed(0)}%.`,
    })
  }

  if (bestUnderEdge > 0) {
    signals.push({
      contractType: 'DIGITUNDER',
      displayName: `Under ${bestUnderDigit}`,
      digit: bestUnderDigit,
      edge: bestUnderEdge,
      rationale: `Digits below ${bestUnderDigit} occurred ${(underProb(freq, bestUnderDigit) * 100).toFixed(1)}% of the time — ${(bestUnderEdge * 100).toFixed(1)}% above expected ${(bestUnderDigit / 10 * 100).toFixed(0)}%.`,
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
      rationale: `Even digits appeared ${(eProb * 100).toFixed(1)}% of the time — ${(evenEdge * 100).toFixed(1)}% above the 50% baseline.`,
    })
  }
  if (oddEdge > 0) {
    signals.push({
      contractType: 'DIGITODD',
      displayName: 'Odd',
      edge: oddEdge,
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
      rationale: `Digit ${mostFreqDigit} appeared ${(freq[mostFreqDigit] * 100).toFixed(1)}% of the time. Differs covers the remaining ${(100 - freq[mostFreqDigit] * 100).toFixed(1)}% of outcomes.`,
    })
  }

  const bestSignal = signals.length > 0 ? signals[0] : null

  const edgeScore = bestSignal ? Math.min(bestSignal.edge * 500, 50) : 0
  const chiScore = Math.min(chi * 3, 50)
  const overallScore = Math.round(edgeScore + chiScore)

  return {
    symbol,
    display_name,
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
  return symbols.filter((s) => {
    const market = s.market || ''
    const submarket = s.submarket || ''
    const name = (s.display_name || s.underlying_symbol_name || '').toLowerCase()
    return (
      market === 'synthetic_index' ||
      submarket === 'random_index' ||
      submarket === 'synthetic_index' ||
      name.includes('volatility') ||
      name.includes('boom') ||
      name.includes('crash') ||
      name.includes('jump') ||
      name.includes('step')
    )
  })
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
          return analyzeTicks(symbol, s.underlying_symbol_name || s.display_name || symbol, ticks)
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

export function buildBotXmlFromSignal(result: ScanResult, signal: DigitSignal): string {
  const symbol = result.symbol
  const contractType = signal.contractType
  const digit = signal.digit ?? 5

  let tradeType = 'matchesdiffers'
  if (contractType === 'DIGITOVER' || contractType === 'DIGITUNDER') tradeType = 'overunder'
  else if (contractType === 'DIGITEVEN' || contractType === 'DIGITODD') tradeType = 'evenodd'

  return `<xml xmlns="https://developers.google.com/blockly/xml" collection="false" is_dbot="true">
  <block type="trade_definition" x="0" y="0">
    <statement name="TRADE_OPTIONS">
      <block type="trade_definition_market" deletable="false" movable="false">
        <field name="MARKET_LIST">synthetic_index</field>
        <field name="SUBMARKET_LIST">random_index</field>
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
        <field name="DURATIONTYPE_LIST">t</field>
        <field name="CURRENCY_LIST">USD</field>
        <value name="DURATION"><shadow type="math_number"><field name="NUM">5</field></shadow></value>
        <value name="AMOUNT"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
        <value name="PREDICTION"><shadow type="math_number"><field name="NUM">${digit}</field></shadow></value>
      </block>
    </statement>
  </block>
  <block type="during_purchase" x="720" y="0">
    <statement name="DURING_PURCHASE_STACK">
      <block type="controls_if"><value name="IF0"><block type="check_sell"></block></value></block>
    </statement>
  </block>
  <block type="after_purchase" x="720" y="248">
    <statement name="AFTERPURCHASE_STACK"><block type="trade_again"></block></statement>
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
