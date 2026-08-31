import { useCallback, useEffect, useRef, useState } from 'react'
import * as Blockly from 'blockly'
import {
  createWorkspace,
  loadDefaultWorkspace,
  loadBotXmlSafely,
  setGlobalMarketOptions,
  workspaceToXml,
  extractTradeParams,
} from '../blockly'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useMarketData } from '../hooks/useMarketData'
import { useBotRunner } from '../hooks/useBotRunner'
import { RunResultsPanel, type ResultsTab } from '../components/RunResultsPanel'
import { Play, Square, RotateCcw, Download, Upload, Loader as Loader2, FileDown, ChevronDown } from 'lucide-react'

export default function BotBuilder() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { showToast } = useToast()
  const [isLoaded, setIsLoaded] = useState(false)
  const [marketsLoading, setMarketsLoading] = useState(false)
  const [marketsLoaded, setMarketsLoaded] = useState(false)
  const [botName, setBotName] = useState('My Bot')
  const [confirmLoad, setConfirmLoad] = useState<{ xml: string; filename: string } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [workspaceModified, setWorkspaceModified] = useState(false)
  const pendingXmlRef = useRef<string | null>(null)
  const [resultsTab, setResultsTab] = useState<ResultsTab>('summary')
  const journalEndRef = useRef<HTMLDivElement | null>(null)
  const [showResultsMobile, setShowResultsMobile] = useState(false)

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
      pendingXmlRef.current = pendingXml
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

  const { account } = useAuth()
  const { fetchSymbols, symbols } = useMarketData()

  const { handleRun, handleStop, isRunning, runStats, journal, trades, hasRunOnce, handleResetStats, handleClearJournal } =
    useBotRunner(workspaceRef, { marketsLoaded })

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
      const ok = setGlobalMarketOptions(rawSymbols)
      if (ok) {
        if (pendingXmlRef.current && workspaceRef.current) {
          const result = await loadBotXmlSafely(
            workspaceRef.current,
            pendingXmlRef.current,
            () => Promise.resolve(rawSymbols),
            rawSymbols,
          )
          pendingXmlRef.current = null
          if (result.ok) {
            if (result.repaired) {
              showToast('info', 'This bot was updated to work with the latest builder — please double check its settings before running.')
            } else {
              showToast('success', 'Bot loaded — ready to run.')
            }
            checkLoadedFields(workspaceRef.current)
          } else {
            showToast('error', result.reason)
          }
        } else {
          showToast('success', 'Markets loaded.')
        }
        setMarketsLoaded(true)
        setMarketsLoading(false)
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

  const checkLoadedFields = useCallback((w: Blockly.WorkspaceSvg) => {
    const result = extractTradeParams(w)
    if (!result.ok && (result.missingField === 'symbol' || result.missingField === 'contract_type')) {
      showToast('error', "This bot's market selection didn't load correctly. Please reselect a symbol in the Trade Definition block.")
    }
  }, [showToast])

  const performLoad = useCallback(async (xml: string, filename: string) => {
    const w = workspaceRef.current
    if (!w) return
    const result = await loadBotXmlSafely(w, xml, fetchSymbols, symbols.length > 0 ? symbols : null)
    if (result.ok) {
      if (result.repaired) {
        showToast('info', 'This bot was updated to work with the latest builder — please double check its settings before running.')
      } else {
        showToast('success', `Loaded "${filename}".`)
      }
      checkLoadedFields(w)
    } else {
      showToast('error', result.reason)
    }
  }, [showToast, fetchSymbols, symbols, checkLoadedFields])

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

  useEffect(() => {
    if (resultsTab === 'journal' && journalEndRef.current) {
      journalEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [journal, resultsTab])

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-68px)] overflow-hidden">
      {/* Left: toolbar + canvas */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 bg-bg-secondary border-b border-border-default overflow-x-auto shrink-0 scrollbar-thin">
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
        <div className="w-px h-6 bg-border-light mx-0.5 hidden sm:block" />
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <input
            type="text"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            placeholder="Bot name"
            className="w-20 sm:w-32 px-2 sm:px-2.5 py-1.5 rounded-lg bg-bg-tertiary border border-border-light text-sm focus:outline-none focus:border-brand-red transition-colors"
          />
          <ToolbarButton onClick={handleDownload} icon={FileDown} label="Save" />
        </div>
        <ToolbarButton onClick={handleLoadClick} icon={Upload} label="Load" />
        <div className="w-px h-6 bg-border-light mx-0.5 hidden sm:block" />
        <ToolbarButton onClick={handleReset} icon={RotateCcw} label="Reset" />
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml"
          onChange={handleFileLoad}
          className="hidden"
        />
        <div className="ml-auto flex items-center gap-2 text-xs text-text-muted shrink-0 pl-1">
          {isRunning ? (
            <>
              <span className="w-2 h-2 rounded-full bg-brand-red pulse-glow" />
              <span className="hidden md:inline">Running</span>
            </>
          ) : marketsLoading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="hidden md:inline">Loading markets...</span>
            </>
          ) : marketsLoaded ? (
            <>
              <span className="w-2 h-2 rounded-full bg-brand-red" />
              <span className="hidden md:inline">Ready</span>
            </>
          ) : isLoaded ? (
            <>
              <span className="w-2 h-2 rounded-full bg-text-muted" />
              <span className="hidden md:inline">Ready</span>
            </>
          ) : (
            <Loader2 className="w-3 h-3 animate-spin" />
          )}
        </div>
      </div>

      {/* Blockly workspace */}
      <div
        ref={containerRef}
        className="flex-1 w-full relative min-h-0 overflow-hidden"
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

      {/* Mobile results toggle bar */}
      {hasRunOnce && (
        <button
          onClick={() => setShowResultsMobile(!showResultsMobile)}
          className="lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-bg-secondary border-t border-border-default text-sm font-medium text-text-primary shrink-0"
        >
          {showResultsMobile ? 'Hide results' : 'Show results'}
          <ChevronDown className={`w-4 h-4 transition-transform ${showResultsMobile ? 'rotate-180' : ''}`} />
        </button>
      )}

      </div>

      {/* Run Results Panel — right sidebar on large screens, collapsible drawer on small */}
      {hasRunOnce && (
        <>
          {/* Desktop sidebar */}
          <div className="hidden lg:flex lg:w-[380px] lg:border-l lg:border-t-0 border-t border-border-default flex-shrink-0 flex-col">
            <RunResultsPanel
              tab={resultsTab}
              onTabChange={setResultsTab}
              runStats={runStats}
              journal={journal}
              journalEndRef={journalEndRef}
              trades={trades}
              currency={account?.currency || 'USD'}
              onClearJournal={handleClearJournal}
              onResetStats={handleResetStats}
            />
          </div>

          {/* Mobile drawer — slides up from bottom */}
          {showResultsMobile && (
            <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 h-[65vh] max-h-[600px] bg-bg-secondary border-t border-border-light rounded-t-2xl flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-default shrink-0">
                <span className="text-sm font-semibold">Run Results</span>
                <button onClick={() => setShowResultsMobile(false)} className="text-text-secondary hover:text-text-primary p-1">
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <RunResultsPanel
                  tab={resultsTab}
                  onTabChange={setResultsTab}
                  runStats={runStats}
                  journal={journal}
                  journalEndRef={journalEndRef}
                  trades={trades}
                  currency={account?.currency || 'USD'}
                  onClearJournal={handleClearJournal}
                  onResetStats={handleResetStats}
                />
              </div>
            </div>
          )}
        </>
      )}

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
    'flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0'
  const styles = {
    default: 'bg-bg-tertiary text-text-primary hover:bg-bg-hover border border-border-light',
    success: 'bg-brand-red text-white hover:bg-brand-red-dim',
    danger: 'bg-bg-tertiary text-brand-red hover:bg-brand-red/10 border border-brand-red/30',
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]}`}>
      <Icon className={`w-4 h-4 shrink-0 ${label === 'Loading...' ? 'animate-spin' : ''}`} />
      <span className="hidden xs:inline sm:inline">{label}</span>
    </button>
  )
}
