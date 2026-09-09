import { useCallback, useState } from 'react'
import { acquirePublicWs, releasePublicWs } from '../lib/publicWs'

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

export function useMarketData() {
  const [symbols, setSymbols] = useState<RawSymbol[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const fetchSymbols = useCallback(async (): Promise<RawSymbol[] | null> => {
    setLoading(true)
    setError(null)
    try {
      const ws = await acquirePublicWs()
      try {
        const res = await ws.send({ active_symbols: 'brief' })
        if (res.active_symbols && Array.isArray(res.active_symbols)) {
          setSymbols(res.active_symbols)
          setLoaded(true)
          return res.active_symbols as RawSymbol[]
        }
        if (res.error) {
          setError(res.error.message || 'Failed to load markets')
        } else {
          setError('No symbols returned')
        }
        return null
      } finally {
        releasePublicWs()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to market data'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { symbols, loading, error, fetchSymbols, loaded }
}
