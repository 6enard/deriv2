import { useCallback, useRef, useState } from 'react'
import type * as Blockly from 'blockly'
import {
  createBotApi,
  extractTradeParams,
  generateBotCode,
  type BotApi,
  type NotificationType,
  type NotifyData,
} from '../blockly'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { errorMessage } from '../lib/error'
import { useOpenContracts } from './useOpenContracts'

export interface RunStats {
  totalRuns: number
  wins: number
  losses: number
  totalProfit: number
  totalStake: number
}

export interface JournalEntry {
  time: Date
  type: NotificationType
  message: string
}

export interface BotRunnerOptions {
  marketsLoaded: boolean
  onRunComplete?: () => void
}

export function useBotRunner(
  workspaceRef: React.RefObject<Blockly.WorkspaceSvg | null>,
  options: BotRunnerOptions,
) {
  const { ws, account, refreshBalance } = useAuth()
  const { showToast } = useToast()
  const { subscribeToContract } = useOpenContracts()
  const [isRunning, setIsRunning] = useState(false)
  const [runStats, setRunStats] = useState<RunStats>({ totalRuns: 0, wins: 0, losses: 0, totalProfit: 0, totalStake: 0 })
  const [journal, setJournal] = useState<JournalEntry[]>([])
  const [hasRunOnce, setHasRunOnce] = useState(false)
  const stopRef = useRef(false)

  const handleRun = useCallback(async () => {
    const workspace = workspaceRef.current
    if (!workspace || !ws || !account) {
      showToast('error', 'Connect your Deriv account before running a bot.')
      return
    }
    if (!options.marketsLoaded) {
      showToast('error', 'Markets are still loading. Please wait.')
      return
    }

    const params = extractTradeParams(workspace)
    if (!params) {
      showToast('error', 'Add trade parameter blocks before running.')
      return
    }

    const code = generateBotCode(workspace)
    if (!code) {
      showToast('error', 'Add Purchase conditions and Trade results blocks before running.')
      return
    }

    stopRef.current = false
    setIsRunning(true)
    setHasRunOnce(true)

    const botApi: BotApi = createBotApi(ws, account, params, {
      onNotify: (type: NotificationType, message: string, data?: NotifyData) => {
        showToast(type === 'warn' ? 'error' : type, message)
        setJournal((prev) => [...prev, { time: new Date(), type, message }])
        if (data?.event === 'trade_won' || data?.event === 'trade_lost') {
          setRunStats((prev) => ({
            totalRuns: prev.totalRuns + 1,
            wins: prev.wins + (data.event === 'trade_won' ? 1 : 0),
            losses: prev.losses + (data.event === 'trade_lost' ? 1 : 0),
            totalProfit: prev.totalProfit + (data.profit ?? 0),
            totalStake: prev.totalStake + (data.stake ?? 0),
          }))
        }
      },
      onTrade: (contractId: number) => {
        subscribeToContract(contractId)
      },
      shouldStop: () => stopRef.current,
    })

    try {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
      const fn = new AsyncFunction('Bot', code)
      await fn(botApi)
      showToast('success', 'Bot finished running.')
      refreshBalance()
      options.onRunComplete?.()
    } catch (err: unknown) {
      if (stopRef.current) {
        showToast('info', 'Bot stopped.')
      } else {
        showToast('error', errorMessage(err, 'Bot execution failed.'))
      }
    } finally {
      setIsRunning(false)
    }
  }, [workspaceRef, ws, account, options, subscribeToContract, showToast, refreshBalance])

  const handleStop = useCallback(() => {
    stopRef.current = true
    showToast('info', 'Stopping bot after current trade...')
  }, [showToast])

  const handleResetStats = useCallback(() => {
    setRunStats({ totalRuns: 0, wins: 0, losses: 0, totalProfit: 0, totalStake: 0 })
    setJournal([])
    setHasRunOnce(false)
  }, [])

  const handleClearJournal = useCallback(() => {
    setJournal([])
  }, [])

  return {
    handleRun,
    handleStop,
    isRunning,
    runStats,
    journal,
    hasRunOnce,
    handleResetStats,
    handleClearJournal,
  }
}
