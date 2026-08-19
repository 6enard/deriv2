import { useCallback, useEffect, useRef, useState } from 'react'
import * as Blockly from 'blockly'
import {
  createWorkspace,
  createBotApi,
  extractTradeParams,
  generateBotCode,
  loadDefaultWorkspace,
  populateMarketDropdowns,
  type BotApi,
  type NotificationType,
} from '../blockly'
import type { Bot } from '../lib/types'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import { useOpenContracts } from '../hooks/useOpenContracts'
import { useMarketData } from '../hooks/useMarketData'
import { errorMessage } from '../lib/error'
import { X, Play, Loader as Loader2, Settings as SettingsIcon } from 'lucide-react'

interface BotConfigModalProps {
  bot: Bot
  onClose: () => void
  onActivated?: () => void
}

export default function BotConfigModal({ bot, onClose, onActivated }: BotConfigModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
  const { ws, account, refreshBalance } = useAuth()
  const { showToast } = useToast()
  const { subscribeToContract } = useOpenContracts()
  const { fetchSymbols } = useMarketData()
  const [marketsLoading, setMarketsLoading] = useState(false)
  const [marketsLoaded, setMarketsLoaded] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const stopRef = useRef(false)

  // Create the Blockly workspace once on mount
  useEffect(() => {
    if (!containerRef.current) return
    const workspace = createWorkspace(containerRef.current)
    workspaceRef.current = workspace
    loadDefaultWorkspace(workspace)

    const resize = () => Blockly.svgResize(workspace)
    window.addEventListener('resize', resize)
    const ro = new ResizeObserver(() => Blockly.svgResize(workspace))
    ro.observe(containerRef.current)
    requestAnimationFrame(() => Blockly.svgResize(workspace))

    return () => {
      window.removeEventListener('resize', resize)
      ro.disconnect()
      workspace.dispose()
      workspaceRef.current = null
    }
  }, [])

  const applyBotConfigToWorkspace = useCallback((workspace: Blockly.WorkspaceSvg, cfg: Record<string, unknown>) => {
    const symbol = String(cfg.symbol || cfg.underlying_symbol || '')
    const contractType = String(cfg.contract_type || 'CALL')
    const stake = Number(cfg.stake || cfg.initial_stake || 1)
    const duration = Number(cfg.duration || 5)
    const durationUnit = String(cfg.duration_unit || 't')

    const allBlocks = workspace.getAllBlocks()

    if (symbol) {
      for (const block of allBlocks.filter((b) => b.type === 'trade_definition_market')) {
        const symbolField = block.getField('SYMBOL_LIST') as any
        if (symbolField) symbolField.setValue(symbol)
      }
    }

    for (const block of allBlocks.filter((b) => b.type === 'trade_definition_contracttype')) {
      const f = block.getField('TYPE_LIST') as any
      if (f) f.setValue(contractType)
    }

    for (const block of allBlocks.filter((b) => b.type === 'trade_definition_tradeoptions')) {
      const durationField = block.getField('DURATIONTYPE_LIST') as any
      if (durationField) durationField.setValue(durationUnit)

      const durationInputBlock = block.getInputTargetBlock('DURATION')
      if (durationInputBlock) {
        const numField = durationInputBlock.getField('NUM') as any
        if (numField) numField.setValue(String(duration))
      }

      const amountInputBlock = block.getInputTargetBlock('AMOUNT')
      if (amountInputBlock) {
        const numField = amountInputBlock.getField('NUM') as any
        if (numField) numField.setValue(String(stake))
      }
    }
  }, [])

  // Load markets via the public (no-auth) WebSocket and pre-fill the bot's saved config — with retry
  useEffect(() => {
    if (!workspaceRef.current || marketsLoaded) return
    let cancelled = false
    let attempt = 0
    const maxAttempts = 4
    let retryTimer: ReturnType<typeof setTimeout>

    setMarketsLoading(true)

    const tryLoad = async () => {
      if (cancelled) return
      attempt++
      const rawSymbols = await fetchSymbols()
      if (cancelled) return
      if (!rawSymbols || !workspaceRef.current) {
        if (attempt < maxAttempts) {
          retryTimer = setTimeout(() => void tryLoad(), 2000)
        } else {
          setMarketsLoading(false)
          showToast('error', 'Failed to load markets. Check your connection and try again.')
        }
        return
      }
      const ok = populateMarketDropdowns(workspaceRef.current, rawSymbols)
      if (!ok) {
        if (attempt < maxAttempts) {
          retryTimer = setTimeout(() => void tryLoad(), 2000)
        } else {
          setMarketsLoading(false)
          showToast('error', 'Failed to load markets. Check your connection and try again.')
        }
        return
      }

      applyBotConfigToWorkspace(workspaceRef.current, bot.config as Record<string, unknown>)
      setMarketsLoaded(true)
      setMarketsLoading(false)
    }

    void tryLoad()

    return () => {
      cancelled = true
      clearTimeout(retryTimer)
    }
  }, [fetchSymbols, bot.config, marketsLoaded, showToast, applyBotConfigToWorkspace])

  const handleRun = useCallback(async () => {
    const workspace = workspaceRef.current
    if (!workspace || !ws || !account) {
      showToast('error', 'Connect your Deriv account before running a bot.')
      return
    }
    if (!marketsLoaded) {
      showToast('error', 'Markets are still loading. Please wait.')
      return
    }

    const params = extractTradeParams(workspace)
    if (!params) {
      showToast('error', 'Set the market, contract type, stake, and duration in the blocks before running.')
      return
    }

    const code = generateBotCode(workspace)
    if (!code) {
      showToast('error', 'Add Purchase conditions and Trade results blocks before running.')
      return
    }

    stopRef.current = false
    setIsRunning(true)

    const botApi: BotApi = createBotApi(ws, account, params, {
      onNotify: (type: NotificationType, message: string) => {
        showToast(type === 'warn' ? 'error' : type, message)
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
      showToast('success', `${bot.name} finished running.`)
      refreshBalance()
      onActivated?.()
      onClose()
    } catch (err: unknown) {
      if (stopRef.current) {
        showToast('info', 'Bot stopped.')
      } else {
        showToast('error', errorMessage(err, 'Bot execution failed.'))
      }
    } finally {
      setIsRunning(false)
    }
  }, [ws, account, marketsLoaded, bot.name, subscribeToContract, showToast, refreshBalance, onActivated, onClose])

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-5xl rounded-2xl bg-bg-secondary border border-border-light slide-in flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default shrink-0">
          <div className="flex items-center gap-2.5">
            <SettingsIcon className="w-5 h-5 text-brand-blue" />
            <div>
              <h2 className="font-semibold text-lg leading-tight">{bot.name}</h2>
              <p className="text-xs text-text-muted">
                {marketsLoading ? 'Loading markets...' : 'Adjust the blocks below, then run the bot'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Blockly workspace */}
        <div className="relative flex-1 min-h-[300px] overflow-hidden">
          <div ref={containerRef} className="absolute inset-0" id="bot-config-blockly" />
          {marketsLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary/80 z-10">
              <div className="flex items-center gap-2 text-text-secondary">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading markets...</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border-default shrink-0">
          <p className="text-xs text-text-muted hidden sm:block">
            {bot.description}
          </p>
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-bg-tertiary text-text-secondary text-sm font-medium hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRun}
              disabled={isRunning || !marketsLoaded || marketsLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-green text-bg-primary font-semibold text-sm hover:bg-brand-green-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run Bot
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
