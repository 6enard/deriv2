type PendingRequest = {
  resolve: (data: any) => void
  reject: (error: any) => void
  subscribe?: (data: any) => void
}

export class DerivWS {
  private ws: WebSocket | null = null
  private reqId = 1
  private pending = new Map<number, PendingRequest>()
  private url: string
  private listeners: ((status: string) => void)[] = []

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
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url)
      this.setStatus('connecting')

      this.ws.onopen = () => {
        this.setStatus('connected')
        resolve()
      }

      this.ws.onerror = () => {
        this.setStatus('error')
        reject(new Error('WebSocket connection failed'))
      }

      this.ws.onclose = () => {
        this.setStatus('disconnected')
        this.pending.forEach((p) => p.reject(new Error('Connection closed')))
        this.pending.clear()
      }

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event)
      }
    })
  }

  private handleMessage(event: MessageEvent): void {
    const data = JSON.parse(event.data)
    const reqId = data.req_id

    if (reqId && this.pending.has(reqId)) {
      const req = this.pending.get(reqId)!

      if (data.error) {
        req.reject(data.error)
        if (!data.subscription) {
          this.pending.delete(reqId)
        }
        return
      }

      if (data.subscription && req.subscribe) {
        req.subscribe(data)
        return
      }

      req.resolve(data)
      if (!data.subscription) {
        this.pending.delete(reqId)
      }
    }
  }

  send(request: Record<string, unknown>): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('WebSocket not connected'))
    }
    const id = this.reqId++
    const msg = JSON.stringify({ ...request, req_id: id })
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws!.send(msg)
    })
  }

  subscribe(
    request: Record<string, unknown>,
    callback: (data: any) => void,
  ): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('WebSocket not connected'))
    }
    const id = this.reqId++
    const msg = JSON.stringify({ ...request, req_id: id, subscribe: 1 })
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, subscribe: callback })
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
    this.ws?.close()
    this.ws = null
    this.pending.clear()
    this.setStatus('disconnected')
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
