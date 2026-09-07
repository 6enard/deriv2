type PendingRequest = {
  resolve: (data: any) => void
  reject: (error: any) => void
  subscribeCallbacks?: Set<(data: any) => void>
  joiners?: Array<{
    resolve: (result: { reqId: number; data: any }) => void
    reject: (error: any) => void
  }>
  resolved?: boolean
  timer?: ReturnType<typeof setTimeout>
  subscriptionId?: string
  key?: string | null
}

const REQUEST_TIMEOUT_MS = 15000
const SUBSCRIPTION_TIMEOUT_MS = 10000
const RECONNECT_DELAY_MS = 2000
const MAX_RECONNECT_DELAY_MS = 30000

export class DerivWS {
  private ws: WebSocket | null = null
  private reqId = 1
  private pending = new Map<number, PendingRequest>()
  private url: string
  private listeners: ((status: string) => void)[] = []
  private shouldReconnect = false
  private reconnectAttempts = 0
  private connectPromise: Promise<void> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null

  /*
   * Deriv's API only allows one active `ticks` subscription per symbol,
   * and one `proposal_open_contract` subscription per contract, on a
   * given connection — a second subscribe for the same symbol/contract
   * is rejected with an "AlreadySubscribed" error. Several independent
   * parts of the app (the price chart, a running bot, the open-positions
   * panel) can legitimately want the same stream at the same time, so
   * subscriptions for these request types are shared: the first caller
   * opens the real subscription, later callers for the same key are
   * just added as extra listeners on it instead of sending a duplicate
   * request over the wire.
   */
  private sharedKeyToReqId = new Map<string, number>()
  private subIdToKey = new Map<string, string>()
  private subIdRefCount = new Map<string, number>()

  constructor(url: string) {
    this.url = url
  }

