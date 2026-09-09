import { DerivWS } from './deriv-ws'
import { PUBLIC_WS_URL } from './config'

/*
 * Every consumer that only needs public (no-auth) market data —
 * the symbol list, contracts_for, the scanner, the manual trader's
 * duration limits — used to open its own brand-new DerivWS
 * connection and tear it down again afterwards. Each of those is a
 * full TCP + TLS + WebSocket handshake, which on a slow or distant
 * connection can easily cost several hundred milliseconds to over
 * a second, and several of these were happening back-to-back (or
 * even concurrently) on a single page load or symbol switch. That
 * round-trip stacking is what shows up to users as markets/prices
 * "not loading immediately".
 *
 * This module keeps one shared public connection alive for as long
 * as anything needs it (ref-counted), so after the first connect
 * every subsequent public request is just a message over an
 * already-open socket.
 */

let sharedWs: DerivWS | null = null
let sharedPromise: Promise<DerivWS> | null = null
let refCount = 0

export function acquirePublicWs(): Promise<DerivWS> {
  refCount++
  if (sharedWs && sharedWs.isConnected) return Promise.resolve(sharedWs)
  if (sharedPromise) return sharedPromise

  sharedWs = new DerivWS(PUBLIC_WS_URL)
  sharedPromise = sharedWs.connect().then(() => sharedWs!).catch((err) => {
    sharedPromise = null
    throw err
  })
  return sharedPromise
}

export function releasePublicWs(): void {
  refCount--
  if (refCount <= 0 && sharedWs) {
    sharedWs.disconnect()
    sharedWs = null
    sharedPromise = null
    refCount = 0
  }
}

/*
 * Convenience for one-off public requests (contracts_for, a single
 * active_symbols lookup, ...): acquires the shared connection, does
 * the request, then releases its claim. If nothing else is holding
 * the connection open, releasing tears it down; if the symbol list
 * or another component already has it open, this just piggybacks
 * on the existing socket with no extra handshake at all.
 */
export async function sendPublic(request: Record<string, unknown>): Promise<any> {
  const ws = await acquirePublicWs()
  try {
    return await ws.send(request)
  } finally {
    releasePublicWs()
  }
}
