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
import { mapOpenContract, type OpenContract } from '../lib/types'

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
  const [runStats, setRunStats] = useState<RunStats>({ totalRuns: 0, wins: 0, losses: 0, totalProfit: 0, totalStake: 0, totalPayout: 0 })
  const [journal, setJournal] = useState<JournalEntry[]>([])
  const [trades, setTrades] = useState<OpenContract[]>([])
  const [hasRunOnce, setHasRunOnce] = useState(false)
  const stopRef = useRef(false)
  const settledContractIds = useRef<Set<number>>(new Set())

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
      // Diagnostic: dump the full current state of the Trade Definition block's
      // fields so if this error recurs we have real data instead of guessing.
      const topBlocks = workspace.getTopBlocks(false)
      const root = topBlocks.find((b) => b.type === 'trade_definition')
      const tradeOptionsBlock = root?.getInputTargetBlock('TRADE_OPTIONS')
      let b: Blockly.Block | null = tradeOptionsBlock ?? null
      const fieldDump: Record<string, string> = {}
      while (b) {
        if (b.type === 'trade_definition_market') {
          fieldDump.MARKET_LIST = String(b.getFieldValue('MARKET_LIST') || '')
          fieldDump.SUBMARKET_LIST = String(b.getFieldValue('SUBMARKET_LIST') || '')
          fieldDump.SYMBOL_LIST = String(b.getFieldValue('SYMBOL_LIST') || '')
        } else if (b.type === 'trade_definition_contracttype') {
          fieldDump.TYPE_LIST = String(b.getFieldValue('TYPE_LIST') || '')
        }
        b = b.getNextBlock()
      }
      const paramsBlock = root?.getInputTargetBlock('SUBMARKET')
      if (paramsBlock && paramsBlock.type === 'trade_definition_tradeoptions') {
        fieldDump.DURATIONTYPE_LIST = String(paramsBlock.getFieldValue('DURATIONTYPE_LIST') || '')
        fieldDump.CURRENCY_LIST = String(paramsBlock.getFieldValue('CURRENCY_LIST') || '')
        fieldDump.DURATION = String(paramsBlock.getInputTargetBlock('DURATION')?.getFieldValue('NUM') || '')
        fieldDump.AMOUNT = String(paramsBlock.getInputTargetBlock('AMOUNT')?.getFieldValue('NUM') || '')
        fieldDump.PREDICTION = String(paramsBlock.getInputTargetBlock('PREDICTION')?.getFieldValue('NUM') || '')
      }
      console.error('[useBotRunner] extractTradeParams failed — missingField:', paramsResult.missingField, 'current Trade Definition fields:', fieldDump)
      showToast('error', messages[paramsResult.missingField] || 'Trade Definition is incomplete — check the Trade parameters block.')
      return
    }
    const params = paramsResult.params

    if (paramsResult.repairedInputs.length > 0) {
      showToast('info', `Some trade values needed correcting (${paramsResult.repairedInputs.join(', ')}) — please verify before relying on this bot.`)
    }

   const code = generateBotCode(workspace)

if (!code) {
  showToast(
    'error',
    'This bot is incomplete. Make sure it contains Trade Definition, Before Purchase and After Purchase blocks.',
  )
  return
}

    const botApi: BotApi = createBotApi(ws, account, params, {
      onNotify: (type: NotificationType, message: string, data?: NotifyData) => {
        setJournal((prev) => [...prev, { time: new Date(), type, message }])

        // Only count completed contracts — not purchases or generic events.
        // Deduplicate by contract_id so duplicate settlement messages don't
        // inflate stats. Classify win/loss by actual P/L, not event name.
        if (!data?.contractId) return
        if (data.event !== 'trade_won' && data.event !== 'trade_lost' && data.event !== 'trade_sold') return
        if (settledContractIds.current.has(data.contractId)) return
        settledContractIds.current.add(data.contractId)

        const profit = data.profit ?? 0
        const isWin = profit > 0
        const isLoss = profit < 0

        setRunStats((prev) => ({
          totalRuns: prev.totalRuns + 1,
          wins: prev.wins + (isWin ? 1 : 0),
          losses: prev.losses + (isLoss ? 1 : 0),
          totalProfit: prev.totalProfit + profit,
          totalStake: prev.totalStake + (data.stake ?? 0),
          totalPayout: prev.totalPayout + (data.payout ?? 0),
        }))
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
      // Always release tick/contract subscriptions, whether the run
      // finished, was stopped, or threw — otherwise the next run's
      // subscribe() call for the same symbol is rejected by the API
      // with an "AlreadySubscribed" error.
      await botApi.cleanup().catch(() => {})
      setIsRunning(false)
    }
  }, [workspaceRef, ws, account, options, subscribeToContract, showToast, refreshBalance])

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

  return {
    handleRun,
    handleStop,
    isRunning,
    runStats,
    journal,
    trades,
    hasRunOnce,
    handleResetStats,
    handleClearJournal,
  }
}