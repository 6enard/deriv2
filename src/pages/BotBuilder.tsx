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
import { Play, Square, RotateCcw, Download, Upload, Loader as Loader2, Blocks as BlocksIcon, Activity, X, Save, FolderOpen, ZoomIn, ZoomOut, Maximize2, MoveHorizontal as MoreHorizontal, CircleCheck as CheckCircle2, CircleAlert, CreditCard as EditIcon, DollarSign, ChevronDown, ChevronUp, TriangleAlert } from 'lucide-react'

export default function BotBuilder() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const moreActionsRef = useRef<HTMLDivElement | null>(null)

  const { showToast } = useToast()
  const { account } = useAuth()
  const { fetchSymbols, symbols } = useMarketData()
  const fetchSymbolsRef = useRef(fetchSymbols)
  fetchSymbolsRef.current = fetchSymbols

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
  const [showMoreActions, setShowMoreActions] = useState(false)
  const [showEditBot, setShowEditBot] = useState(false)
  const [mobilePanelExpanded, setMobilePanelExpanded] = useState(false)
  const autoRunRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return

    const ws = createWorkspace(containerRef.current)
    workspaceRef.current = ws

    loadDefaultWorkspace(ws)
    setIsLoaded(true)

    const onChange = () => {
      setWorkspaceModified(true)
    }

    ws.addChangeListener(onChange)

    const pendingXml = sessionStorage.getItem('pending_bot_xml')
    const autoRun = sessionStorage.getItem('pending_bot_autorun') === 'true'

    if (pendingXml) {
      sessionStorage.removeItem('pending_bot_xml')
      pendingXmlRef.current = pendingXml
    }
    if (autoRun) {
      sessionStorage.removeItem('pending_bot_autorun')
      autoRunRef.current = true
    }

    const resize = () => {
      Blockly.svgResize(ws)
    }

    window.addEventListener('resize', resize)

    const ro = new ResizeObserver(() => {
      Blockly.svgResize(ws)
    })

    ro.observe(containerRef.current)

    requestAnimationFrame(() => {
      Blockly.svgResize(ws)
    })

    return () => {
      window.removeEventListener('resize', resize)
      ro.disconnect()
      ws.dispose()
      workspaceRef.current = null
    }
  }, [])

  const {
    handleRun,
    handleStop,
    isRunning,
    runStats,
    journal,
    trades,
    hasRunOnce,
    handleResetStats,
    handleClearJournal,
  } = useBotRunner(workspaceRef, { marketsLoaded })

  const handleRunRef = useRef(handleRun)
  handleRunRef.current = handleRun

  /*
   * Load market data into Blockly dropdowns.
   */
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

          showToast(
            'info',
            'Market data unavailable. You can still build and save your bot.',
          )
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
              showToast(
                'info',
                'This bot was updated to work with the latest builder — please double check its settings before running.',
              )
            } else {
              showToast('success', 'Bot loaded — ready to run.')
            }

            checkLoadedFields(workspaceRef.current)
          } else {
            if (result.loaded) {
              checkLoadedFields(workspaceRef.current)
            } else {
              showToast('error', result.reason)
            }
          }
        } else {
          showToast('success', 'Markets loaded.')
        }

        setMarketsLoaded(true)
        setMarketsLoading(false)

        if (autoRunRef.current) {
          autoRunRef.current = false
          setTimeout(() => void handleRunRef.current(), 500)
        }
      } else if (attempt < maxAttempts) {
        retryTimer = setTimeout(() => void tryLoad(), 2000)
      } else {
        setMarketsLoading(false)

        showToast(
          'info',
          'Market data unavailable. You can still build and save your bot.',
        )
      }
    }

    void tryLoad()

    return () => {
      cancelled = true
      clearTimeout(retryTimer)
    }
  }, [fetchSymbols, marketsLoaded, showToast])

  const handleReset = useCallback(() => {
    const workspace = workspaceRef.current

    if (!workspace) return

    workspace.clear()
    loadDefaultWorkspace(workspace)

    setMarketsLoaded(false)
    setWorkspaceModified(false)
    setShowMoreActions(false)

    showToast('info', 'Workspace reset to default.')
  }, [showToast])

  const sanitizeFilename = (name: string): string => {
    return (
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'bot'
    )
  }

  const handleDownload = useCallback(() => {
    const workspace = workspaceRef.current

    if (!workspace) return

    const xml = workspaceToXml(workspace)

    const blob = new Blob([xml], {
      type: 'application/xml',
    })

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    const date = new Date().toISOString().slice(0, 10)

    anchor.href = url
    anchor.download = `${sanitizeFilename(botName)}-${date}.xml`

    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)

    URL.revokeObjectURL(url)

    showToast('success', 'Bot saved as XML file.')
    setShowMoreActions(false)
  }, [showToast, botName])

  const handleLoadClick = useCallback(() => {
    fileInputRef.current?.click()
    setShowMoreActions(false)
  }, [])

  const checkLoadedFields = useCallback(
    (workspace: Blockly.WorkspaceSvg) => {
      const result = extractTradeParams(workspace)

      if (!result.ok) {
        const field = result.missingField
        const messages: Record<string, string> = {
          market:
            'This bot is missing a market selection. Please choose a market in the Trade Parameters block before running.',
          symbol:
            "This bot's market selection didn't load correctly. Please reselect a market and symbol in the Trade Parameters block.",
          'trade type':
            'This bot is missing a trade type. Please select a trade type in the Trade Parameters block before running.',
          'contract type':
            'This bot is missing a contract type. Please select a contract type in the Trade Parameters block before running.',
          'trade options':
            'This bot is missing trade options (stake, duration, etc.). Please set them in the Trade Parameters block before running.',
          duration:
            'This bot is missing a trade duration. Please set a duration in the Trade Parameters block before running.',
          'stake amount':
            'This bot is missing a stake amount. Please set a stake amount in the Trade Parameters block before running.',
        }

        showToast(
          'error',
          messages[field] ||
            `This bot is missing: ${field}. Please set it in the Trade Parameters block before running.`,
        )
      }
    },
    [showToast],
  )

  const performLoad = useCallback(
    async (xml: string, filename: string) => {
      const workspace = workspaceRef.current

      if (!workspace) return

      const result = await loadBotXmlSafely(
        workspace,
        xml,
        fetchSymbols,
        symbols.length > 0 ? symbols : null,
      )

      if (result.ok) {
        if (result.repaired) {
          showToast(
            'info',
            'This bot was updated to work with the latest builder — please double check its settings before running.',
          )
        } else {
          showToast('success', `Loaded "${filename}".`)
        }

        setWorkspaceModified(false)
        checkLoadedFields(workspace)
      } else {
        if (result.loaded) {
          // Bot loaded into workspace but has missing/incomplete trade params.
          // The blocks are visible — guide the user to fill in what's missing.
          setWorkspaceModified(false)
          checkLoadedFields(workspace)
        } else {
          showToast('error', result.reason)
        }
      }
    },
    [showToast, fetchSymbols, symbols, checkLoadedFields],
  )

  const handleFileLoad = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]

      if (!file) return

      const reader = new FileReader()

      reader.onload = (event) => {
        const xml = event.target?.result as string

        if (!xml) return

        if (!workspaceModified) {
          void performLoad(xml, file.name)
        } else {
          setConfirmLoad({
            xml,
            filename: file.name,
          })
        }
      }

      reader.readAsText(file)

      e.target.value = ''
    },
    [workspaceModified, performLoad],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      setDragOver(false)

      const file = e.dataTransfer.files?.[0]

      if (!file) return

      if (!file.name.toLowerCase().endsWith('.xml')) {
        showToast('error', 'Only .xml files are supported.')
        return
      }

      const reader = new FileReader()

      reader.onload = (event) => {
        const xml = event.target?.result as string

        if (!xml) return

        if (!workspaceModified) {
          void performLoad(xml, file.name)
        } else {
          setConfirmLoad({
            xml,
            filename: file.name,
          })
        }
      }

      reader.readAsText(file)
    },
    [workspaceModified, performLoad, showToast],
  )

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
      journalEndRef.current.scrollIntoView({
        behavior: 'smooth',
      })
    }
  }, [journal, resultsTab])



  useEffect(() => {
    if (!showMoreActions) return

    const handler = (e: MouseEvent) => {
      if (
        moreActionsRef.current &&
        !moreActionsRef.current.contains(e.target as Node)
      ) {
        setShowMoreActions(false)
      }
    }

    document.addEventListener('mousedown', handler)

    return () => {
      document.removeEventListener('mousedown', handler)
    }
  }, [showMoreActions])

  const zoomIn = useCallback(() => {
    const workspace = workspaceRef.current
    if (!workspace) return
    if (workspace.getScale() < 1.5) workspace.zoomCenter(1)
  }, [])

  const zoomOut = useCallback(() => {
    const workspace = workspaceRef.current
    if (!workspace) return
    if (workspace.getScale() > 0.5) workspace.zoomCenter(-1)
  }, [])

  const resetZoom = useCallback(() => {
    const workspace = workspaceRef.current
    if (!workspace) return
    workspace.setScale(0.95)
    Blockly.svgResize(workspace)
  }, [])

  const totalProfit = runStats.totalProfit
  const hasResults =
    hasRunOnce || trades.length > 0 || journal.length > 0

  const currency = account?.currency || 'USD'

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] lg:flex-row lg:h-[calc(100vh-105px)] lg:overflow-hidden lg:pb-0 bg-bg-primary overflow-hidden">
      {/* =========================================================
          DESKTOP / MAIN EDITOR
      ========================================================== */}

      <div className="flex flex-col min-w-0 shrink-0 lg:shrink lg:flex-1 lg:min-h-0">
        {/* Premium desktop header */}
        <header className="hidden lg:flex h-[68px] items-center gap-4 px-5 bg-bg-secondary border-b border-border-default shrink-0">
          {/* Brand */}
          <div className="flex items-center gap-3 min-w-[210px]">
            <div className="w-9 h-9 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center">
              <BlocksIcon className="w-[18px] h-[18px] text-brand-red" />
            </div>

            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.14em] text-text-muted font-semibold">
                Bot Builder
              </div>

              <input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="Bot name"
                className="block w-48 bg-transparent border-0 outline-none p-0 text-sm font-semibold text-text-primary placeholder:text-text-muted focus:ring-0"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-border-default" />

          {/* Validation */}
          <BotStatus
            isRunning={isRunning}
            marketsLoading={marketsLoading}
            marketsLoaded={marketsLoaded}
            isLoaded={isLoaded}
          />

          <div className="flex-1" />

          {/* Edit / Save / Load */}
          <div className="flex items-center gap-1">
            <ToolbarIconButton
              onClick={() => setShowEditBot(true)}
              icon={EditIcon}
              label="Edit"
            />

            <ToolbarIconButton
              onClick={handleDownload}
              icon={Save}
              label="Save"
            />

            <ToolbarIconButton
              onClick={handleLoadClick}
              icon={FolderOpen}
              label="Load"
            />

            <ToolbarIconButton
              onClick={handleReset}
              icon={RotateCcw}
              label="Reset"
            />
          </div>

          <div className="h-8 w-px bg-border-default" />

          {/* Stop */}
          {isRunning && (
            <button
              onClick={handleStop}
              className="h-10 px-4 rounded-xl bg-brand-red/10 border border-brand-red/25 text-brand-red text-sm font-semibold flex items-center gap-2 hover:bg-brand-red/15 transition-colors"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop
            </button>
          )}

          {/* Primary Run */}
          <button
            onClick={handleRun}
            disabled={
              isRunning ||
              marketsLoading ||
              !marketsLoaded
            }
            className="h-10 px-5 rounded-xl bg-brand-red text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-brand-red/10 hover:bg-brand-red-dim hover:shadow-brand-red/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {marketsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}

            {marketsLoading ? 'Loading markets' : 'Run bot'}
          </button>
        </header>

        {/* =========================================================
            MOBILE HEADER
        ========================================================== */}

        <header className="lg:hidden bg-bg-secondary border-b border-border-default shrink-0">
          <div className="flex items-center justify-between px-3 py-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center shrink-0">
                <BlocksIcon className="w-[17px] h-[17px] text-brand-red" />
              </div>

              <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted font-semibold">
                  Bot Builder
                </div>

                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="My Bot"
                  className="w-32 max-w-[42vw] bg-transparent border-0 outline-none p-0 text-sm font-semibold text-text-primary truncate focus:ring-0"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <MobileStatusDot
                isRunning={isRunning}
                marketsLoading={marketsLoading}
                marketsLoaded={marketsLoaded}
              />

              <div className="relative" ref={moreActionsRef}>
                <button
                  onClick={() => setShowMoreActions((v) => !v)}
                  aria-label="More actions"
                  className="w-9 h-9 rounded-xl bg-bg-tertiary border border-border-light flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

                {showMoreActions && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-bg-secondary border border-border-light shadow-2xl overflow-hidden z-[80]">
                    <div className="px-4 py-3 border-b border-border-default">
                      <div className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                        Bot
                      </div>
                      <div className="text-sm font-medium text-text-primary truncate mt-0.5">
                        {botName || 'My Bot'}
                      </div>
                    </div>

                    <MobileMenuItem
                      onClick={() => { setShowEditBot(true); setShowMoreActions(false) }}
                      icon={EditIcon}
                      label="Edit bot settings"
                    />

                    <MobileMenuItem
                      onClick={handleDownload}
                      icon={Save}
                      label="Save bot"
                    />

                    <MobileMenuItem
                      onClick={handleLoadClick}
                      icon={FolderOpen}
                      label="Load bot"
                    />

                    <MobileMenuItem
                      onClick={handleReset}
                      icon={RotateCcw}
                      label="Reset workspace"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 pb-2 shrink-0">
            {isRunning ? (
              <button
                onClick={handleStop}
                className="flex-1 h-10 rounded-xl bg-brand-red/10 border border-brand-red/25 text-brand-red text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
              >
                <Square className="w-4 h-4 fill-current" />
                Stop
              </button>
            ) : (
              <button
                onClick={handleRun}
                disabled={marketsLoading || !marketsLoaded}
                className="flex-1 h-10 rounded-xl bg-brand-red text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-brand-red/10 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {marketsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                {marketsLoading ? 'Loading...' : 'Run'}
              </button>
            )}

            <button
              onClick={() => setShowEditBot(true)}
              className="h-10 px-3 rounded-xl bg-bg-tertiary border border-border-light text-sm font-semibold flex items-center gap-1.5 transition-colors text-text-primary hover:bg-bg-hover"
            >
              <EditIcon className="w-4 h-4" />
              <span>Edit</span>
            </button>
          </div>
        </header>

        {/* Mobile status */}
        <div className="lg:hidden h-7 flex items-center justify-center border-b border-border-default bg-bg-tertiary shrink-0">
          <StatusIndicator
            isRunning={isRunning}
            marketsLoading={marketsLoading}
            marketsLoaded={marketsLoaded}
            isLoaded={isLoaded}
            compact
          />
        </div>

        {/* =========================================================
            WORKSPACE — shown on both mobile and desktop
        ========================================================== */}

        <div className="relative bg-bg-tertiary flex-1 min-h-0 pb-14 lg:pb-0">

          {/* Floating zoom controls */}
          <div className="absolute right-3 bottom-4 z-30 flex flex-col overflow-hidden rounded-xl border border-border-light bg-bg-secondary/95 shadow-xl backdrop-blur-sm">
            <WorkspaceControl
              onClick={zoomIn}
              icon={ZoomIn}
              label="Zoom in"
            />

            <div className="h-px bg-border-default" />

            <WorkspaceControl
              onClick={zoomOut}
              icon={ZoomOut}
              label="Zoom out"
            />

            <div className="h-px bg-border-default" />

            <WorkspaceControl
              onClick={resetZoom}
              icon={Maximize2}
              label="Reset zoom"
            />
          </div>

          {/* Drop overlay */}
          {dragOver && (
            <div className="absolute inset-0 z-[60] bg-brand-red/10 border-2 border-dashed border-brand-red rounded-2xl flex items-center justify-center pointer-events-none backdrop-blur-[2px]">
              <div className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl bg-bg-secondary border border-brand-red/30 shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-brand-red/10 flex items-center justify-center">
                  <Download className="w-6 h-6 text-brand-red" />
                </div>

                <div className="text-center">
                  <div className="text-sm font-bold text-text-primary">
                    Drop your bot here
                  </div>

                  <div className="text-xs text-text-secondary mt-1">
                    Release the .xml file to load it
                  </div>
                </div>
              </div>
            </div>
          )}

          <div
            ref={containerRef}
            id="blockly-container"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className="absolute inset-0 overflow-hidden"
          />


        </div>
      </div>

      {/* =========================================================
          DESKTOP RESULTS
      ========================================================== */}

      <aside className="hidden lg:flex lg:w-[400px] border-l border-border-default flex-shrink-0 flex-col bg-bg-secondary">
        <div className="h-12 px-4 flex items-center justify-between border-b border-border-default shrink-0">
          <div>
            <div className="text-sm font-bold text-text-primary">
              Run Results
            </div>

            <div className="text-[10px] text-text-muted mt-0.5">
              Live bot performance
            </div>
          </div>

          {hasResults && (
            <div
              className={`text-xs font-bold tabular px-2.5 py-1 rounded-lg ${
                totalProfit >= 0
                  ? 'bg-brand-green/10 text-brand-green'
                  : 'bg-brand-red/10 text-brand-red'
              }`}
            >
              {totalProfit >= 0 ? '+' : ''}
              {totalProfit.toFixed(2)} {currency}
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0">
          <RunResultsPanel
            tab={resultsTab}
            onTabChange={setResultsTab}
            runStats={runStats}
            journal={journal}
            journalEndRef={journalEndRef}
            trades={trades}
            currency={currency}
            onClearJournal={handleClearJournal}
            onResetStats={handleResetStats}
          />
        </div>
      </aside>

      {/* =========================================================
          MOBILE RESULTS — collapsible panel, blocks stay visible
      ========================================================== */}

      <div
        className={`lg:hidden fixed bottom-16 left-0 right-0 z-40 bg-bg-secondary border-t border-border-default shadow-2xl transition-all duration-300 ${
          mobilePanelExpanded ? 'h-[50vh]' : 'h-[48px]'
        }`
        }
      >
        <button
          onClick={() => setMobilePanelExpanded(!mobilePanelExpanded)}
          className="w-full h-12 px-4 flex items-center justify-between border-b border-border-default shrink-0"
        >
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-text-secondary" />
            <div className="text-sm font-bold text-text-primary">
              Bot Performance
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasResults && (
              <span
                className={`text-xs font-bold tabular px-2 py-1 rounded-lg ${
                  totalProfit >= 0
                    ? 'bg-brand-green/10 text-brand-green'
                    : 'bg-brand-red/10 text-brand-red'
                }`}
              >
                {totalProfit >= 0 ? '+' : ''}
                {totalProfit.toFixed(2)} {currency}
              </span>
            )}
            {mobilePanelExpanded ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronUp className="w-4 h-4 text-text-muted" />
            )}
          </div>
        </button>

        {mobilePanelExpanded && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <RunResultsPanel
              tab={resultsTab}
              onTabChange={setResultsTab}
              runStats={runStats}
              journal={journal}
              journalEndRef={journalEndRef}
              trades={trades}
              currency={currency}
              onClearJournal={handleClearJournal}
              onResetStats={handleResetStats}
            />
          </div>
        )}
      </div>

      {/* =========================================================
          LOAD CONFIRMATION
      ========================================================== */}

      {confirmLoad && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setConfirmLoad(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-bg-secondary border border-border-light shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="w-11 h-11 rounded-2xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center mb-4">
                <Upload className="w-5 h-5 text-brand-red" />
              </div>

              <h2 className="font-bold text-lg text-text-primary">
                Load bot?
              </h2>

              <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                Loading{' '}
                <span className="font-semibold text-text-primary">
                  {confirmLoad.filename}
                </span>{' '}
                will replace your current workspace.
              </p>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => {
                    void performLoad(
                      confirmLoad.xml,
                      confirmLoad.filename,
                    )
                    setConfirmLoad(null)
                  }}
                  className="flex-1 h-11 rounded-xl bg-brand-red text-white font-bold text-sm hover:bg-brand-red-dim transition-colors"
                >
                  Load & Replace
                </button>

                <button
                  onClick={() => setConfirmLoad(null)}
                  className="h-11 px-5 rounded-xl bg-bg-tertiary border border-border-light text-text-secondary text-sm font-semibold hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml"
        onChange={handleFileLoad}
        className="hidden"
      />

      {/* Edit Bot Modal */}
      {showEditBot && (
        <EditBotModal
          workspaceRef={workspaceRef}
          currency={currency}
          symbols={symbols}
          fetchSymbols={fetchSymbolsRef.current}
          onClose={() => setShowEditBot(false)}
          onSaved={() => {
            setShowEditBot(false)
            showToast('success', 'Bot settings updated.')
          }}
        />
      )}

      {/* Risk disclaimer — desktop only, below results */}
      <div className="hidden lg:block fixed bottom-0 left-0 right-0 z-30 px-4 py-2 bg-bg-secondary/80 backdrop-blur-sm border-t border-border-default">
        <div className="max-w-[1400px] mx-auto flex items-center gap-2">
          <TriangleAlert className="w-3.5 h-3.5 text-brand-amber shrink-0" />
          <p className="text-[10px] text-text-muted leading-relaxed">
            Deriv offers complex derivatives such as options and CFDs. You may lose some or all of the money you invest. Never trade with borrowed money or money you cannot afford to lose.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   STATUS
============================================================ */

function BotStatus({
  isRunning,
  marketsLoading,
  marketsLoaded,
  isLoaded,
}: {
  isRunning: boolean
  marketsLoading: boolean
  marketsLoaded: boolean
  isLoaded: boolean
}) {
  if (isRunning) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-red/10 border border-brand-red/20">
        <span className="w-2 h-2 rounded-full bg-brand-red pulse-glow" />

        <span className="text-xs font-semibold text-brand-red">
          BOT RUNNING
        </span>
      </div>
    )
  }

  if (marketsLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-tertiary border border-border-light">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-text-secondary" />

        <span className="text-xs font-medium text-text-secondary">
          Connecting to markets
        </span>
      </div>
    )
  }

  if (marketsLoaded) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-green/10 border border-brand-green/20">
        <CheckCircle2 className="w-3.5 h-3.5 text-brand-green" />

        <span className="text-xs font-semibold text-brand-green">
          READY TO RUN
        </span>
      </div>
    )
  }

  if (isLoaded) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-tertiary border border-border-light">
        <CircleAlert className="w-3.5 h-3.5 text-text-muted" />

        <span className="text-xs font-medium text-text-secondary">
          MARKET DATA PENDING
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-tertiary border border-border-light">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-text-secondary" />

      <span className="text-xs font-medium text-text-secondary">
        Initializing
      </span>
    </div>
  )
}

