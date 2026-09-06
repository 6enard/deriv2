import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import * as Blockly from 'blockly'
import {
  createBotApi,
  extractTradeParams,
  generateBotCode,
  type BotApi,
  type NotificationType,
  type NotifyData,
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
}

const BotRunnerContext = createContext<BotRunnerContextValue | null>(null)

export function BotRunnerProvider({ children }: { children: ReactNode }) {
  const { ws, account, refreshBalance } = useAuth()
  const { showToast } = useToast()
  const { subscribeToContract } = useOpenContracts()

  const [isRunning, setIsRunning] = useState(false)
  const [runStats, setRunStats] = useState<RunStats>({ totalRuns: 0, wins: 0, losses: 0, totalProfit: 0, totalStake: 0, totalPayout: 0 })
  const [journal, setJournal] = useState<JournalEntry[]>([])
  const [trades, setTrades] = useState<OpenContract[]>([])
  const [hasRunOnce, setHasRunOnce] = useState(false)

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

    // Persist the bot XML so we can resume after a full page reload
    try {
      const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace))
      sessionStorage.setItem(PERSIST_XML_KEY, xml)
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
      await fn(botApi)
      showToast('success', 'Bot finished running.')
      playSound('done')
      refreshBalance()
    } catch (err: unknown) {
      if (stopRef.current) {
        showToast('info', 'Bot stopped.')
        playSound('done')
      } else {
        showToast('error', errorMessage(err, 'Bot execution failed.'))
        playSound('error')
      }
    } finally {
      await botApi.cleanup().catch(() => {})
      botApiRef.current = null
      setIsRunning(false)
      try {
        sessionStorage.removeItem(PERSIST_RUNNING_KEY)
      } catch {
        // ignore
      }
    }
  }, [ws, account, subscribeToContract, showToast, refreshBalance])

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
      handleStop,
      handleResetStats,
      handleClearJournal,
      wasRunningBeforeReload,
      clearWasRunning,
      getSavedBotXml,
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
