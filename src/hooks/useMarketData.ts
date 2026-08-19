import { useCallback, useEffect, useRef, useState } from 'react'
import { DerivWS } from '../lib/deriv-ws'
import { PUBLIC_WS_URL } from '../lib/config'

let sharedWs: DerivWS | null = null
let sharedPromise: Promise<DerivWS> | null = null
let refCount = 0

function getPublicWs(): Promise<DerivWS> {
  if (sharedWs && sharedWs.isConnected) return Promise.resolve(sharedWs)
  if (sharedPromise) return sharedPromise

  sharedWs = new DerivWS(PUBLIC_WS_URL)
  sharedPromise = sharedWs.connect().then(() => sharedWs!).catch((err) => {
    sharedPromise = null
    throw err
  })
  return sharedPromise
}

function releasePublicWs() {
  refCount--
  if (refCount <= 0 && sharedWs) {
    sharedWs.disconnect()
    sharedWs = null
    sharedPromise = null
    refCount = 0
  }
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

export function useMarketData() {
  const [symbols, setSymbols] = useState<RawSymbol[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedRef = useRef(false)

  const fetchSymbols = useCallback(async (): Promise<RawSymbol[] | null> => {
    setLoading(true)
    setError(null)
    try {
      const ws = await getPublicWs()
      const res = await ws.send({ active_symbols: 'brief' })
      if (res.active_symbols && Array.isArray(res.active_symbols)) {
        setSymbols(res.active_symbols)
        loadedRef.current = true
        return res.active_symbols as RawSymbol[]
      }
      if (res.error) {
        setError(res.error.message || 'Failed to load markets')
      } else {
        setError('No symbols returned')
      }
      return null
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to market data'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refCount++
    return () => {
      releasePublicWs()
    }
  }, [])

  return { symbols, loading, error, fetchSymbols, loaded: loadedRef.current }
}
