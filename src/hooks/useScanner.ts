import { useCallback, useEffect, useRef, useState } from 'react'
import { DerivWS } from '../lib/deriv-ws'
import { PUBLIC_WS_URL, DERIV_WS_URL } from '../lib/config'
import { scanVolatilityMarkets, type ScanResult, type RawSymbol } from '../lib/scanner'

export function useScanner() {
  const [results, setResults] = useState<ScanResult[]>([])
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [hasScanned, setHasScanned] = useState(false)
  const [tickCount, setTickCount] = useState(500)
  const wsRef = useRef<DerivWS | null>(null)
  const ticksWsRef = useRef<DerivWS | null>(null)

  const runScan = useCallback(async (count?: number) => {
    const ticksToFetch = count ?? tickCount
    setScanning(true)
    setError(null)
    setProgress(0)
    setResults([])
    try {
      // Step 1: Fetch active symbols from the public options WS (proven to work)
      const symbolsWs = new DerivWS(PUBLIC_WS_URL)
      wsRef.current = symbolsWs
      await symbolsWs.connect()

      const symbolsRes = await symbolsWs.send({ active_symbols: 'brief' })
      if (symbolsRes?.error) {
        throw new Error(symbolsRes.error.message || 'Failed to load markets')
      }
      const symbols: RawSymbol[] = (symbolsRes.active_symbols || []) as RawSymbol[]
      if (symbols.length === 0) {
        throw new Error('No markets available.')
      }

      // Step 2: Filter volatility symbols
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

      if (volSymbols.length === 0) {
        throw new Error('No volatility markets found among available symbols.')
      }

      // Step 3: Connect to the standard Deriv API for tick history
      // The public options WS supports active_symbols but NOT ticks_history
      const ticksWs = new DerivWS(DERIV_WS_URL)
      ticksWsRef.current = ticksWs
      await ticksWs.connect()

      const scanResults = await scanVolatilityMarkets(
        volSymbols,
        { send: (req) => ticksWs.send(req) },
        ticksToFetch,
        (done, total) => setProgress(Math.round((done / total) * 100)),
      )

      // Cleanup both connections
      symbolsWs.disconnect()
      wsRef.current = null
      ticksWs.disconnect()
      ticksWsRef.current = null

      if (scanResults.length === 0) {
        throw new Error('Unable to fetch tick data for any volatility market. Please try again.')
      }

      setResults(scanResults)
      setHasScanned(true)
    } catch (err) {
      // Clean up connections on error
      if (wsRef.current) {
        wsRef.current.disconnect()
        wsRef.current = null
      }
      if (ticksWsRef.current) {
        ticksWsRef.current.disconnect()
        ticksWsRef.current = null
      }
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
      if (ticksWsRef.current) {
        ticksWsRef.current.disconnect()
        ticksWsRef.current = null
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
