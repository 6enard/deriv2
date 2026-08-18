import { useCallback, useEffect, useRef, useState } from 'react'
import * as Blockly from 'blockly'
import {
  createWorkspace,
  extractTradeParams,
  loadDefaultWorkspace,
  loadFromXml,
  workspaceToXml,
} from '../blockly'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { errorMessage } from '../lib/error'
import { Play, Square, RotateCcw, Download, Upload, Loader as Loader2 } from 'lucide-react'

export default function BotBuilder() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { showToast } = useToast()
  const [isRunning, setIsRunning] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    const ws = createWorkspace(containerRef.current)
    workspaceRef.current = ws
    loadDefaultWorkspace(ws)
    setIsLoaded(true)

    const resize = () => Blockly.svgResize(ws)
    window.addEventListener('resize', resize)
    requestAnimationFrame(() => Blockly.svgResize(ws))

    return () => {
      window.removeEventListener('resize', resize)
      ws.dispose()
      workspaceRef.current = null
    }
  }, [])

  const { ws, account } = useAuth()

  const handleRun = useCallback(async () => {
    // TODO(phase3): replace this single-shot fire with an interpreter that
    // walks the before/during/after-purchase blocks, supports loops, sell
    // conditions, and martingale retries. For now we read the trade
    // parameters once and place a single proposal -> buy, same as Trade.tsx.
    const workspace = workspaceRef.current
    if (!workspace || !ws || !account) {
      showToast('error', 'Connect your Deriv account before running a bot.')
      return
    }

    const params = extractTradeParams(workspace)
    if (!params) {
      showToast('error', 'Add trade parameter blocks before running.')
      return
    }

    setIsRunning(true)
    try {
      const proposalRes = await ws.send({
        proposal: 1,
        amount: params.amount,
        basis: 'stake',
        contract_type: params.contract_type,
        currency: params.currency,
        duration: params.duration,
        duration_unit: params.duration_unit,
        underlying_symbol: params.symbol,
      })
      const proposal = proposalRes.proposal
      const buyRes = await ws.send({ buy: proposal.id, price: proposal.ask_price })
      const buyData = buyRes.buy
      showToast('success', `Contract placed (ID: ${buyData.contract_id}) for ${buyData.buy_price} ${params.currency}`)
    } catch (err: unknown) {
      showToast('error', errorMessage(err, 'Trade failed. Please try again.'))
    } finally {
      setIsRunning(false)
    }
  }, [showToast, ws, account])

  const handleStop = useCallback(() => {
    // TODO(phase2): stop the running bot via DerivWS.
    setIsRunning(false)
    showToast('info', 'Bot stopped.')
  }, [showToast])

  const handleReset = useCallback(() => {
    const ws = workspaceRef.current
    if (!ws) return
    ws.clear()
    loadDefaultWorkspace(ws)
    showToast('info', 'Workspace reset to default.')
  }, [showToast])

  const handleDownload = useCallback(() => {
    const ws = workspaceRef.current
    if (!ws) return
    const xml = workspaceToXml(ws)
    const blob = new Blob([xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bot-${Date.now()}.xml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('success', 'Bot saved as XML file.')
  }, [showToast])

  const handleLoadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileLoad = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (event) => {
        const xml = event.target?.result as string
        const ws = workspaceRef.current
        if (!ws) return
        const ok = loadFromXml(ws, xml)
        if (ok) {
          showToast('success', 'Bot loaded from file.')
        } else {
          showToast('error', 'Could not load the XML file — it may be invalid.')
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    [showToast],
  )

  return (
    <div className="flex flex-col h-[calc(100vh-68px)]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-secondary border-b border-border-default">
        <ToolbarButton
          onClick={handleRun}
          disabled={isRunning}
          icon={Play}
          label="Run"
          variant="success"
        />
        <ToolbarButton
          onClick={handleStop}
          disabled
          icon={Square}
          label="Stop"
          variant="danger"
        />
        <div className="w-px h-6 bg-border-light mx-1" />
        <ToolbarButton onClick={handleDownload} icon={Download} label="Save" />
        <ToolbarButton onClick={handleLoadClick} icon={Upload} label="Load" />
        <div className="w-px h-6 bg-border-light mx-1" />
        <ToolbarButton onClick={handleReset} icon={RotateCcw} label="Reset" />
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml"
          onChange={handleFileLoad}
          className="hidden"
        />
        <div className="ml-auto flex items-center gap-2 text-xs text-text-muted">
          {isRunning ? (
            <>
              <span className="w-2 h-2 rounded-full bg-brand-green pulse-glow" />
              Running
            </>
          ) : isLoaded ? (
            <>
              <span className="w-2 h-2 rounded-full bg-text-muted" />
              Ready
            </>
          ) : (
            <Loader2 className="w-3 h-3 animate-spin" />
          )}
        </div>
      </div>

      {/* Blockly workspace */}
      <div ref={containerRef} className="flex-1 w-full" id="blockly-container" />
    </div>
  )
}

function ToolbarButton({
  onClick,
  icon: Icon,
  label,
  variant = 'default',
  disabled,
}: {
  onClick: () => void
  icon: typeof Play
  label: string
  variant?: 'default' | 'success' | 'danger'
  disabled?: boolean
}) {
  const base =
    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
  const styles = {
    default: 'bg-bg-tertiary text-text-primary hover:bg-bg-hover border border-border-light',
    success: 'bg-brand-green text-bg-primary hover:bg-brand-green-dim',
    danger: 'bg-brand-red text-white hover:bg-brand-red-dim',
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]}`}>
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}
