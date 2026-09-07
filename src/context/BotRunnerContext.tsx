import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import * as Blockly from 'blockly'
import {
  createBotApi,
  extractTradeParams,
  generateBotCode,
  type BotApi,
  type NotificationType,
  type NotifyData,
  type TradeParams,
} from '../blockly'
import { useAuth } from './AuthContext'
import { useToast } from '../components/Toast'
import { errorMessage } from '../lib/error'
import { useOpenContracts } from '../hooks/useOpenContracts'
import { mapOpenContract, type OpenContract } from '../lib/types'
import { playSound } from '../lib/sounds'

export interface RunStats {
  totalRuns: number
  wins: number
  losses: number
  totalProfit: number
  totalStake: number
  totalPayout: number
}

export interface JournalEntry {
  time: Date
  type: NotificationType
  message: string
}

const PERSIST_XML_KEY = 'deriv_running_bot_xml'
const PERSIST_RUNNING_KEY = 'deriv_bot_was_running'
const PERSIST_STATS_KEY = 'deriv_bot_stats'
const PERSIST_JOURNAL_KEY = 'deriv_bot_journal'
const PERSIST_TRADES_KEY = 'deriv_bot_trades'
const PERSIST_PARAMS_KEY = 'deriv_bot_params'
const PERSIST_CODE_KEY = 'deriv_bot_code'

interface BotRunnerContextValue {
  isRunning: boolean
  runStats: RunStats
  journal: JournalEntry[]
  trades: OpenContract[]
  hasRunOnce: boolean
  handleRun: (workspaceRef: React.RefObject<Blockly.WorkspaceSvg | null>, marketsLoaded: boolean) => Promise<void>
  handleStop: () => void
  handleResetStats: () => void
  handleClearJournal: () => void
  wasRunningBeforeReload: boolean
  clearWasRunning: () => void
  getSavedBotXml: () => string | null
  getSavedBotCode: () => string | null
  getSavedBotParams: () => TradeParams | null
  resumeRun: (code: string, params: TradeParams) => Promise<void>
}

const BotRunnerContext = createContext<BotRunnerContextValue | null>(null)

function restoreStats(): RunStats {
  try {
    const raw = sessionStorage.getItem(PERSIST_STATS_KEY)
    if (!raw) return { totalRuns: 0, wins: 0, losses: 0, totalProfit: 0, totalStake: 0, totalPayout: 0 }
    const parsed = JSON.parse(raw)
    return {
      totalRuns: parsed.totalRuns ?? 0,
      wins: parsed.wins ?? 0,
      losses: parsed.losses ?? 0,
      totalProfit: parsed.totalProfit ?? 0,
      totalStake: parsed.totalStake ?? 0,
      totalPayout: parsed.totalPayout ?? 0,
    }
  } catch {
    return { totalRuns: 0, wins: 0, losses: 0, totalProfit: 0, totalStake: 0, totalPayout: 0 }
  }
}

