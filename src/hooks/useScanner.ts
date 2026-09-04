import { useCallback, useEffect, useRef, useState } from 'react'
import { DerivWS } from '../lib/deriv-ws'
import { DERIV_WS_URL } from '../lib/config'
import { scanVolatilityMarkets, type ScanResult, type RawSymbol } from '../lib/scanner'

export function useScanner() {
  const [results, setResults] = useState<ScanResult[]>([])
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasScanned, setHasScanned] = useState(false)
  const wsRef = useRef<DerivWS | null>(null)

  const runScan = useCallback(async () => {
    setScanning(true)
    setError(null)
    try {
      // Use the standard Deriv API directly — the custom options WS
      // endpoint doesn't support active_symbols or ticks_history.
      const ws = new DerivWS(DERIV_WS_URL)
      wsRef.current = ws
      await ws.connect()

      // Fetch active symbols from the standard API
      const symbolsRes = await ws.send({ active_symbols: 'brief' })
      if (symbolsRes?.error) {
        throw new Error(symbolsRes.error.message || 'Failed to load markets')
      }
      const symbols: RawSymbol[] = (symbolsRes.active_symbols || []) as RawSymbol[]
      if (symbols.length === 0) {
        throw new Error('No markets available.')
      }

      const scanResults = await scanVolatilityMarkets(symbols, {
        send: (req) => ws.send(req),
      })

      ws.disconnect()
      wsRef.current = null

      setResults(scanResults)
      setHasScanned(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed. Please try again.')
    } finally {
      setScanning(false)
    }
  }, [])

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

  return { results, scanning, error, hasScanned, runScan, clearResults }
}
