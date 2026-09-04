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
import { Play, Square, RotateCcw, Download, Upload, Loader as Loader2, ChevronDown, Blocks as BlocksIcon, Activity, X, Save, FolderOpen, ZoomIn, ZoomOut, Maximize2, MoveHorizontal as MoreHorizontal, CircleCheck as CheckCircle2, CircleAlert, FileCode as FileCode2 } from 'lucide-react'

export default function BotBuilder() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const moreActionsRef = useRef<HTMLDivElement | null>(null)

  const { showToast } = useToast()
  const { account } = useAuth()
  const { fetchSymbols, symbols } = useMarketData()

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
  const [toolboxOpen, setToolboxOpen] = useState(false)
  const [showMoreActions, setShowMoreActions] = useState(false)

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

    if (pendingXml) {
      sessionStorage.removeItem('pending_bot_xml')
      pendingXmlRef.current = pendingXml
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



  const toggleToolbox = useCallback(() => {
    setToolboxOpen((previous) => {
      const next = !previous

      requestAnimationFrame(() => {
        if (workspaceRef.current) {
          Blockly.svgResize(workspaceRef.current)
        }
      })

      return next
    })
  }, [])

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

    workspace.zoomCenter(1)
  }, [])

  const zoomOut = useCallback(() => {
    const workspace = workspaceRef.current

    if (!workspace) return

    workspace.zoomCenter(-1)
  }, [])

  const resetZoom = useCallback(() => {
    const workspace = workspaceRef.current

    if (!workspace) return

    workspace.setScale(1)
    Blockly.svgResize(workspace)
  }, [])

  const totalProfit = runStats.totalProfit
  const hasResults =
    hasRunOnce || trades.length > 0 || journal.length > 0

  const currency = account?.currency || 'USD'

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-68px)] lg:overflow-hidden bg-bg-primary">
      {/* =========================================================
          DESKTOP / MAIN EDITOR
      ========================================================== */}

      <div className="flex-1 flex flex-col min-w-0 lg:min-h-0">
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

          {/* Save / Load */}
          <div className="flex items-center gap-1">
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
          <div className="flex items-center justify-between px-3 py-2.5">
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

          <div className="flex items-center gap-1.5 px-3 pb-2.5">
            {isRunning ? (
              <button
                onClick={handleStop}
                className="flex-1 h-10 rounded-xl bg-brand-red/10 border border-brand-red/25 text-brand-red text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Square className="w-4 h-4 fill-current" />
                Stop bot
              </button>
            ) : (
              <button
                onClick={handleRun}
                disabled={marketsLoading || !marketsLoaded}
                className="flex-1 h-10 rounded-xl bg-brand-red text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-red/10 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {marketsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}

                {marketsLoading ? 'Loading markets' : 'Run bot'}
              </button>
            )}

            <button
              onClick={toggleToolbox}
              className={`h-10 px-3.5 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all ${
                toolboxOpen
                  ? 'bg-brand-red text-white border-brand-red'
                  : 'bg-bg-tertiary text-text-primary border-border-light'
              }`}
            >
              {toolboxOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <BlocksIcon className="w-4 h-4" />
              )}

              <span>Blocks</span>
            </button>
          </div>
        </header>

        {/* Mobile status */}
        <div className="lg:hidden h-8 flex items-center justify-center border-b border-border-default bg-bg-tertiary">
          <StatusIndicator
            isRunning={isRunning}
            marketsLoading={marketsLoading}
            marketsLoaded={marketsLoaded}
            isLoaded={isLoaded}
            compact
          />
        </div>

        {/* =========================================================
            WORKSPACE
        ========================================================== */}

        <div className="relative bg-bg-tertiary h-[50vh] lg:h-auto lg:flex-1 lg:min-h-0">

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
            className={`absolute inset-0 overflow-hidden ${
              toolboxOpen ? 'toolbox-open' : ''
            }`}
          />

          {/* Workspace title strip — desktop only */}
          <div className="hidden lg:block absolute top-3 left-3 z-20 pointer-events-none">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-bg-secondary/90 border border-border-light shadow-sm backdrop-blur-sm">
              <FileCode2 className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-[11px] font-medium text-text-secondary">
                Strategy workspace
              </span>
            </div>
          </div>
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
          MOBILE RESULTS
      ========================================================== */}

      <div className="lg:hidden border-t border-border-default bg-bg-secondary shrink-0">
        <button
          onClick={() => setShowResultsMobile((v) => !v)}
          className="w-full min-h-[58px] px-4 flex items-center justify-between active:bg-bg-tertiary transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-bg-tertiary border border-border-light flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-text-secondary" />
            </div>

            <div className="text-left min-w-0">
              <div className="text-sm font-semibold text-text-primary">
                Run Results
              </div>

              <div className="text-[10px] text-text-muted">
                {hasResults ? 'Latest bot performance' : 'No run data yet'}
              </div>
            </div>

            {hasResults && (
              <span
                className={`text-xs font-bold tabular px-2 py-1 rounded-lg shrink-0 ${
                  totalProfit >= 0
                    ? 'bg-brand-green/10 text-brand-green'
                    : 'bg-brand-red/10 text-brand-red'
                }`}
              >
                {totalProfit >= 0 ? '+' : ''}
                {totalProfit.toFixed(2)} {currency}
              </span>
            )}
          </div>

          <ChevronDown
            className={`w-5 h-5 text-text-secondary transition-transform ${
              showResultsMobile ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showResultsMobile && (
          <div className="h-[45vh] border-t border-border-default">
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