function restoreJournal(): JournalEntry[] {
  try {
    const raw = sessionStorage.getItem(PERSIST_JOURNAL_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<{ time: string; type: NotificationType; message: string }>
    return parsed.map((e) => ({ time: new Date(e.time), type: e.type, message: e.message }))
  } catch {
    return []
  }
}

function restoreTrades(): OpenContract[] {
  try {
    const raw = sessionStorage.getItem(PERSIST_TRADES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as OpenContract[]
  } catch {
    return []
  }
}

function restoreParams(): TradeParams | null {
  try {
    const raw = sessionStorage.getItem(PERSIST_PARAMS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as TradeParams
  } catch {
    return null
  }
}

function clearAllPersist() {
  try {
    sessionStorage.removeItem(PERSIST_RUNNING_KEY)
    sessionStorage.removeItem(PERSIST_STATS_KEY)
    sessionStorage.removeItem(PERSIST_JOURNAL_KEY)
    sessionStorage.removeItem(PERSIST_TRADES_KEY)
    sessionStorage.removeItem(PERSIST_PARAMS_KEY)
    sessionStorage.removeItem(PERSIST_CODE_KEY)
  } catch {
    // ignore
  }
}

export function BotRunnerProvider({ children }: { children: ReactNode }) {
  const { ws, account, refreshBalance } = useAuth()
  const { showToast } = useToast()
  const { subscribeToContract } = useOpenContracts()

  const [isRunning, setIsRunning] = useState(false)
  const [runStats, setRunStats] = useState<RunStats>(restoreStats)
  const [journal, setJournal] = useState<JournalEntry[]>(restoreJournal)
  const [trades, setTrades] = useState<OpenContract[]>(restoreTrades)
  const [hasRunOnce, setHasRunOnce] = useState(() => {
    try {
      return sessionStorage.getItem(PERSIST_RUNNING_KEY) === 'true'
    } catch {
      return false
    }
  })

  const stopRef = useRef(false)
  const settledContractIds = useRef<Set<number>>(new Set())
  const botApiRef = useRef<BotApi | null>(null)

  const [wasRunningBeforeReload] = useState(() => {
    try {
      return sessionStorage.getItem(PERSIST_RUNNING_KEY) === 'true'
    } catch {
      return false
    }
  })

  // Persist stats/journal/trades whenever they change
  useEffect(() => {
    try {
      sessionStorage.setItem(PERSIST_STATS_KEY, JSON.stringify(runStats))
    } catch { /* ignore */ }
  }, [runStats])

  useEffect(() => {
    try {
      // Keep last 200 entries to avoid exceeding storage limits
      const toStore = journal.slice(-200)
      sessionStorage.setItem(PERSIST_JOURNAL_KEY, JSON.stringify(
        toStore.map((e) => ({ time: e.time.toISOString(), type: e.type, message: e.message }))
      ))
    } catch { /* ignore */ }
  }, [journal])

  useEffect(() => {
    try {
      sessionStorage.setItem(PERSIST_TRADES_KEY, JSON.stringify(trades.slice(-100)))
    } catch { /* ignore */ }
  }, [trades])

  const clearWasRunning = useCallback(() => {
    try {
      sessionStorage.removeItem(PERSIST_RUNNING_KEY)
    } catch {
      // ignore
    }
  }, [])

  const getSavedBotXml = useCallback(() => {
    try {
      return sessionStorage.getItem(PERSIST_XML_KEY)
    } catch {
      return null
    }
  }, [])

  const getSavedBotCode = useCallback(() => {
    try {
      return sessionStorage.getItem(PERSIST_CODE_KEY)
    } catch {
      return null
    }
  }, [])

  const getSavedBotParams = useCallback(() => {
    return restoreParams()
  }, [])

  const handleRun = useCallback(async (
    workspaceRef: React.RefObject<Blockly.WorkspaceSvg | null>,
    marketsLoaded: boolean,
  ) => {
    const workspace = workspaceRef.current
    if (!workspace || !ws || !account) {
      showToast('error', 'Connect your Deriv account before running a bot.')
      return
    }
    if (!marketsLoaded) {
      showToast('error', 'Markets are still loading. Please wait.')
      return
    }

    stopRef.current = false

    const paramsResult = extractTradeParams(workspace)
    if (!paramsResult.ok) {
      const messages: Record<string, string> = {
        trade_definition: 'Trade Definition block is missing — open the Trade parameters category and add the root block.',
        trade_options: 'Trade Definition is missing trade options (duration/amount) — check the Trade Definition block.',
        symbol: 'Trade Definition is missing a Symbol — open the Trade Definition block and select a market.',
        contract_type: 'Trade Definition is missing a Contract Type — open the Trade Definition block and select a contract type.',
        duration_unit: 'Trade Definition is missing a Duration unit — open the Trade Definition block and select ticks/seconds/minutes/hours.',
        duration: 'Trade Definition is missing a Duration value — set a number in the Duration field of the Trade Definition block.',
        amount: 'Trade Definition is missing a Stake Amount — set a number in the Amount field of the Trade Definition block.',
        currency: 'Trade Definition is missing a Currency — select a currency in the Trade Definition block.',
        prediction: 'Trade Definition is missing a Prediction value — set a digit (0-9) in the Prediction field of the Trade Definition block.',
      }
      showToast('error', messages[paramsResult.missingField] || 'Trade Definition is incomplete — check the Trade parameters block.')
      return
    }
    const params = paramsResult.params

    if (paramsResult.repairedInputs.length > 0) {
      showToast('info', `Some trade values needed correcting (${paramsResult.repairedInputs.join(', ')}) — please verify before relying on this bot.`)
    }

    const code = generateBotCode(workspace)

    if (!code) {
      showToast('error', 'This bot is incomplete. Make sure it contains Trade Definition, Before Purchase and After Purchase blocks.')
      return
    }

    // Persist the bot XML, code, and params so we can resume after a full page reload
    try {
      const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace))
      sessionStorage.setItem(PERSIST_XML_KEY, xml)
      sessionStorage.setItem(PERSIST_CODE_KEY, code)
      sessionStorage.setItem(PERSIST_PARAMS_KEY, JSON.stringify(params))
      sessionStorage.setItem(PERSIST_RUNNING_KEY, 'true')
    } catch {
      // ignore serialization errors
    }

    const botApi: BotApi = createBotApi(ws, account, params, {
      onNotify: (type: NotificationType, message: string, data?: NotifyData) => {
        setJournal((prev) => [...prev, { time: new Date(), type, message }])

        if (!data?.contractId) return
        if (data.event !== 'trade_won' && data.event !== 'trade_lost' && data.event !== 'trade_sold') return
        if (settledContractIds.current.has(data.contractId)) return
        settledContractIds.current.add(data.contractId)

        const profit = data.profit ?? 0
        const isWin = profit > 0
        const isLoss = profit < 0

        if (isWin) {
          playSound('win')
        } else if (isLoss) {
          playSound('loss')
        } else {
          playSound('sold')
        }

        setRunStats((prev) => ({
          totalRuns: prev.totalRuns + 1,
          wins: prev.wins + (isWin ? 1 : 0),
          losses: prev.losses + (isLoss ? 1 : 0),
          totalProfit: prev.totalProfit + profit,
          totalStake: prev.totalStake + (data.stake ?? 0),
          totalPayout: prev.totalPayout + (data.payout ?? 0),
        }))

        setTrades((prev) => {
          const idx = prev.findIndex((t) => t.contract_id === data.contractId)
          if (idx < 0) return prev
          const next = [...prev]
          next[idx] = {
            ...next[idx],
            profit,
            is_sold: true,
            is_expired: true,
            status: isWin ? 'won' : isLoss ? 'lost' : 'sold',
          }
          return next
        })
      },
      onTrade: (contractId: number) => {
        subscribeToContract(contractId)
        ws.subscribe(
          { proposal_open_contract: 1, contract_id: contractId },
          (data: any) => {
            if (data.proposal_open_contract) {
              const contract = mapOpenContract(data.proposal_open_contract)
              setTrades((prev) => {
                const idx = prev.findIndex((t) => t.contract_id === contract.contract_id)
                if (idx >= 0) {
                  const next = [...prev]
                  next[idx] = contract
                  return next
                }
                return [contract, ...prev]
              })
            }
          },
        ).catch(() => {})
      },
      shouldStop: () => stopRef.current,
    })

    botApiRef.current = botApi

    try {
      setIsRunning(true)
      setHasRunOnce(true)
      playSound('start')
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
      const fn = new AsyncFunction('Bot', code)

      // Auto-restart loop: if the generated bot code throws for
      // any reason other than a user-requested stop, wait a few
      // seconds and restart it. The bot should run until the user
      // stops it or stop-loss/take-profit is reached.
      while (!stopRef.current) {
        try {
          await fn(botApi)
          break
        } catch (err: unknown) {
          if (stopRef.current) break
          const msg = errorMessage(err, 'Bot execution failed.')
          showToast('error', `${msg} — restarting in 2s...`)
          playSound('error')
          await new Promise<void>((resolve) => setTimeout(resolve, 2000))
        }
      }

      if (!stopRef.current) {
        showToast('success', 'Bot finished running.')
        playSound('done')
      } else {
        showToast('info', 'Bot stopped.')
        playSound('done')
      }
      refreshBalance()
    } finally {
      await botApi.cleanup().catch(() => {})
      botApiRef.current = null
      setIsRunning(false)
      clearAllPersist()
    }
  }, [ws, account, subscribeToContract, showToast, refreshBalance])

  const resumeRun = useCallback(async (code: string, params: TradeParams) => {
    if (!ws || !account) {
      showToast('error', 'Connect your Deriv account before running a bot.')
      return
    }

    stopRef.current = false

    try {
      sessionStorage.setItem(PERSIST_CODE_KEY, code)
      sessionStorage.setItem(PERSIST_PARAMS_KEY, JSON.stringify(params))
      sessionStorage.setItem(PERSIST_RUNNING_KEY, 'true')
    } catch {
      // ignore
    }

    const botApi: BotApi = createBotApi(ws, account, params, {
      onNotify: (type: NotificationType, message: string, data?: NotifyData) => {
        setJournal((prev) => [...prev, { time: new Date(), type, message }])

        if (!data?.contractId) return
        if (data.event !== 'trade_won' && data.event !== 'trade_lost' && data.event !== 'trade_sold') return
        if (settledContractIds.current.has(data.contractId)) return
        settledContractIds.current.add(data.contractId)

        const profit = data.profit ?? 0
        const isWin = profit > 0
        const isLoss = profit < 0

        if (isWin) {
          playSound('win')
        } else if (isLoss) {
          playSound('loss')
        } else {
          playSound('sold')
        }

        setRunStats((prev) => ({
          totalRuns: prev.totalRuns + 1,
          wins: prev.wins + (isWin ? 1 : 0),
          losses: prev.losses + (isLoss ? 1 : 0),
          totalProfit: prev.totalProfit + profit,
          totalStake: prev.totalStake + (data.stake ?? 0),
          totalPayout: prev.totalPayout + (data.payout ?? 0),
        }))

        setTrades((prev) => {
          const idx = prev.findIndex((t) => t.contract_id === data.contractId)
          if (idx < 0) return prev
          const next = [...prev]
          next[idx] = {
            ...next[idx],
            profit,
            is_sold: true,
            is_expired: true,
            status: isWin ? 'won' : isLoss ? 'lost' : 'sold',
          }
          return next
        })
      },
      onTrade: (contractId: number) => {
        subscribeToContract(contractId)
        ws.subscribe(
          { proposal_open_contract: 1, contract_id: contractId },
          (data: any) => {
            if (data.proposal_open_contract) {
              const contract = mapOpenContract(data.proposal_open_contract)
              setTrades((prev) => {
                const idx = prev.findIndex((t) => t.contract_id === contract.contract_id)
                if (idx >= 0) {
                  const next = [...prev]
                  next[idx] = contract
                  return next
                }
                return [contract, ...prev]
              })
            }
          },
        ).catch(() => {})
      },
      shouldStop: () => stopRef.current,
    })

    botApiRef.current = botApi

    try {
      setIsRunning(true)
      setHasRunOnce(true)
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
      const fn = new AsyncFunction('Bot', code)

      while (!stopRef.current) {
        try {
          await fn(botApi)
          break
        } catch (err: unknown) {
          if (stopRef.current) break
          const msg = errorMessage(err, 'Bot execution failed.')
          showToast('error', `${msg} — restarting in 2s...`)
          playSound('error')
          await new Promise<void>((resolve) => setTimeout(resolve, 2000))
        }
      }

      if (!stopRef.current) {
        showToast('success', 'Bot finished running.')
        playSound('done')
      } else {
        showToast('info', 'Bot stopped.')
        playSound('done')
      }
      refreshBalance()
    } finally {
      await botApi.cleanup().catch(() => {})
      botApiRef.current = null
      setIsRunning(false)
      clearAllPersist()
    }
  }, [ws, account, subscribeToContract, showToast, refreshBalance])

  // Auto-resume the bot after a page reload, regardless of which page
  // the user lands on. This fires once when ws becomes available and
  // there are saved code+params indicating the bot was running.
  const autoResumeAttempted = useRef(false)
  useEffect(() => {
    if (autoResumeAttempted.current) return
    if (!ws || !account) return
    if (!wasRunningBeforeReload) return

    const savedCode = getSavedBotCode()
    const savedParams = getSavedBotParams()

    if (savedCode && savedParams) {
      autoResumeAttempted.current = true
      clearWasRunning()
      void resumeRun(savedCode, savedParams)
    } else {
      clearWasRunning()
    }
  }, [ws, account, wasRunningBeforeReload, clearWasRunning, getSavedBotCode, getSavedBotParams, resumeRun, showToast])

  const handleStop = useCallback(() => {
    stopRef.current = true
    showToast('info', 'Stopping bot after current trade...')
  }, [showToast])

  const handleResetStats = useCallback(() => {
    setRunStats({ totalRuns: 0, wins: 0, losses: 0, totalProfit: 0, totalStake: 0, totalPayout: 0 })
    setJournal([])
    setTrades([])
    setHasRunOnce(false)
    settledContractIds.current = new Set()
    clearAllPersist()
  }, [])

  const handleClearJournal = useCallback(() => {
    setJournal([])
  }, [])

  return (
    <BotRunnerContext.Provider value={{
      isRunning,
      runStats,
      journal,
      trades,
      hasRunOnce,
      handleRun,
      resumeRun,
      handleStop,
      handleResetStats,
      handleClearJournal,
      wasRunningBeforeReload,
      clearWasRunning,
      getSavedBotXml,
      getSavedBotCode,
      getSavedBotParams,
    }}>
      {children}
    </BotRunnerContext.Provider>
  )
}

export function useBotRunnerContext(): BotRunnerContextValue {
  const ctx = useContext(BotRunnerContext)
  if (!ctx) throw new Error('useBotRunnerContext must be used within BotRunnerProvider')
  return ctx
}
