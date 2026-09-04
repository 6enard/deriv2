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

      if (volSymbols.length === 0) {
        throw new Error('No volatility markets found among available symbols.')
      }

      const scanResults = await scanVolatilityMarkets(
        volSymbols,
        { send: (req) => ws.send(req) },
        ticksToFetch,
        (done, total) => setProgress(Math.round((done / total) * 100)),
      )

      ws.disconnect()
      wsRef.current = null

      setResults(scanResults)
      setHasScanned(true)
    } catch (err) {
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
