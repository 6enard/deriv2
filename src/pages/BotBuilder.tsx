import { useCallback, useEffect, useRef, useState } from 'react'
import * as Blockly from 'blockly'
import {
  createWorkspace,
  extractTradeParams,
  loadDefaultWorkspace,
  loadFromXml,
  populateMarketDropdowns,
  workspaceToXml,
} from '../blockly'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { errorMessage } from '../lib/error'
import { useOpenContracts } from '../hooks/useOpenContracts'
import { Play, Square, RotateCcw, Download, Upload, Loader as Loader2, FileDown } from 'lucide-react'

export default function BotBuilder() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { showToast } = useToast()
  const [isRunning, setIsRunning] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [marketsLoading, setMarketsLoading] = useState(false)
  const [marketsLoaded, setMarketsLoaded] = useState(false)
  const [botName, setBotName] = useState('My Bot')
  const [confirmLoad, setConfirmLoad] = useState<{ xml: string; filename: string } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [workspaceModified, setWorkspaceModified] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    const ws = createWorkspace(containerRef.current)
    workspaceRef.current = ws
    loadDefaultWorkspace(ws)
    setIsLoaded(true)

    const onChange = () => setWorkspaceModified(true)
    ws.addChangeListener(onChange)

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
  const { subscribeToContract } = useOpenContracts()

  // Load market data into dropdowns once ws is available
  useEffect(() => {
    if (!ws || !workspaceRef.current || marketsLoaded || marketsLoading) return
    let cancelled = false
    setMarketsLoading(true)
    ws.send({ active_symbols: 'brief' })
      .then((res) => {
        if (cancelled || !res.active_symbols) return
        const ok = populateMarketDropdowns(workspaceRef.current!, res.active_symbols)
        if (ok) {
          setMarketsLoaded(true)
          showToast('success', 'Markets loaded.')
        }
      })
      .catch(() => {
        if (!cancelled) showToast('error', 'Failed to load market data.')
      })
      .finally(() => {
        if (!cancelled) setMarketsLoading(false)
      })
    return () => { cancelled = true }
  }, [ws, marketsLoaded, marketsLoading, showToast])



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
    if (!marketsLoaded) {
      showToast('error', 'Markets are still loading. Please wait.')
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
      subscribeToContract(buyData.contract_id)
      showToast('success', `Contract placed (ID: ${buyData.contract_id}) for ${buyData.buy_price} ${params.currency}`)
    } catch (err: unknown) {
      showToast('error', errorMessage(err, 'Trade failed. Please try again.'))
    } finally {
      setIsRunning(false)
    }
  }, [showToast, ws, account, marketsLoaded, subscribeToContract])

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
    setMarketsLoaded(false)
    setWorkspaceModified(false)
    showToast('info', 'Workspace reset to default.')
  }, [showToast])

  const sanitizeFilename = (name: string): string => {
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'bot'
  }

  const handleDownload = useCallback(() => {
    const ws = workspaceRef.current
    if (!ws) return
    const xml = workspaceToXml(ws)
    const blob = new Blob([xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `${sanitizeFilename(botName)}-${date}.xml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('success', 'Bot saved as XML file.')
  }, [showToast, botName])

  const handleLoadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const performLoad = useCallback((xml: string, filename: string) => {
    const w = workspaceRef.current
    if (!w) return
    const ok = loadFromXml(w, xml)
    if (ok) {
      showToast('success', `Loaded "${filename}".`)
      // Re-populate dropdowns if we still have market data
      if (marketsLoaded && ws) {
        ws.send({ active_symbols: 'brief' })
          .then((res) => {
            if (res.active_symbols && workspaceRef.current) {
              populateMarketDropdowns(workspaceRef.current, res.active_symbols)
            }
          })
          .catch(() => {})
      }
    } else {
      showToast('error', 'Could not load the XML file — it may be invalid.')
    }
  }, [showToast, marketsLoaded, ws])

  const handleFileLoad = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (event) => {
        const xml = event.target?.result as string
        if (!xml) return
        if (!workspaceModified) {
          performLoad(xml, file.name)
        } else {
          setConfirmLoad({ xml, filename: file.name })
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    [workspaceModified, performLoad],
  )

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.xml')) {
      showToast('error', 'Only .xml files are supported.')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      const xml = event.target?.result as string
      if (!xml) return
      if (!workspaceModified) {
        performLoad(xml, file.name)
      } else {
        setConfirmLoad({ xml, filename: file.name })
      }
    }
    reader.readAsText(file)
  }, [workspaceModified, performLoad, showToast])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])

  return (
    <div className="flex flex-col h-[calc(100vh-68px)]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-secondary border-b border-border-default">
        <ToolbarButton
          onClick={handleRun}
          disabled={isRunning || marketsLoading || !marketsLoaded}
          icon={marketsLoading ? Loader2 : Play}
          label={marketsLoading ? 'Loading...' : 'Run'}
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
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            placeholder="Bot name"
            className="w-32 px-2.5 py-1.5 rounded-lg bg-bg-tertiary border border-border-light text-sm focus:outline-none focus:border-brand-blue transition-colors"
          />
          <ToolbarButton onClick={handleDownload} icon={FileDown} label="Save" />
        </div>
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
          ) : marketsLoading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading markets...
            </>
          ) : marketsLoaded ? (
            <>
              <span className="w-2 h-2 rounded-full bg-brand-green" />
              Ready
            </>
          ) : isLoaded ? (
            <>
              <span className="w-2 h-2 rounded-full bg-text-muted" />
              Waiting for markets
            </>
          ) : (
            <Loader2 className="w-3 h-3 animate-spin" />
          )}
        </div>
      </div>

      {/* Blockly workspace */}
      <div
        ref={containerRef}
        className="flex-1 w-full relative"
        id="blockly-container"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {dragOver && (
          <div className="absolute inset-0 z-50 bg-brand-blue/10 border-2 border-dashed border-brand-blue rounded-xl flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 text-brand-blue font-medium">
              <Download className="w-6 h-6" />
              Drop .xml file to load bot
            </div>
          </div>
        )}
      </div>

      {/* Load confirmation modal */}
      {confirmLoad && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setConfirmLoad(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-bg-secondary border border-border-light p-6 slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-lg mb-2">Load bot?</h2>
            <p className="text-sm text-text-secondary mb-5">
              Loading <span className="font-medium text-text-primary">{confirmLoad.filename}</span> will replace your current workspace. Continue?
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  performLoad(confirmLoad.xml, confirmLoad.filename)
                  setConfirmLoad(null)
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-brand-red text-white font-semibold text-sm hover:bg-brand-red-dim transition-colors"
              >
                Load & Replace
              </button>
              <button
                onClick={() => setConfirmLoad(null)}
                className="px-4 py-2.5 rounded-xl bg-bg-tertiary text-text-secondary text-sm font-medium hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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
      <Icon className={`w-4 h-4 ${label === 'Loading...' ? 'animate-spin' : ''}`} />
      {label}
    </button>
  )
}
