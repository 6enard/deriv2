import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScanner } from '../hooks/useScanner'
import { useToast } from '../components/Toast'
import { buildBotXmlFromSignal, type ScanResult, type DigitSignal, type BotConfig } from '../lib/scanner'
import { Radar, Loader as Loader2, RefreshCw, TrendingUp, Hash, Bot, Activity, Target, CircleAlert as AlertCircle, Sparkles, ChevronDown, ChevronUp, Brain, Zap, Trophy, X, Settings as SettingsIcon, Play } from 'lucide-react'

const TICK_OPTIONS = [100, 200, 300, 500]

interface PendingBot {
  result: ScanResult
  signal: DigitSignal
}

export default function Scanner() {
  const { results, scanning, progress, error, hasScanned, runScan, tickCount, setTickCount } = useScanner()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const autoScanTriggered = useRef(false)
  const [pendingBot, setPendingBot] = useState<PendingBot | null>(null)

  useEffect(() => {
    if (autoScanTriggered.current) return
    autoScanTriggered.current = true
    runScan()
  }, [runScan])

  useEffect(() => {
    if (results.length > 0 && !expandedId) {
      setExpandedId(results[0].symbol)
    }
  }, [results, expandedId])

  const handleTradeManually = (result: ScanResult, signal: DigitSignal) => {
    const rec = {
      symbol: result.symbol,
      display_name: result.display_name,
      contractType: signal.contractType,
      digit: signal.digit,
      displayName: signal.displayName,
    }
    sessionStorage.setItem('scan_recommendation', JSON.stringify(rec))
    navigate('/trade')
  }

  const handleLoadBot = (result: ScanResult, signal: DigitSignal) => {
    setPendingBot({ result, signal })
  }

  const confirmLoadBot = (config: BotConfig) => {
    if (!pendingBot) return
    const xml = buildBotXmlFromSignal(pendingBot.result, pendingBot.signal, config)
    sessionStorage.setItem('pending_bot_xml', xml)
    sessionStorage.setItem('pending_bot_autorun', 'true')
    showToast('success', `Bot loaded with ${pendingBot.signal.displayName} on ${pendingBot.result.display_name}.`)
    setPendingBot(null)
    navigate('/bot-builder')
  }

  const topResult = results[0] || null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-brand-red" />
            AI Scanner
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Scans volatility markets for digit-based trading opportunities using historical tick analysis.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Tick count selector */}
          <div className="flex items-center gap-1 rounded-xl bg-bg-secondary border border-border-light p-1">
            {TICK_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setTickCount(opt)}
                disabled={scanning}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                  tickCount === opt
                    ? 'bg-brand-red text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                }`}
              >
                {opt}
              </button>
            ))}
            <span className="px-1.5 text-[10px] text-text-muted font-medium">ticks</span>
          </div>
          <button
            onClick={() => runScan()}
            disabled={scanning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-red text-white font-semibold text-sm hover:bg-brand-red-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
            {scanning ? 'Scanning...' : hasScanned ? 'Rescan' : 'Start Scan'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-brand-red/10 border border-brand-red/30 rounded-xl px-4 py-3 text-sm text-brand-red mb-6 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span>{error}</span>
            <button onClick={() => runScan()} className="block mt-2 text-xs font-bold underline hover:no-underline">
              Retry Scan
            </button>
          </div>
        </div>
      )}

      {/* Scanning state */}
      {scanning && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-brand-red/20 blur-xl pulse-glow" />
            <div className="relative w-16 h-16 rounded-full bg-brand-red/10 border border-brand-red/20 flex items-center justify-center">
              <Radar className="w-8 h-8 text-brand-red animate-spin" style={{ animationDuration: '2s' }} />
            </div>
          </div>
          <p className="mt-6 text-sm font-semibold text-text-primary">Analyzing volatility markets</p>
          <p className="mt-1 text-xs text-text-muted">Fetching {tickCount} ticks per market and computing digit frequency statistics</p>
          {progress > 0 && (
            <div className="mt-4 w-48 max-w-full">
              <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                <div
                  className="h-full bg-brand-red rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-[10px] text-text-muted mt-1.5 tabular">{progress}%</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!scanning && !hasScanned && !error && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center mb-5">
            <Radar className="w-8 h-8 text-brand-red" />
          </div>
          <p className="text-lg font-semibold text-text-primary mb-1">Ready to scan</p>
          <p className="text-sm text-text-secondary text-center max-w-md">
            Click "Start Scan" to analyze all volatility markets. The scanner fetches historical tick data
            and ranks digit-based trading opportunities by statistical edge.
          </p>
        </div>
      )}

      {/* No results */}
      {!scanning && hasScanned && !error && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="w-12 h-12 text-text-muted mb-4" />
          <p className="text-sm text-text-secondary">Unable to fetch market data this time. Please try again.</p>
          <button onClick={() => runScan()} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-red text-white text-sm font-medium hover:bg-brand-red-dim transition-colors">
            <RefreshCw className="w-4 h-4" />
            Retry Scan
          </button>
        </div>
      )}

      {/* Best market highlight */}
      {!scanning && topResult && (
        <div className="rounded-2xl border border-brand-red/20 bg-brand-red/[0.04] p-5 mb-6 fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-brand-red" />
            <span className="text-xs font-bold uppercase tracking-wider text-brand-red">Best market to trade · {topResult.overallScore}% win probability</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xl font-bold text-text-primary">{topResult.display_name}</span>
                {topResult.bestSignal && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-brand-red/15 text-brand-red">
                    {topResult.bestSignal.displayName}
                  </span>
                )}
                <span className="text-2xl font-bold tabular text-brand-red">{topResult.overallScore}%</span>
                <span className="text-[10px] uppercase tracking-wider text-text-muted">win prob.</span>
              </div>
              {topResult.bestSignal && (
                <p className="text-xs text-text-secondary mt-2 leading-relaxed">{topResult.bestSignal.rationale}</p>
              )}
            </div>
            {topResult.bestSignal && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleTradeManually(topResult, topResult.bestSignal!)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-green text-bg-primary text-sm font-bold hover:bg-brand-green-dim transition-colors"
                >
                  <TrendingUp className="w-4 h-4" />
                  Trade Manually
                </button>
                <button
                  onClick={() => handleLoadBot(topResult, topResult.bestSignal!)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm font-bold text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <Bot className="w-4 h-4" />
                  Load as Bot
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {!scanning && results.length > 0 && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              {results.length} markets scanned
            </span>
            <span className="w-1 h-1 rounded-full bg-border-light" />
            <span className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              {results.filter((r) => r.signals.length > 0).length} with signals
            </span>
            <span className="w-1 h-1 rounded-full bg-border-light" />
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Ranked by win probability
            </span>
          </div>

          {/* Result cards */}
          {results.map((result, index) => {
            const hasSignals = result.signals.length > 0
            const isExpanded = expandedId === result.symbol
            const scoreColor = result.overallScore >= 60 ? 'text-brand-green' : result.overallScore >= 30 ? 'text-brand-amber' : 'text-text-muted'
            const scoreBg = result.overallScore >= 60 ? 'bg-brand-green/10 border-brand-green/20' : result.overallScore >= 30 ? 'bg-brand-amber/10 border-brand-amber/20' : 'bg-bg-tertiary border-border-light'

            return (
              <div
                key={result.symbol}
                className={`rounded-2xl border ${hasSignals ? scoreBg : 'bg-bg-secondary border-border-default'} overflow-hidden transition-all`}
              >
                {/* Main row */}
                <div
                  className="flex items-center gap-4 px-4 py-4 cursor-pointer hover:bg-bg-tertiary/40 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : result.symbol)}
                >
                  {/* Rank */}
                  <div className="shrink-0 w-8 text-center">
                    <span className="text-lg font-bold tabular text-text-muted">{index + 1}</span>
                  </div>

                  {/* Symbol info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary truncate">{result.display_name}</span>
                      {hasSignals && result.bestSignal && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-red/15 text-brand-red shrink-0">
                          {result.bestSignal.displayName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        Last digit: <span className="font-bold tabular text-text-secondary">{result.lastDigit}</span>
                      </span>
                      <span>{result.tickCount} ticks analyzed</span>
                      {hasSignals && (
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-brand-amber" />
                          {result.signals.length} signal{result.signals.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="shrink-0 text-right">
                    <div className={`text-2xl font-bold tabular ${scoreColor}`}>{result.overallScore}%</div>
                    <div className="text-[9px] uppercase tracking-wider text-text-muted">Win Prob.</div>
                  </div>

                  {/* Expand chevron */}
                  <div className="shrink-0">
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-text-muted" /> : <ChevronDown className="w-5 h-5 text-text-muted" />}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-border-default px-4 py-4 space-y-3 bg-bg-secondary/50">
                    {/* Digit distribution */}
                    <div>
                      <div className="text-xs font-semibold text-text-secondary mb-2">Digit Distribution (last {result.tickCount} ticks)</div>
                      <div className="flex items-end justify-between gap-1 h-20">
                        {result.digitCounts.map((count, d) => {
                          const maxCount = Math.max(...result.digitCounts, 1)
                          const heightPct = (count / maxCount) * 100
                          const expected = result.tickCount / 10
                          const isOver = count > expected * 1.15
                          const isUnder = count < expected * 0.85
                          const barColor = isOver ? 'bg-brand-green' : isUnder ? 'bg-brand-red' : 'bg-brand-blue'
                          return (
                            <div key={d} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-[9px] tabular text-text-muted">{count}</span>
                              <div className="w-full rounded-t flex-1 flex items-end" style={{ minHeight: '4px' }}>
                                <div className={`w-full ${barColor} rounded-t transition-all`} style={{ height: `${Math.max(heightPct, 3)}%` }} />
                              </div>
                              <span className={`text-[10px] font-bold tabular ${d === result.lastDigit ? 'text-brand-red' : 'text-text-secondary'}`}>{d}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Signals */}
                    {hasSignals ? (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-text-secondary">Recommended Trades (ranked by edge)</div>
                        {result.signals.map((signal, sigIdx) => (
                          <div key={sigIdx} className="rounded-xl bg-bg-tertiary border border-border-light p-3">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-text-primary">{signal.displayName}</span>
                                  <span className="text-[10px] font-bold tabular px-1.5 py-0.5 rounded bg-brand-green/15 text-brand-green">
                                    +{(signal.edge * 100).toFixed(1)}% edge
                                  </span>
                                </div>
                                <p className="text-xs text-text-muted mt-1 leading-relaxed">{signal.rationale}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleTradeManually(result, signal) }}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-green text-bg-primary text-xs font-bold hover:bg-brand-green-dim transition-colors"
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                                Trade Manually
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleLoadBot(result, signal) }}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bg-tertiary border border-border-light text-xs font-bold text-text-primary hover:bg-bg-hover transition-colors"
                              >
                                <Bot className="w-3.5 h-3.5" />
                                Load as Bot
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Disclaimer */}
      {hasScanned && !scanning && (
        <p className="mt-8 text-[10px] text-text-muted leading-relaxed text-center max-w-2xl mx-auto">
          Scanner results are based on historical tick data and statistical analysis. Past performance does not guarantee future results.
          Trade recommendations are for educational purposes and should not be considered financial advice. Always trade responsibly.
        </p>
      )}

      {/* Bot configuration modal */}
      {pendingBot && (
        <BotConfigModal
          result={pendingBot.result}
          signal={pendingBot.signal}
          onCancel={() => setPendingBot(null)}
          onConfirm={confirmLoadBot}
        />
      )}
    </div>
  )
}

function BotConfigModal({
  result,
  signal,
  onCancel,
  onConfirm,
}: {
  result: ScanResult
  signal: DigitSignal
  onCancel: () => void
  onConfirm: (config: BotConfig) => void
}) {
  const [stake, setStake] = useState('1')
  const [duration, setDuration] = useState('1')
  const [useMartingale, setUseMartingale] = useState(false)
  const [martingaleSteps, setMartingaleSteps] = useState('3')
  const [martingaleMultiplier, setMartingaleMultiplier] = useState('2')
  const [stopLoss, setStopLoss] = useState('0')
  const [takeProfit, setTakeProfit] = useState('0')

  const handleConfirm = () => {
    onConfirm({
      stake: parseFloat(stake) || 1,
      duration: parseInt(duration) || 1,
      durationUnit: 't',
      useMartingale,
      martingaleSteps: parseInt(martingaleSteps) || 0,
      martingaleMultiplier: parseFloat(martingaleMultiplier) || 2,
      stopLoss: parseFloat(stopLoss) || 0,
      takeProfit: parseFloat(takeProfit) || 0,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-bg-secondary border border-border-light shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-bg-secondary/95 backdrop-blur-sm px-5 py-4 border-b border-border-default flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center">
              <SettingsIcon className="w-4 h-4 text-brand-red" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-text-muted font-bold">
                Configure Bot
              </div>
              <h2 className="font-bold text-base text-text-primary mt-0.5">
                {signal.displayName} on {result.display_name}
              </h2>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-9 h-9 rounded-xl bg-bg-tertiary border border-border-light flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Trade info */}
          <div className="rounded-xl bg-bg-tertiary border border-border-light p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-red/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-brand-red" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text-primary truncate">
                {signal.displayName}
              </div>
              <div className="text-xs text-text-muted mt-0.5">
                {result.display_name}
              </div>
            </div>
          </div>

          {/* Stake & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Stake (USD)</label>
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                min="0.35"
                step="0.01"
                className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-red transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Duration (ticks)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="1"
                max="10"
                className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-red transition-colors"
              />
            </div>
          </div>

          {/* Martingale toggle */}
          <div className="rounded-xl bg-bg-tertiary border border-border-light p-4">
            <button
              onClick={() => setUseMartingale(!useMartingale)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className={`w-9 h-5 rounded-full transition-colors relative ${useMartingale ? 'bg-brand-red' : 'bg-bg-hover'}`}>
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${useMartingale ? 'translate-x-4' : 'translate-x-0.5'}`}
                  />
                </div>
                <span className="text-sm font-semibold text-text-primary">Use Martingale</span>
              </div>
              <span className="text-xs text-text-muted">
                {useMartingale ? 'Enabled' : 'Disabled'}
              </span>
            </button>

            {useMartingale && (
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border-default">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Max Steps</label>
                  <input
                    type="number"
                    value={martingaleSteps}
                    onChange={(e) => setMartingaleSteps(e.target.value)}
                    min="1"
                    max="10"
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-secondary border border-border-light text-sm tabular focus:outline-none focus:border-brand-red transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Multiplier</label>
                  <input
                    type="number"
                    value={martingaleMultiplier}
                    onChange={(e) => setMartingaleMultiplier(e.target.value)}
                    min="1"
                    step="0.1"
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-secondary border border-border-light text-sm tabular focus:outline-none focus:border-brand-red transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Stop Loss & Take Profit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Stop Loss (USD)</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0 = off"
                className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-red transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Take Profit (USD)</label>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0 = off"
                className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-red transition-colors"
              />
            </div>
          </div>

          {/* Info note */}
          <div className="rounded-xl bg-brand-blue/5 border border-brand-blue/20 px-3 py-2.5">
            <p className="text-xs text-text-secondary leading-relaxed">
              The bot will trade <span className="font-semibold text-text-primary">{signal.displayName}</span> on <span className="font-semibold text-text-primary">{result.display_name}</span> with a stake of <span className="font-semibold text-text-primary">{stake} USD</span> per trade.
              {useMartingale && ` On loss, the stake will multiply by ${martingaleMultiplier}.`}
              {parseFloat(stopLoss) > 0 && ` The bot stops if total loss reaches ${stopLoss} USD.`}
              {parseFloat(takeProfit) > 0 && ` The bot stops if total profit reaches ${takeProfit} USD.`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-bg-secondary/95 backdrop-blur-sm px-5 py-4 border-t border-border-default flex items-center gap-3">
          <button
            onClick={handleConfirm}
            className="flex-1 h-11 rounded-xl bg-brand-red text-white font-bold text-sm hover:bg-brand-red-dim transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Run Bot
          </button>
          <button
            onClick={onCancel}
            className="h-11 px-5 rounded-xl bg-bg-tertiary border border-border-light text-text-secondary text-sm font-semibold hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
