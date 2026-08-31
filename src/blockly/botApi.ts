import type { DerivWS } from '../lib/deriv-ws'
import type { DerivSessionAccount } from '../lib/types'
import type { TradeParams } from './index'

export type NotificationType = 'success' | 'info' | 'warn' | 'error'

export interface BotApi {
  purchase(contractType?: string): Promise<number>
  sellAtMarket(): Promise<void>
  isContractOpen(): boolean
  isSellAvailable(): boolean
  getAskPrice(): number
  getPayout(): number
  getSellPrice(): number
  getTick(): number
  getTicks(): number[]
  getLastDigit(): number
  getLastDigitList(): number[]
  getDirection(): string
  getBalance(): number
  getLastResult(): string
  getDetails(detail: string): string | number
  getTotalProfit(): number
  getTotalRuns(): number
  setStake(amount: number): void
  getStake(): number
  shouldStop(): boolean
  notify(type: NotificationType, message: string): void
  console(type: string, message: unknown): void
  sleep(ms: number): Promise<void>
  tickDelay(count: number): Promise<void>
}

export interface NotifyData {
  event?: 'trade_won' | 'trade_lost' | 'trade_sold' | 'purchased'
  profit?: number
  stake?: number
  contractId?: number
  symbol?: string
  contractType?: string
}

export interface BotApiOptions {
  onNotify?: (type: NotificationType, message: string, data?: NotifyData) => void
  onTrade?: (contractId: number) => void
  shouldStop?: () => boolean
}