function MobileStatusDot({
  isRunning,
  marketsLoading,
  marketsLoaded,
}: {
  isRunning: boolean
  marketsLoading: boolean
  marketsLoaded: boolean
}) {
  if (isRunning) {
    return (
      <span
        title="Bot running"
        className="w-2.5 h-2.5 rounded-full bg-brand-red pulse-glow"
      />
    )
  }

  if (marketsLoading) {
    return (
      <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />
    )
  }

  if (marketsLoaded) {
    return (
      <span
        title="Ready"
        className="w-2.5 h-2.5 rounded-full bg-brand-green"
      />
    )
  }

  return (
    <span
      title="Waiting"
      className="w-2.5 h-2.5 rounded-full bg-text-muted"
    />
  )
}

function StatusIndicator({
  isRunning,
  marketsLoading,
  marketsLoaded,
  isLoaded,
  compact = false,
}: {
  isRunning: boolean
  marketsLoading: boolean
  marketsLoaded: boolean
  isLoaded: boolean
  compact?: boolean
}) {
  if (isRunning) {
    return (
      <>
        <span className="w-2 h-2 rounded-full bg-brand-red pulse-glow" />

        {!compact && (
          <span className="font-medium text-brand-red">
            Running
          </span>
        )}
      </>
    )
  }

  if (marketsLoading) {
    return (
      <>
        <Loader2 className="w-3 h-3 animate-spin" />

        {!compact && <span>Loading markets...</span>}
      </>
    )
  }

  if (marketsLoaded) {
    return (
      <>
        <span className="w-2 h-2 rounded-full bg-brand-green" />

        {!compact && (
          <span className="font-medium text-brand-green">
            Ready
          </span>
        )}
      </>
    )
  }

  if (isLoaded) {
    return (
      <>
        <span className="w-2 h-2 rounded-full bg-text-muted" />

        {!compact && <span>Waiting for markets</span>}
      </>
    )
  }

  return <Loader2 className="w-3 h-3 animate-spin" />
}

