import { useCallback, useRef, useState } from 'react'
import { DerivWS } from '../lib/deriv-ws'
import { PUBLIC_WS_URL } from '../lib/config'
import { useMarketData } from './useMarketData'
import { scanVolatilityMarkets, type ScanResult } from '../lib/scanner'

export function useScanner() {
  const { symbols, fetchSymbols } = useMarketData()
  const [results, setResults] = useState<ScanResult[]>([])
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasScanned, setHasScanned] = useState(false)
  const wsRef = useRef<DerivWS | null>(null)

  const runScan = useCallback(async () => {
    setScanning(true)
    setError(null)
    try {
      let syms = symbols
      if (syms.length === 0) {
        const fetched = await fetchSymbols()
        if (!fetched || fetched.length === 0) {
          setError('Unable to load market data. Please try again.')
          setScanning(false)
          return
        }
        syms = fetched
      }

      const ws = new DerivWS(PUBLIC_WS_URL)
      wsRef.current = ws
      await ws.connect()

      const scanResults = await scanVolatilityMarkets(syms, {
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
  }, [symbols, fetchSymbols])

  const clearResults = useCallback(() => {
    setResults([])
    setHasScanned(false)
    setError(null)
  }, [])

  return { results, scanning, error, hasScanned, runScan, clearResults }
}