export function createBotApi(
  ws: DerivWS,
  account: DerivSessionAccount,
  params: TradeParams,
  options: BotApiOptions = {},
): BotApi {
  let currentStake = params.amount
  let currentContractType = params.contract_type
  let openContractId: number | null = null
  let lastResult: 'win' | 'loss' | 'sold' = 'win'
  let lastProfit = 0
  let lastBuyPrice = 0
  let lastPayout = 0
  let lastAskPrice = 0
  let lastProposalPayout = 0
  let lastContractType = ''
  let lastEntryTickTime: number | null = null
  let lastEntryTick: number | null = null
  let lastExitTickTime: number | null = null
  let lastExitTick: number | null = null
  let lastBarrier: string | null = null
  let totalProfit = 0
  let totalRuns = 0
  let lastTick = 0
  let tickHistory: number[] = []
  let sellAvailable = false
  let currentSellPrice = 0

  const notify = (type: NotificationType, message: string, data?: NotifyData): void => {
    options.onNotify?.(type, message, data)
  }

  const waitForContractSettlement = (contractId: number): Promise<void> => {
    return new Promise((resolve) => {
      let settled = false
      let pollTimer: ReturnType<typeof setTimeout> | null = null
      let subReqId: number | null = null

      const cleanup = () => {
        if (pollTimer) clearTimeout(pollTimer)
        if (subReqId !== null) ws.unsubscribe(subReqId)
      }

      const finish = () => {
        if (settled) return
        settled = true
        cleanup()
        resolve()
      }

      const handleContract = (c: any) => {
        sellAvailable = !c.is_sold && !c.is_expired
        currentSellPrice = c.sell_price ? parseFloat(c.sell_price) : 0

        if (c.is_sold || c.is_expired) {
          const profit = parseFloat(c.profit || '0')
          lastProfit = profit
          totalProfit += profit
          totalRuns++
          lastContractType = c.contract_type || currentContractType
          if (c.entry_tick_time != null) lastEntryTickTime = Number(c.entry_tick_time)
          if (c.entry_tick != null) lastEntryTick = parseFloat(c.entry_tick)
          if (c.exit_tick_time != null) lastExitTickTime = Number(c.exit_tick_time)
          if (c.exit_tick != null) lastExitTick = parseFloat(c.exit_tick)
          if (c.barrier != null) lastBarrier = String(c.barrier)

          if (c.status === 'won') {
            lastResult = 'win'
            notify('success', `Trade won! Profit: ${profit.toFixed(2)} ${account.currency}`, { event: 'trade_won', profit, stake: lastBuyPrice, contractId, symbol: params.symbol, contractType: currentContractType })
          } else if (c.status === 'lost') {
            lastResult = 'loss'
            notify('error', `Trade lost. Loss: ${profit.toFixed(2)} ${account.currency}`, { event: 'trade_lost', profit, stake: lastBuyPrice, contractId, symbol: params.symbol, contractType: currentContractType })
          } else {
            lastResult = 'sold'
            notify('info', `Contract sold. P/L: ${profit.toFixed(2)} ${account.currency}`, { event: 'trade_sold', profit, stake: lastBuyPrice, contractId, symbol: params.symbol, contractType: currentContractType })
          }

          openContractId = null
          finish()
        }
      }

      // Primary: subscribe to proposal_open_contract for live updates
      ws.subscribe(
        { proposal_open_contract: 1, contract_id: contractId },
        (data: any) => {
          if (settled) return
          const c = data.proposal_open_contract
          if (c) handleContract(c)
        },
      ).then(({ reqId }) => {
        subReqId = reqId
        if (settled) ws.unsubscribe(reqId)
      }).catch(() => {
        // Subscription failed — fall back to polling below
      })

      // Fallback: poll every 2 seconds in case subscription updates stop
      // arriving (this is what causes bots to stall after a few trades)
      const poll = async () => {
        if (settled) return
        if (options.shouldStop?.()) { finish(); return }
        try {
          const res = await ws.send({ proposal_open_contract: 1, contract_id: contractId })
          if (settled) return
          if (res.proposal_open_contract) {
            handleContract(res.proposal_open_contract)
          }
        } catch {
          // ignore poll errors — will retry
        }
        if (!settled) {
          pollTimer = setTimeout(poll, 2000)
        }
      }
      pollTimer = setTimeout(poll, 2000)
    })
  }

  ws.subscribe({ ticks: params.symbol }, (data: any) => {
    if (data.tick) {
      const quote = parseFloat(data.tick.quote)
      lastTick = quote
      tickHistory = [...tickHistory.slice(-99), quote]
    }
  }).catch(() => {})

  return {
    async purchase(contractType?: string): Promise<number> {
      if (options.shouldStop?.()) throw new Error('Bot stopped')
      const ct = contractType || currentContractType

      const digitContractsRequiringBarrier = ['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER']
      const proposalReq: Record<string, unknown> = {
        proposal: 1,
        amount: currentStake,
        basis: 'stake',
        contract_type: ct,
        currency: params.currency,
        duration: params.duration,
        duration_unit: params.duration_unit,
        underlying_symbol: params.symbol,
      }
      if (digitContractsRequiringBarrier.includes(ct) && params.prediction !== undefined) {
        proposalReq.barrier = String(params.prediction)
      }

      // Retry the proposal+buy up to 3 times — a transient API error or
      // rate-limit should not kill the bot loop.
      let lastError: unknown = null
      for (let attempt = 0; attempt < 3; attempt++) {
        if (options.shouldStop?.()) throw new Error('Bot stopped')
        try {
          const proposalRes = await ws.send(proposalReq)
          const proposal = proposalRes.proposal
          if (!proposal) throw new Error(proposalRes.error?.message || 'No proposal returned')

          lastAskPrice = parseFloat(proposal.ask_price)
          lastProposalPayout = parseFloat(proposal.payout)

          const buyRes = await ws.send({ buy: proposal.id, price: proposal.ask_price })
          const buyData = buyRes.buy
          if (!buyData) throw new Error(buyRes.error?.message || 'Buy failed')

          const contractId = buyData.contract_id
          openContractId = contractId
          lastBuyPrice = parseFloat(buyData.buy_price)
          lastPayout = lastProposalPayout

          options.onTrade?.(contractId)
          notify('info', `Purchased ${ct} for ${buyData.buy_price} ${params.currency}`, { event: 'purchased', stake: parseFloat(buyData.buy_price), contractId, symbol: params.symbol, contractType: ct })

          await waitForContractSettlement(contractId)
          return contractId
        } catch (err) {
          lastError = err
          if (options.shouldStop?.()) throw new Error('Bot stopped')
          const msg = err instanceof Error ? err.message : String(err)
          if (attempt < 2) {
            notify('warn', `Trade attempt ${attempt + 1} failed: ${msg}. Retrying...`)
            await new Promise((r) => setTimeout(r, 1000))
          }
        }
      }
      throw lastError instanceof Error ? lastError : new Error('Purchase failed after retries')
    },

    async sellAtMarket(): Promise<void> {
      if (openContractId === null) return
      try {
        await ws.send({ sell: openContractId, price: 0 })
        notify('info', 'Selling contract at market...')
      } catch {
        notify('error', 'Failed to sell contract')
      }
    },

    isContractOpen(): boolean {
      return openContractId !== null
    },

    isSellAvailable(): boolean {
      return sellAvailable
    },

    getAskPrice(): number {
      return lastAskPrice
    },

    getPayout(): number {
      return lastProposalPayout
    },

    getSellPrice(): number {
      return currentSellPrice
    },

    getTick(): number {
      return lastTick
    },

    getTicks(): number[] {
      return tickHistory
    },

    getLastDigit(): number {
      return lastTick ? lastTick % 10 : 0
    },

    getLastDigitList(): number[] {
      return tickHistory.map((t) => t % 10)
    },

    getDirection(): string {
      if (tickHistory.length < 2) return ''
      const prev = tickHistory[tickHistory.length - 2]
      const curr = tickHistory[tickHistory.length - 1]
      if (curr > prev) return 'rise'
      if (curr < prev) return 'fall'
      return ''
    },

    getBalance(): number {
      return account.balance
    },

    getLastResult(): string {
      return lastResult
    },

    getDetails(detail: string): string | number {
      switch (detail) {
        case '1': return String(openContractId ?? '')
        case '2': return lastBuyPrice
        case '3': return lastPayout
        case '4': return lastProfit
        case '5': return lastContractType
        case '6': return lastEntryTickTime ?? ''
        case '7': return lastEntryTick ?? ''
        case '8': return lastExitTickTime ?? ''
        case '9': return lastExitTick ?? ''
        case '10': return lastBarrier ?? ''
        case '11': return lastResult
        default: return ''
      }
    },

    getTotalProfit(): number {
      return totalProfit
    },

    getTotalRuns(): number {
      return totalRuns
    },

    setStake(amount: number): void {
      currentStake = amount
    },

    getStake(): number {
      return currentStake
    },

    shouldStop(): boolean {
      return options.shouldStop?.() ?? false
    },

    notify,

    console(type: string, message: unknown): void {
      const msg = typeof message === 'string' ? message : String(message)
      const journalType: NotificationType = type === 'warn' ? 'warn' : type === 'error' ? 'error' : 'info'
      notify(journalType, msg)
    },

    async sleep(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms))
    },

    async tickDelay(count: number): Promise<void> {
      const startLen = tickHistory.length
      while (tickHistory.length < startLen + count) {
        if (options.shouldStop?.()) return
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    },
  }
}