/* ============================================================
   BUTTONS
============================================================ */

function ToolbarIconButton({
  onClick,
  icon: Icon,
  label,
}: {
  onClick: () => void
  icon: typeof Save
  label: string
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="h-10 px-3 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-tertiary flex items-center gap-2 transition-colors"
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}

function WorkspaceControl({
  onClick,
  icon: Icon,
  label,
}: {
  onClick: () => void
  icon: typeof ZoomIn
  label: string
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}

function MobileMenuItem({
  onClick,
  icon: Icon,
  label,
}: {
  onClick: () => void
  icon: typeof Save
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-primary hover:bg-bg-tertiary transition-colors"
    >
      <Icon className="w-4 h-4 text-text-secondary" />
      <span>{label}</span>
    </button>
  )
}

/* ============================================================
   EDIT BOT MODAL — form-based parameter editor
   Lets users edit all bot settings without touching blocks.
============================================================ */

const TRADE_TYPE_CATEGORIES: Record<string, [string, string][]> = {
  updown: [['Rise/Fall', 'risefall'], ['Higher/Lower', 'higherlower']],
  touchnotouch: [['Touch/No Touch', 'touchnotouch']],
  inout: [['Ends In/Out', 'endsinout'], ['Stays In/Goes Out', 'staysinout']],
  digits: [['Matches/Differs', 'matchesdiffers'], ['Even/Odd', 'evenodd'], ['Over/Under', 'overunder']],
  multiplier: [['Multiplier Up/Down', 'multiplier']],
  accumulator: [['Accumulator', 'accumulator']],
}

const CONTRACT_TYPES_BY_TRADE_TYPE: Record<string, [string, string][]> = {
  risefall: [['Rise/Fall (both)', 'both'], ['Rise', 'CALL'], ['Fall', 'PUT']],
  higherlower: [['Higher/Lower (both)', 'both'], ['Higher', 'CALL'], ['Lower', 'PUT']],
  touchnotouch: [['Touch/No Touch (both)', 'both'], ['Touch', 'ONETOUCH'], ['No Touch', 'NOTOUCH']],
  endsinout: [['Ends Between/Outside (both)', 'both'], ['Ends Between', 'EXPIRYRANGE'], ['Ends Outside', 'EXPIRYMISS']],
  staysinout: [['Stays Between/Goes Outside (both)', 'both'], ['Stays Between', 'RANGE'], ['Goes Outside', 'UPORDOWN']],
  matchesdiffers: [['Matches/Differs (both)', 'both'], ['Matches', 'DIGITMATCH'], ['Differs', 'DIGITDIFF']],
  evenodd: [['Even/Odd (both)', 'both'], ['Even', 'DIGITEVEN'], ['Odd', 'DIGITODD']],
  overunder: [['Over/Under (both)', 'both'], ['Over', 'DIGITOVER'], ['Under', 'DIGITUNDER']],
  multiplier: [['Multiplier Up/Down (both)', 'both'], ['Up', 'MULTUP'], ['Down', 'MULTDOWN']],
  accumulator: [['Accumulator (both)', 'both'], ['Accumulate', 'ACCU']],
}

const CANDLE_INTERVALS: [string, string][] = [
  ['1 minute', '60'], ['2 minutes', '120'], ['3 minutes', '180'],
  ['5 minutes', '300'], ['10 minutes', '600'], ['15 minutes', '900'],
  ['30 minutes', '1800'], ['1 hour', '3600'], ['2 hours', '7200'],
  ['4 hours', '14400'], ['8 hours', '28800'], ['1 day', '86400'],
]

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD']

function EditBotModal({
  workspaceRef,
  currency,
  symbols,
  fetchSymbols,
  onClose,
  onSaved,
}: {
  workspaceRef: React.RefObject<Blockly.WorkspaceSvg | null>
  currency: string
  symbols: import('../hooks/useMarketData').RawSymbol[]
  fetchSymbols: () => Promise<import('../hooks/useMarketData').RawSymbol[] | null>
  onClose: () => void
  onSaved: () => void
}) {
  const [stake, setStake] = useState('1')
  const [duration, setDuration] = useState('5')
  const [durationUnit, setDurationUnit] = useState('t')
  const [prediction, setPrediction] = useState('5')
  const [barrier, setBarrier] = useState('')
  const [secondBarrier, setSecondBarrier] = useState('')
  const [restartOnError, setRestartOnError] = useState(true)
  const [restartBuySell, setRestartBuySell] = useState(false)
  const [symbol, setSymbol] = useState('')
  const [market, setMarket] = useState('')
  const [submarket, setSubmarket] = useState('')
  const [tradeTypeCategory, setTradeTypeCategory] = useState('')
  const [tradeType, setTradeType] = useState('')
  const [contractType, setContractType] = useState('')
  const [candleInterval, setCandleInterval] = useState('60')
  const [selectedCurrency, setSelectedCurrency] = useState(currency || 'USD')
  const [loaded, setLoaded] = useState(false)
  const [localSymbols, setLocalSymbols] = useState<import('../hooks/useMarketData').RawSymbol[]>(symbols)

  useEffect(() => {
    if (symbols.length > 0) {
      setLocalSymbols(symbols)
      return
    }
    let cancelled = false
    fetchSymbols().then((raw) => {
      if (!cancelled && raw && raw.length > 0) {
        setLocalSymbols(raw)
      }
    })
    return () => { cancelled = true }
  }, [symbols, fetchSymbols])

  // When symbols arrive (possibly async), auto-correct the market/submarket/symbol
  // cascade so the dropdowns show valid selections — but only after the initial
  // workspace values have been loaded, so we don't clobber the bot's saved market
  // (e.g. synthetic_index) before it's been read from the workspace.
  useEffect(() => {
    if (localSymbols.length === 0 || !loaded) return

    const validMarkets = new Set(localSymbols.map((s) => s.market))
    const m = validMarkets.has(market) ? market : Array.from(validMarkets)[0] || ''

    const subs = localSymbols.filter((s) => s.market === m)
    const validSubs = new Set(subs.map((s) => s.submarket))
    const sm = validSubs.has(submarket) ? submarket : subs[0]?.submarket || ''

    const syms = subs.filter((s) => s.submarket === sm)
    const validSyms = new Set(syms.map((s) => s.underlying_symbol || s.symbol || ''))
    const sym = validSyms.has(symbol) ? symbol : (syms[0]?.underlying_symbol || syms[0]?.symbol || '')

    if (m !== market) setMarket(m)
    if (sm !== submarket) setSubmarket(sm)
    if (sym !== symbol) setSymbol(sym)
  }, [localSymbols, loaded])

  useEffect(() => {
    const workspace = workspaceRef.current
    if (!workspace) return

    const blocks = workspace.getAllBlocks(false)

    const marketBlock = blocks.find((b) => b.type === 'trade_definition_market')
    const tradeTypeBlock = blocks.find((b) => b.type === 'trade_definition_tradetype')
    const contractBlock = blocks.find((b) => b.type === 'trade_definition_contracttype')
    const candleBlock = blocks.find((b) => b.type === 'trade_definition_candleinterval')
    const restartBuySellBlock = blocks.find((b) => b.type === 'trade_definition_restartbuysell')
    const restartBlock = blocks.find((b) => b.type === 'trade_definition_restartonerror')
    const optionsBlock = blocks.find((b) => b.type === 'trade_definition_tradeoptions')

    if (marketBlock) {
      setMarket(String(marketBlock.getFieldValue('MARKET_LIST') || ''))
      setSubmarket(String(marketBlock.getFieldValue('SUBMARKET_LIST') || ''))
      setSymbol(String(marketBlock.getFieldValue('SYMBOL_LIST') || ''))
    }

    if (tradeTypeBlock) {
      setTradeTypeCategory(String(tradeTypeBlock.getFieldValue('TRADETYPECAT_LIST') || ''))
      setTradeType(String(tradeTypeBlock.getFieldValue('TRADETYPE_LIST') || ''))
    }

    if (contractBlock) {
      setContractType(String(contractBlock.getFieldValue('TYPE_LIST') || ''))
    }

    if (candleBlock) {
      setCandleInterval(String(candleBlock.getFieldValue('CANDLEINTERVAL_LIST') || '60'))
    }

    if (restartBuySellBlock) {
      const val = restartBuySellBlock.getFieldValue('TIME_MACHINE_ENABLED')
      setRestartBuySell(val === true || val === 'true' || val === 'TRUE')
    }

    if (restartBlock) {
      const val = restartBlock.getFieldValue('RESTARTONERROR')
      setRestartOnError(val === true || val === 'true' || val === 'TRUE')
    }

    if (optionsBlock) {
      setDurationUnit(String(optionsBlock.getFieldValue('DURATIONTYPE_LIST') || 't'))
      setSelectedCurrency(String(optionsBlock.getFieldValue('CURRENCY_LIST') || currency || 'USD'))

      const durBlock = optionsBlock.getInputTargetBlock('DURATION')
      if (durBlock) {
        const val = durBlock.getFieldValue('NUM')
        if (val) setDuration(String(val))
      }

      const amtBlock = optionsBlock.getInputTargetBlock('AMOUNT')
      if (amtBlock) {
        const val = amtBlock.getFieldValue('NUM')
        if (val) setStake(String(val))
      }

      const predBlock = optionsBlock.getInputTargetBlock('PREDICTION')
      if (predBlock) {
        const val = predBlock.getFieldValue('NUM')
        if (val) setPrediction(String(val))
      }

      const barBlock = optionsBlock.getInputTargetBlock('BARRIER')
      if (barBlock) {
        const val = barBlock.getFieldValue('NUM')
        if (val) setBarrier(String(val))
      }

      const bar2Block = optionsBlock.getInputTargetBlock('SECOND_BARRIER')
      if (bar2Block) {
        const val = bar2Block.getFieldValue('NUM')
        if (val) setSecondBarrier(String(val))
      }
    }

    setLoaded(true)
  }, [workspaceRef, currency])

  const handleSave = () => {
    const workspace = workspaceRef.current
    if (!workspace) return

    const blocks = workspace.getAllBlocks(false)

    const marketBlock = blocks.find((b) => b.type === 'trade_definition_market')
    if (marketBlock) {
      marketBlock.getField('MARKET_LIST')?.setValue(market)
      marketBlock.getField('SUBMARKET_LIST')?.setValue(submarket)
      marketBlock.getField('SYMBOL_LIST')?.setValue(symbol)
    }

    const tradeTypeBlock = blocks.find((b) => b.type === 'trade_definition_tradetype')
    if (tradeTypeBlock) {
      tradeTypeBlock.getField('TRADETYPECAT_LIST')?.setValue(tradeTypeCategory)
      tradeTypeBlock.getField('TRADETYPE_LIST')?.setValue(tradeType)
    }

    const contractBlock = blocks.find((b) => b.type === 'trade_definition_contracttype')
    if (contractBlock) {
      contractBlock.getField('TYPE_LIST')?.setValue(contractType)
    }

    const candleBlock = blocks.find((b) => b.type === 'trade_definition_candleinterval')
    if (candleBlock) {
      candleBlock.getField('CANDLEINTERVAL_LIST')?.setValue(candleInterval)
    }

    const restartBuySellBlock = blocks.find((b) => b.type === 'trade_definition_restartbuysell')
    if (restartBuySellBlock) {
      restartBuySellBlock.getField('TIME_MACHINE_ENABLED')?.setValue(restartBuySell ? 'TRUE' : 'FALSE')
    }

    const restartBlock = blocks.find((b) => b.type === 'trade_definition_restartonerror')
    if (restartBlock) {
      restartBlock.getField('RESTARTONERROR')?.setValue(restartOnError ? 'TRUE' : 'FALSE')
    }

    const optionsBlock = blocks.find((b) => b.type === 'trade_definition_tradeoptions')
    if (optionsBlock) {
      const durBlock = optionsBlock.getInputTargetBlock('DURATION')
      durBlock?.getField('NUM')?.setValue(duration)

      const amtBlock = optionsBlock.getInputTargetBlock('AMOUNT')
      amtBlock?.getField('NUM')?.setValue(stake)

      const predBlock = optionsBlock.getInputTargetBlock('PREDICTION')
      predBlock?.getField('NUM')?.setValue(prediction)

      const barBlock = optionsBlock.getInputTargetBlock('BARRIER')
      barBlock?.getField('NUM')?.setValue(barrier)

      const bar2Block = optionsBlock.getInputTargetBlock('SECOND_BARRIER')
      bar2Block?.getField('NUM')?.setValue(secondBarrier)

      optionsBlock.getField('DURATIONTYPE_LIST')?.setValue(durationUnit)
      optionsBlock.getField('CURRENCY_LIST')?.setValue(selectedCurrency)
    }

    onSaved()
  }

  const durationUnitLabels: Record<string, string> = {
    t: 'ticks', s: 'seconds', m: 'minutes', h: 'hours',
  }

  const tradeTypeOptions = tradeTypeCategory ? TRADE_TYPE_CATEGORIES[tradeTypeCategory] || [] : []
  const contractTypeOptions = tradeType ? CONTRACT_TYPES_BY_TRADE_TYPE[tradeType] || [] : []

  const marketOptions: [string, string][] = (() => {
    const map = new Map<string, string>()
    for (const s of localSymbols) {
      if (!s.market) continue
      if (!map.has(s.market)) {
        map.set(s.market, s.market_display_name || s.market)
      }
    }
    return Array.from(map.entries()).map(([value, label]) => [label, value] as [string, string])
  })()

  const submarketOptions: [string, string][] = (() => {
    const map = new Map<string, string>()
    for (const s of localSymbols) {
      if (s.market !== market || !s.submarket) continue
      if (!map.has(s.submarket)) {
        map.set(s.submarket, s.submarket_display_name || s.submarket)
      }
    }
    return Array.from(map.entries()).map(([value, label]) => [label, value] as [string, string])
  })()

  const symbolOptions: [string, string][] = (() => {
    const result: [string, string][] = []
    const seen = new Set<string>()
    for (const s of localSymbols) {
      if (s.submarket !== submarket) continue
      const sym = s.underlying_symbol || s.symbol || ''
      if (!sym || seen.has(sym)) continue
      seen.add(sym)
      result.push([s.underlying_symbol_name || s.display_name || sym, sym])
    }
    return result
  })()

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-bg-secondary border border-border-light shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-bg-secondary/95 backdrop-blur-sm px-5 py-4 border-b border-border-default flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center">
              <EditIcon className="w-4 h-4 text-brand-red" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-text-muted font-bold">
                Edit Bot Settings
              </div>
              <h2 className="font-bold text-base text-text-primary mt-0.5">
                Parameter editor
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-bg-tertiary border border-border-light flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!loaded ? (
          <div className="p-8 text-center text-text-muted text-sm">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
            Loading bot settings...
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Market */}
            <div className="rounded-xl bg-bg-tertiary border border-border-light p-4 space-y-3">
              <div className="text-xs font-bold text-text-secondary uppercase tracking-wider">Market</div>
              <div>
                <label className="block text-[11px] font-medium text-text-muted mb-1">Market</label>
                <select
                  value={market}
                  onChange={(e) => {
                    setMarket(e.target.value)
                    const subs = localSymbols.filter((s) => s.market === e.target.value)
                    const firstSub = subs[0]?.submarket || ''
                    setSubmarket(firstSub)
                    const firstSym = subs.find((s) => s.submarket === firstSub)
                    setSymbol(firstSym?.underlying_symbol || firstSym?.symbol || '')
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-light text-sm focus:outline-none focus:border-brand-red transition-colors"
                >
                  {marketOptions.length === 0 && <option value="">Loading markets...</option>}
                  {marketOptions.map(([label, value]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-muted mb-1">Submarket</label>
                <select
                  value={submarket}
                  onChange={(e) => {
                    setSubmarket(e.target.value)
                    const firstSym = localSymbols.find((s) => s.submarket === e.target.value)
                    setSymbol(firstSym?.underlying_symbol || firstSym?.symbol || '')
                  }}
                  disabled={!market}
                  className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-light text-sm focus:outline-none focus:border-brand-red transition-colors disabled:opacity-50"
                >
                  {submarketOptions.length === 0 && <option value="">{submarket || 'Select market first'}</option>}
                  {submarketOptions.map(([label, value]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-muted mb-1">Symbol</label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  disabled={!submarket}
                  className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-light text-sm focus:outline-none focus:border-brand-red transition-colors disabled:opacity-50"
                >
                  {symbolOptions.length === 0 && <option value="">{symbol || 'Select submarket first'}</option>}
                  {symbolOptions.map(([label, value]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Trade type */}
            <div className="rounded-xl bg-bg-tertiary border border-border-light p-4 space-y-3">
              <div className="text-xs font-bold text-text-secondary uppercase tracking-wider">Trade Type</div>
              <div>
                <label className="block text-[11px] font-medium text-text-muted mb-1">Category</label>
                <select
                  value={tradeTypeCategory}
                  onChange={(e) => {
                    setTradeTypeCategory(e.target.value)
                    const opts = TRADE_TYPE_CATEGORIES[e.target.value] || []
                    if (opts.length > 0) setTradeType(opts[0][1])
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-light text-sm focus:outline-none focus:border-brand-red transition-colors"
                >
                  <option value="">Select category</option>
                  {Object.entries(TRADE_TYPE_CATEGORIES).map(([key, opts]) => (
                    <option key={key} value={key}>{opts[0][0].split('/')[0]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-muted mb-1">Trade type</label>
                <select
                  value={tradeType}
                  onChange={(e) => {
                    setTradeType(e.target.value)
                    const opts = CONTRACT_TYPES_BY_TRADE_TYPE[e.target.value] || []
                    if (opts.length > 0) setContractType(opts[0][1])
                  }}
                  disabled={!tradeTypeOptions.length}
                  className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-light text-sm focus:outline-none focus:border-brand-red transition-colors disabled:opacity-50"
                >
                  <option value="">Select type</option>
                  {tradeTypeOptions.map(([label, value]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-muted mb-1">Contract type</label>
                <select
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  disabled={!contractTypeOptions.length}
                  className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-light text-sm focus:outline-none focus:border-brand-red transition-colors disabled:opacity-50"
                >
                  <option value="">Select contract</option>
                  {contractTypeOptions.map(([label, value]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Trade parameters */}
            <div className="rounded-xl bg-bg-tertiary border border-border-light p-4 space-y-3">
              <div className="text-xs font-bold text-text-secondary uppercase tracking-wider">Trade Parameters</div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-text-muted mb-1">Stake</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="number"
                      value={stake}
                      onChange={(e) => setStake(e.target.value)}
                      min="0.35"
                      step="0.01"
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-bg-secondary border border-border-light text-sm tabular focus:outline-none focus:border-brand-red transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-text-muted mb-1">Currency</label>
                  <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-light text-sm focus:outline-none focus:border-brand-red transition-colors"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-text-muted mb-1">Duration</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="1"
                    className="flex-1 px-3 py-2 rounded-lg bg-bg-secondary border border-border-light text-sm tabular focus:outline-none focus:border-brand-red transition-colors"
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-bg-secondary border border-border-light text-sm focus:outline-none focus:border-brand-red transition-colors"
                  >
                    <option value="t">ticks</option>
                    <option value="s">seconds</option>
                    <option value="m">minutes</option>
                    <option value="h">hours</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-text-muted mb-1">Prediction / Barrier digit (0-9)</label>
                <input
                  type="number"
                  value={prediction}
                  onChange={(e) => setPrediction(e.target.value)}
                  min="0"
                  max="9"
                  className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-light text-sm tabular focus:outline-none focus:border-brand-red transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-text-muted mb-1">Barrier</label>
                  <input
                    type="text"
                    value={barrier}
                    onChange={(e) => setBarrier(e.target.value)}
                    placeholder="e.g. +0.50"
                    className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-light text-sm tabular focus:outline-none focus:border-brand-red transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-text-muted mb-1">Second barrier</label>
                  <input
                    type="text"
                    value={secondBarrier}
                    onChange={(e) => setSecondBarrier(e.target.value)}
                    placeholder="e.g. -0.50"
                    className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-light text-sm tabular focus:outline-none focus:border-brand-red transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Chart settings */}
            <div className="rounded-xl bg-bg-tertiary border border-border-light p-4 space-y-3">
              <div className="text-xs font-bold text-text-secondary uppercase tracking-wider">Chart Settings</div>
              <div>
                <label className="block text-[11px] font-medium text-text-muted mb-1">Candle interval</label>
                <select
                  value={candleInterval}
                  onChange={(e) => setCandleInterval(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-light text-sm focus:outline-none focus:border-brand-red transition-colors"
                >
                  {CANDLE_INTERVALS.map(([label, value]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bot behavior */}
            <div className="rounded-xl bg-bg-tertiary border border-border-light p-4 space-y-3">
              <div className="text-xs font-bold text-text-secondary uppercase tracking-wider">Bot Behavior</div>

              <button
                onClick={() => setRestartBuySell(!restartBuySell)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-5 rounded-full transition-colors relative ${restartBuySell ? 'bg-brand-red' : 'bg-bg-hover'}`}>
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${restartBuySell ? 'translate-x-4' : 'translate-x-0.5'}`}
                    />
                  </div>
                  <span className="text-sm font-semibold text-text-primary">Restart buy/sell on error</span>
                </div>
                <span className="text-xs text-text-muted">
                  {restartBuySell ? 'Enabled' : 'Disabled'}
                </span>
              </button>

              <button
                onClick={() => setRestartOnError(!restartOnError)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-5 rounded-full transition-colors relative ${restartOnError ? 'bg-brand-red' : 'bg-bg-hover'}`}>
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${restartOnError ? 'translate-x-4' : 'translate-x-0.5'}`}
                    />
                  </div>
                  <span className="text-sm font-semibold text-text-primary">Restart on error</span>
                </div>
                <span className="text-xs text-text-muted">
                  {restartOnError ? 'Enabled' : 'Disabled'}
                </span>
              </button>
            </div>

            {/* Summary */}
            <div className="rounded-xl bg-brand-blue/5 border border-brand-blue/20 px-3 py-2.5">
              <p className="text-xs text-text-secondary leading-relaxed">
                The bot will trade <span className="font-semibold text-text-primary">{contractType || '—'}</span> on{' '}
                <span className="font-semibold text-text-primary">{symbol || '—'}</span> with a stake of{' '}
                <span className="font-semibold text-text-primary">{stake} {selectedCurrency}</span> for{' '}
                <span className="font-semibold text-text-primary">{duration} {durationUnitLabels[durationUnit] || 'ticks'}</span>.
              </p>
            </div>

            {/* Risk disclaimer */}
            <div className="rounded-xl bg-brand-amber/8 border border-brand-amber/25 px-4 py-3">
              <div className="flex items-center gap-2.5 mb-2">
                <TriangleAlert className="w-4 h-4 text-brand-amber shrink-0" />
                <span className="text-xs font-bold text-brand-amber">Risk Disclaimer</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Deriv offers complex derivatives, such as options and contracts for difference (&ldquo;CFDs&rdquo;). These products may not be suitable for all clients, and trading them puts you at risk. Please make sure that you understand the following risks before trading Deriv products:
              </p>
              <ul className="mt-2 space-y-1 text-[11px] text-text-secondary leading-relaxed list-disc pl-4">
                <li>You may lose some or all of the money you invest in the trade.</li>
                <li>If your trade involves currency conversion, exchange rates will affect your profit and loss.</li>
                <li>You should never trade with borrowed money or with money that you cannot afford to lose.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-bg-secondary/95 backdrop-blur-sm px-5 py-4 border-t border-border-default flex items-center gap-3 z-10">
          <button
            onClick={handleSave}
            disabled={!loaded}
            className="flex-1 h-11 rounded-xl bg-brand-red text-white font-bold text-sm hover:bg-brand-red-dim transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save Changes
          </button>
          <button
            onClick={onClose}
            className="h-11 px-5 rounded-xl bg-bg-tertiary border border-border-light text-text-secondary text-sm font-semibold hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}