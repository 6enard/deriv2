import { useBotRunnerContext } from '../context/BotRunnerContext'
import { useNavigate } from 'react-router-dom'
import { Activity, Square, TrendingUp, TrendingDown } from 'lucide-react'

export default function FloatingBotStatus() {
  const { isRunning, runStats, handleStop } = useBotRunnerContext()
  const navigate = useNavigate()

  if (!isRunning) return null

  const isProfit = runStats.totalProfit >= 0

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 lg:left-4 lg:translate-x-0 z-[95] pointer-events-auto">
      <div className="flex items-center gap-3 rounded-2xl bg-bg-secondary/95 backdrop-blur-xl border border-brand-red/30 shadow-2xl px-4 py-2.5 slide-up">
        <div className="flex items-center gap-2">
          <span className="relative flex w-2.5 h-2.5">
            <span className="absolute inline-flex w-full h-full rounded-full bg-brand-red opacity-60 animate-ping" />
            <span className="relative w-2.5 h-2.5 rounded-full bg-brand-red" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-red hidden sm:inline">
            Bot Running
          </span>
        </div>

        <div className="h-5 w-px bg-border-default hidden sm:block" />

        <div className="flex items-center gap-1.5">
          {isProfit ? (
            <TrendingUp className="w-3.5 h-3.5 text-brand-green" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-brand-red" />
          )}
          <span className={`text-sm font-bold tabular ${isProfit ? 'text-brand-green' : 'text-brand-red'}`}>
            {isProfit ? '+' : ''}{runStats.totalProfit.toFixed(2)}
          </span>
          <span className="text-[10px] text-text-muted hidden sm:inline">P/L</span>
        </div>

        <div className="h-5 w-px bg-border-default hidden sm:block" />

        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <span className="tabular font-semibold text-text-primary">{runStats.totalRuns}</span>
          <span className="text-[10px] text-text-muted hidden sm:inline">trades</span>
        </div>

        <div className="h-5 w-px bg-border-default" />

        <button
          onClick={() => navigate('/bot-builder')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-tertiary text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">View</span>
        </button>

        <button
          onClick={handleStop}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-red text-white text-xs font-bold hover:bg-brand-red-dim transition-colors"
        >
          <Square className="w-3 h-3 fill-current" />
          <span className="hidden sm:inline">Stop</span>
        </button>
      </div>
    </div>
  )
}