  onStatusChange(cb: (status: string) => void): () => void {
    this.listeners.push(cb)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb)
    }
  }

  private setStatus(status: string): void {
    this.listeners.forEach((l) => l(status))
  }

  connect(): Promise<void> {
    this.shouldReconnect = true
    if (this.connectPromise) return this.connectPromise
    this.connectPromise = this.doConnect()
    return this.connectPromise
  }

  private doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)
      } catch (err) {
        this.connectPromise = null
        reject(err)
        return
      }
      this.setStatus('connecting')

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        this.setStatus('connected')
        this.connectPromise = null
        this.startHeartbeat()
        resolve()
      }

      this.ws.onerror = () => {
        this.setStatus('error')
        if (this.reconnectAttempts === 0) {
          this.connectPromise = null
          reject(new Error('WebSocket connection failed'))
        }
      }

      this.ws.onclose = () => {
        this.stopHeartbeat()
        this.setStatus('disconnected')
        this.failAllPending(new Error('Connection closed'))
        this.connectPromise = null
        this.ws = null
        if (this.shouldReconnect) {
          this.scheduleReconnect()
        }
      }

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event)
      }
    })
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    this.setStatus('reconnecting')

    // Exponential backoff capped at MAX_RECONNECT_DELAY_MS.
    // The connection should always retry — never give up, so the
    // bot and market data stay alive 24/7 even through extended
    // network outages.
    const delay = Math.min(
      RECONNECT_DELAY_MS * Math.pow(1.5, this.reconnectAttempts - 1),
      MAX_RECONNECT_DELAY_MS,
    )

    setTimeout(() => {
      if (!this.shouldReconnect) return
      this.doConnect().catch(() => {
        // doConnect already handles re-scheduling on close
      })
    }, delay)
  }

  private failAllPending(error: Error): void {
    this.pending.forEach((req) => {
      if (req.timer) clearTimeout(req.timer)
      req.reject(error)
      if (req.joiners?.length) {
        req.joiners.forEach((joiner) => joiner.reject(error))
      }
    })
    this.pending.clear()
    this.sharedKeyToReqId.clear()
    this.subIdToKey.clear()
    this.subIdRefCount.clear()
  }

  private static subscriptionKey(request: Record<string, unknown>): string | null {
    if (typeof request.ticks === 'string') {
      return `ticks:${request.ticks}`
    }
    if (
      request.proposal_open_contract &&
      request.contract_id !== undefined &&
      request.contract_id !== null
    ) {
      return `poc:${String(request.contract_id)}`
    }
    return null
  }

  private handleMessage(event: MessageEvent): void {
    let data: any
    try {
      data = JSON.parse(event.data)
    } catch {
      return
    }
    const reqId = data.req_id

    if (reqId && this.pending.has(reqId)) {
      const req = this.pending.get(reqId)!

      if (data.error) {
        if (req.timer) clearTimeout(req.timer)
        req.reject(data.error)
        if (req.joiners?.length) {
          const joiners = req.joiners
          req.joiners = []
          joiners.forEach((joiner) => joiner.reject(data.error))
        }
        if (!data.subscription) {
          this.pending.delete(reqId)
          if (req.key) this.sharedKeyToReqId.delete(req.key)
        }
        return
      }

      if (data.subscription && req.subscribeCallbacks) {
        const isFirstAck = !req.subscriptionId

        if (isFirstAck) {
          req.subscriptionId = data.subscription.id
          if (req.key) {
            this.subIdToKey.set(data.subscription.id, req.key)
            this.subIdRefCount.set(
              data.subscription.id,
              req.subscribeCallbacks.size,
            )
          }
        }

        req.subscribeCallbacks.forEach((cb) => cb(data))

        if (!req.resolved) {
          req.resolved = true
          if (req.timer) clearTimeout(req.timer)
          req.resolve(data)
        }

        if (isFirstAck && req.joiners?.length) {
          const joiners = req.joiners
          req.joiners = []
          joiners.forEach((joiner) =>
            joiner.resolve({ reqId, data }),
          )
        }
        return
      }

      if (req.timer) clearTimeout(req.timer)
      req.resolve(data)
      if (!data.subscription) this.pending.delete(reqId)
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return
    if (this.connectPromise) {
      try {
        await this.connectPromise
      } catch {
        // connectPromise rejected — fall through to reconnect
      }
      if (this.ws && this.ws.readyState === WebSocket.OPEN) return
    }
    if (!this.shouldReconnect) {
      this.shouldReconnect = true
    }
    await this.connect()
  }

  async send(request: Record<string, unknown>): Promise<any> {
    await this.ensureConnected()
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }
    const id = this.reqId++
    const msg = JSON.stringify({ ...request, req_id: id })
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error('Request timed out'))
      }, REQUEST_TIMEOUT_MS)
      this.pending.set(id, { resolve, reject, timer })
      this.ws!.send(msg)
    })
  }

  /*
   * Sends a request and automatically retries on rate-limit errors
   * with exponential backoff. Use this for non-subscription requests
   * that are prone to hitting Deriv's per-minute rate limits
   * (profit_table, statement, etc.).
   */
  async sendWithRetry(
    request: Record<string, unknown>,
    maxRetries = 6,
  ): Promise<any> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const res = await this.send(request)
      if (res?.error) {
        const msg = String(res.error.message || '')
        const isRateLimit = /rate.?limit|too many|RateLimit/i.test(msg)
        if (isRateLimit && attempt < maxRetries) {
          const delay = Math.min(3000 * Math.pow(1.5, attempt), 30000)
          await new Promise((r) => setTimeout(r, delay))
          continue
        }
      }
      return res
    }
    return { error: { message: 'Rate limit exceeded' } }
  }

  async subscribe(
    request: Record<string, unknown>,
    callback: (data: any) => void,
  ): Promise<{ reqId: number; data: any }> {
    await this.ensureConnected()
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    const key = DerivWS.subscriptionKey(request)

    if (key) {
      const existingReqId = this.sharedKeyToReqId.get(key)
      if (existingReqId !== undefined) {
        const existing = this.pending.get(existingReqId)
        if (existing && existing.subscribeCallbacks) {
          existing.subscribeCallbacks.add(callback)

          if (existing.subscriptionId) {
            // The real subscription is already live — join it and
            // bump the ref count immediately.
            this.subIdRefCount.set(
              existing.subscriptionId,
              (this.subIdRefCount.get(existing.subscriptionId) || 0) + 1,
            )
            return {
              reqId: existingReqId,
              data: {
                subscription: { id: existing.subscriptionId },
                echo_req: request,
              },
            }
          }

          // The first subscribe for this key is still in flight —
          // wait for its ack so we get a real subscription id back
          // (handleMessage sizes the initial ref count off the
          // callback set, so no separate bump is needed here).
          return new Promise((resolve, reject) => {
            existing.joiners = existing.joiners || []
            existing.joiners.push({ resolve, reject })
          })
        }
        // Stale bookkeeping (subscription already gone) — fall
        // through and open a fresh one.
        this.sharedKeyToReqId.delete(key)
      }
    }

    return this.sendSubscribe(request, callback, key, 0)
  }

  /*
   * Deriv only allows one active subscription per symbol/contract per
   * connection. If a previous bot's cleanup `forget` failed silently,
   * the server still holds a stale subscription and rejects new
   * subscribe requests with "AlreadySubscribed" — causing the bot to
   * hang forever on the tick stream step without ever trading.
   *
   * This method detects that error, sends `forget_all` to clear any
   * orphaned server-side subscriptions, then retries.
   */
  private async sendSubscribe(
    request: Record<string, unknown>,
    callback: (data: any) => void,
    key: string | null,
    attempt: number,
  ): Promise<{ reqId: number; data: any }> {
    await this.ensureConnected()
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    const id = this.reqId++
    const msg = JSON.stringify({ ...request, req_id: id, subscribe: 1 })

    try {
      return await new Promise<{ reqId: number; data: any }>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending.delete(id)
          if (key) this.sharedKeyToReqId.delete(key)
          reject(new Error('Subscription request timed out'))
        }, SUBSCRIPTION_TIMEOUT_MS)
        this.pending.set(id, {
          resolve: (data: any) => resolve({ reqId: id, data }),
          reject,
          subscribeCallbacks: new Set([callback]),
          timer,
          key,
        })
        if (key) this.sharedKeyToReqId.set(key, id)
        this.ws!.send(msg)
      })
    } catch (error: any) {
      const errMsg = String(error?.message || error || '')
      const isAlreadySubscribed = /already.?subscribed/i.test(errMsg)
      const isTimeout = /timed out/i.test(errMsg)

      if ((isAlreadySubscribed || isTimeout) && attempt < 3) {
        if (isAlreadySubscribed) {
          let forgetType = ''
          if (typeof request.ticks === 'string') forgetType = 'ticks'
          else if (request.proposal_open_contract) forgetType = 'proposal_open_contract'

          if (forgetType) {
            try { await this.send({ forget_all: forgetType }) } catch { /* retry anyway */ }
          }
        }
        if (key) this.sharedKeyToReqId.delete(key)
        await new Promise((r) => setTimeout(r, isTimeout ? 500 : 300))
        return this.sendSubscribe(request, callback, key, attempt + 1)
      }

      throw error
    }
  }

  forget(id: string): Promise<any> {
    const key = this.subIdToKey.get(id)

    if (key) {
      const refCount = this.subIdRefCount.get(id) || 0

      if (refCount > 1) {
        // Other consumers (chart, bot, open-positions panel, ...) are
        // still using this shared stream — just drop our claim on it
        // instead of telling the server to cancel it outright.
        this.subIdRefCount.set(id, refCount - 1)
        return Promise.resolve({ forget: id, shared: true })
      }

      this.subIdRefCount.delete(id)
      this.subIdToKey.delete(id)
      const reqId = this.sharedKeyToReqId.get(key)
      if (reqId !== undefined) {
        this.sharedKeyToReqId.delete(key)
        const req = this.pending.get(reqId)
        if (req?.timer) clearTimeout(req.timer)
        this.pending.delete(reqId)
      }
    }

    return this.send({ forget: id })
  }

  forgetAll(type: string): Promise<any> {
    return this.send({ forget_all: type })
  }

  // Remove a subscription from the pending map and tell the server to stop
  // sending updates. Prevents subscription leaks that stall the bot after a
  // few trades — each settled contract's subscription must be cleaned up.
  unsubscribe(reqId: number): void {
    const req = this.pending.get(reqId)
    if (!req) return
    if (req.subscriptionId) {
      this.forget(req.subscriptionId).catch(() => {})
    } else {
      if (req.timer) clearTimeout(req.timer)
      this.pending.delete(reqId)
      if (req.key) this.sharedKeyToReqId.delete(req.key)
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    // Send a ping every 30 seconds to keep the connection alive
    // through idle periods and detect dead connections faster.
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ ping: 1 }))
        } catch {
          // If sending fails, the onclose handler will trigger reconnect
        }
      }
    }, 30000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  disconnect(): void {
    this.shouldReconnect = false
    this.stopHeartbeat()
    this.ws?.close()
    this.ws = null
    this.failAllPending(new Error('Connection closed'))
    this.connectPromise = null
    this.setStatus('disconnected')
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}