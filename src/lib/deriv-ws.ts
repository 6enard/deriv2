type PendingRequest = {
  resolve: (data: any) => void
  reject: (error: any) => void
  subscribe?: (data: any) => void
  resolved?: boolean
  timer?: ReturnType<typeof setTimeout>
}

const REQUEST_TIMEOUT_MS = 15000
const RECONNECT_DELAY_MS = 2000
const MAX_RECONNECT_ATTEMPTS = 5

export class DerivWS {
  private ws: WebSocket | null = null
  private reqId = 1
  private pending = new Map<number, PendingRequest>()
  private url: string
  private listeners: ((status: string) => void)[] = []
  private shouldReconnect = false
  private reconnectAttempts = 0
  private connectPromise: Promise<void> | null = null

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
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.setStatus('failed')
      return
    }
    this.reconnectAttempts++
    this.setStatus('reconnecting')
    setTimeout(() => {
      if (!this.shouldReconnect) return
      this.doConnect().catch(() => {
        // doConnect already handles re-scheduling on close
      })
    }, RECONNECT_DELAY_MS)
  }

  private failAllPending(error: Error): void {
    this.pending.forEach((req) => {
      if (req.timer) clearTimeout(req.timer)
      req.reject(error)
    })
    this.pending.clear()
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
        if (!data.subscription) {
          this.pending.delete(reqId)
        }
        return
      }

      if (data.subscription && req.subscribe) {
        req.subscribe(data)
        if (!req.resolved) {
          req.resolved = true
          if (req.timer) clearTimeout(req.timer)
          req.resolve(data)
        }
        return
      }

      if (req.timer) clearTimeout(req.timer)
      req.resolve(data)
      if (!data.subscription) {
        this.pending.delete(reqId)
      }
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return
    if (this.connectPromise) {
      await this.connectPromise
      return
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

  async subscribe(
    request: Record<string, unknown>,
    callback: (data: any) => void,
  ): Promise<any> {
    await this.ensureConnected()
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }
    const id = this.reqId++
    const msg = JSON.stringify({ ...request, req_id: id, subscribe: 1 })
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error('Subscription request timed out'))
      }, REQUEST_TIMEOUT_MS)
      this.pending.set(id, { resolve, reject, subscribe: callback, timer })
      this.ws!.send(msg)
    })
  }

  forget(id: string): Promise<any> {
    return this.send({ forget: id })
  }

  forgetAll(type: string): Promise<any> {
    return this.send({ forget_all: type })
  }

  disconnect(): void {
    this.shouldReconnect = false
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
