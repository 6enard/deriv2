import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScanner } from '../hooks/useScanner'
import { useToast } from '../components/Toast'
import { buildBotXmlFromSignal, type ScanResult, type DigitSignal } from '../lib/scanner'
import { Radar, Loader as Loader2, RefreshCw, TrendingUp, Hash, Bot, Activity, Target, CircleAlert as AlertCircle, Sparkles, ChevronDown, ChevronUp, Brain, Zap } from 'lucide-react'

export default function Scanner() {
  const { results, scanning, error, hasScanned, runScan } = useScanner()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
    const xml = buildBotXmlFromSignal(result, signal)
    sessionStorage.setItem('pending_bot_xml', xml)
    showToast('success', `Bot loaded with ${signal.displayName} on ${result.display_name}.`)
    navigate('/bot-builder')
  }

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
        <button
          onClick={() => runScan()}
          disabled={scanning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-red text-white font-semibold text-sm hover:bg-brand-red-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
          {scanning ? 'Scanning markets...' : hasScanned ? 'Rescan' : 'Start Scan'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-brand-red/10 border border-brand-red/30 rounded-xl px-4 py-3 text-sm text-brand-red mb-6 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
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
          <p className="mt-1 text-xs text-text-muted">Fetching 500 ticks per market and computing digit frequency statistics</p>
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
          <p className="text-sm text-text-secondary">No tradeable signals found in current market conditions.</p>
          <button onClick={() => runScan()} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-tertiary border border-border-light text-sm font-medium hover:bg-bg-hover transition-colors">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}

      {/* Results */}
      {!scanning && results.length > 0 && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center gap-3 text-xs text-text-muted">
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
              Ranked by statistical edge
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
                    <div className={`text-2xl font-bold tabular ${scoreColor}`}>{result.overallScore}</div>
                    <div className="text-[9px] uppercase tracking-wider text-text-muted">Score</div>
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
                    ) : (
                      <div className="text-xs text-text-muted text-center py-3">
                        No statistically significant digit patterns detected for this market.
                      </div>
                    )}
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
    </div>
  )
}
