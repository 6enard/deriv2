import { useCallback, useEffect, useRef, useState } from 'react'
import { DerivWS } from '../lib/deriv-ws'
import { PUBLIC_WS_URL } from '../lib/config'
import { scanVolatilityMarkets, type ScanResult, type RawSymbol } from '../lib/scanner'

export function useScanner() {
  const [results, setResults] = useState<ScanResult[]>([])
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [hasScanned, setHasScanned] = useState(false)
  const [tickCount, setTickCount] = useState(500)
  const wsRef = useRef<DerivWS | null>(null)

  const runScan = useCallback(async (count?: number) => {
    const ticksToFetch = count ?? tickCount
    setScanning(true)
    setError(null)
    setProgress(0)
    setResults([])
    try {
      const ws = new DerivWS(PUBLIC_WS_URL)
      wsRef.current = ws
      await ws.connect()

      const symbolsRes = await ws.send({ active_symbols: 'brief' })
      if (symbolsRes?.error) {
        throw new Error(symbolsRes.error.message || 'Failed to load markets')
      }
      const symbols: RawSymbol[] = (symbolsRes.active_symbols || []) as RawSymbol[]
      if (symbols.length === 0) {
        throw new Error('No markets available.')
      }

      const volSymbols = symbols.filter((s) => {
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

      console.log('[Scanner] Found', volSymbols.length, 'volatility symbols out of', symbols.length, 'total')
      if (volSymbols.length > 0) {
        console.log('[Scanner] First few vol symbols:', volSymbols.slice(0, 5).map(s => ({
          symbol: s.underlying_symbol || s.symbol,
          name: s.underlying_symbol_name || s.display_name,
          market: s.market,
          submarket: s.submarket,
        })))
      }

      if (volSymbols.length === 0) {
        throw new Error('No volatility markets found among available symbols.')
      }

      // Test tick history on the first symbol to see if this endpoint supports it
      const testSymbol = volSymbols[0]
      const testSym = testSymbol.underlying_symbol || testSymbol.symbol || ''
      console.log('[Scanner] Testing tick_history on symbol:', testSym)
      try {
        const testRes = await ws.send({
          ticks_history: testSym,
          end: 'latest',
          count: 10,
          style: 'ticks',
        })
        console.log('[Scanner] Test tick_history response:', {
          hasPrices: Array.isArray(testRes?.prices),
          pricesLength: testRes?.prices?.length,
          hasError: !!testRes?.error,
          errorMsg: testRes?.error?.message,
          keys: testRes ? Object.keys(testRes) : [],
        })
      } catch (testErr) {
        console.error('[Scanner] Test tick_history failed:', testErr)
      }

      const scanResults = await scanVolatilityMarkets(
        volSymbols,
        { send: (req) => ws.send(req) },
        ticksToFetch,
        (done, total) => setProgress(Math.round((done / total) * 100)),
      )

      ws.disconnect()
      wsRef.current = null

      if (scanResults.length === 0) {
        throw new Error('Unable to fetch tick data for any volatility market. Please try again.')
      }

      setResults(scanResults)
      setHasScanned(true)
    } catch (err) {
      if (wsRef.current) {
        wsRef.current.disconnect()
        wsRef.current = null
      }
      console.error('[Scanner] Scan failed:', err)
      setError(err instanceof Error ? err.message : 'Scan failed. Please try again.')
    } finally {
      setScanning(false)
    }
  }, [tickCount])

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect()
        wsRef.current = null
      }
    }
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
    setHasScanned(false)
    setError(null)
  }, [])

  return { results, scanning, progress, error, hasScanned, runScan, clearResults, tickCount, setTickCount }
}
