import { useCallback, useEffect, useRef, useState } from 'react'
import * as Blockly from 'blockly'
import {
  createWorkspace,
  createBotApi,
  extractTradeParams,
  generateBotCode,
  loadDefaultWorkspace,
  loadFromXml,
  populateMarketDropdowns,
  workspaceToXml,
  isValidBotXml,
  type BotApi,
  type NotificationType,
} from '../blockly'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { errorMessage } from '../lib/error'
import { useOpenContracts } from '../hooks/useOpenContracts'
import { useMarketData } from '../hooks/useMarketData'
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

    const pendingXml = sessionStorage.getItem('pending_bot_xml')
    if (pendingXml) {
      sessionStorage.removeItem('pending_bot_xml')
      if (isValidBotXml(pendingXml)) {
        loadFromXml(ws, pendingXml)
      }
    }

    const resize = () => Blockly.svgResize(ws)
    window.addEventListener('resize', resize)
    const ro = new ResizeObserver(() => Blockly.svgResize(ws))
    ro.observe(containerRef.current)
    requestAnimationFrame(() => Blockly.svgResize(ws))

    return () => {
      window.removeEventListener('resize', resize)
      ro.disconnect()
      ws.dispose()
      workspaceRef.current = null
    }
  }, [])

  const { ws, account, refreshBalance } = useAuth()
  const { subscribeToContract } = useOpenContracts()
  const { fetchSymbols } = useMarketData()
  const stopRef = useRef(false)

  // Load market data into dropdowns via the public (no-auth) WebSocket — with retry
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
          showToast('info', 'Market data unavailable. You can still build and save your bot.')
        }
        return
      }
      const ok = populateMarketDropdowns(workspaceRef.current, rawSymbols)
      if (ok) {
        setMarketsLoaded(true)
        setMarketsLoading(false)
        showToast('success', 'Markets loaded.')
      } else if (attempt < maxAttempts) {
        retryTimer = setTimeout(() => void tryLoad(), 2000)
      } else {
        setMarketsLoading(false)
        showToast('info', 'Market data unavailable. You can still build and save your bot.')
      }
    }

    void tryLoad()

    return () => {
      cancelled = true
      clearTimeout(retryTimer)
    }
  }, [fetchSymbols, marketsLoaded, showToast])

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
      showToast('success', 'Bot finished running.')
      refreshBalance()
    } catch (err: unknown) {
      if (stopRef.current) {
        showToast('info', 'Bot stopped.')
      } else {
        showToast('error', errorMessage(err, 'Bot execution failed.'))
      }
    } finally {
      setIsRunning(false)
    }
  }, [showToast, ws, account, marketsLoaded, subscribeToContract, refreshBalance])

  const handleStop = useCallback(() => {
    stopRef.current = true
    showToast('info', 'Stopping bot after current trade...')
  }, [showToast])

  const handleReset = useCallback(() => {
    const w = workspaceRef.current
    if (!w) return
    w.clear()
    loadDefaultWorkspace(w)
    setMarketsLoaded(false)
    setWorkspaceModified(false)
    showToast('info', 'Workspace reset to default.')
  }, [showToast])

  const sanitizeFilename = (name: string): string => {
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'bot'
  }

  const handleDownload = useCallback(() => {
    const w = workspaceRef.current
    if (!w) return
    const xml = workspaceToXml(w)
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
      if (marketsLoaded) {
        fetchSymbols().then((rawSymbols) => {
          if (rawSymbols && workspaceRef.current) {
            populateMarketDropdowns(workspaceRef.current, rawSymbols)
          }
        }).catch(() => {})
      }
    } else {
      showToast('error', 'Could not load the XML file — it may be invalid.')
    }
  }, [showToast, marketsLoaded, fetchSymbols])

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
      <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2.5 bg-bg-secondary border-b border-border-default">
        <ToolbarButton
          onClick={handleRun}
          disabled={isRunning || marketsLoading || !marketsLoaded}
          icon={marketsLoading ? Loader2 : Play}
          label={marketsLoading ? 'Loading...' : 'Run'}
          variant="success"
        />
        <ToolbarButton
          onClick={handleStop}
          disabled={!isRunning}
          icon={Square}
          label="Stop"
          variant="danger"
        />
        <div className="w-px h-6 bg-border-light mx-1 hidden sm:block" />
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            placeholder="Bot name"
            className="w-24 sm:w-32 px-2.5 py-1.5 rounded-lg bg-bg-tertiary border border-border-light text-sm focus:outline-none focus:border-brand-red transition-colors"
          />
          <ToolbarButton onClick={handleDownload} icon={FileDown} label="Save" />
        </div>
        <ToolbarButton onClick={handleLoadClick} icon={Upload} label="Load" />
        <div className="w-px h-6 bg-border-light mx-1 hidden sm:block" />
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
              <span className="w-2 h-2 rounded-full bg-brand-red pulse-glow" />
              <span className="hidden sm:inline">Running</span>
            </>
          ) : marketsLoading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="hidden sm:inline">Loading markets...</span>
            </>
          ) : marketsLoaded ? (
            <>
              <span className="w-2 h-2 rounded-full bg-brand-red" />
              <span className="hidden sm:inline">Ready</span>
            </>
          ) : isLoaded ? (
            <>
              <span className="w-2 h-2 rounded-full bg-text-muted" />
              <span className="hidden sm:inline">Ready</span>
            </>
          ) : (
            <Loader2 className="w-3 h-3 animate-spin" />
          )}
        </div>
      </div>

      {/* Blockly workspace */}
      <div
        ref={containerRef}
        className="flex-1 w-full relative min-h-[400px]"
        id="blockly-container"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {dragOver && (
          <div className="absolute inset-0 z-50 bg-brand-red/10 border-2 border-dashed border-brand-red rounded-xl flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 text-brand-red font-medium">
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
    'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
  const styles = {
    default: 'bg-bg-tertiary text-text-primary hover:bg-bg-hover border border-border-light',
    success: 'bg-brand-red text-white hover:bg-brand-red-dim',
    danger: 'bg-bg-tertiary text-brand-red hover:bg-brand-red/10 border border-brand-red/30',
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]}`}>
      <Icon className={`w-4 h-4 ${label === 'Loading...' ? 'animate-spin' : ''}`} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
