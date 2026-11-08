import { useEffect, useState } from 'react'
import { TrendingDown, TrendingUp, X } from 'lucide-react'

export interface ThresholdAlertData {
  type: 'stop_loss' | 'take_profit'
  profit: number
  currency: string
}

export function ThresholdAlert({
  alert,
  onDismiss,
}: {
  alert: ThresholdAlertData
  onDismiss: () => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const dismiss = () => {
    setVisible(false)
    setTimeout(onDismiss, 300)
  }

  useEffect(() => {
    const timer = setTimeout(dismiss, 8000)
    return () => clearTimeout(timer)
  }, [])

  const isTakeProfit = alert.type === 'take_profit'
  const profit = alert.profit
  const isPositive = profit >= 0

  const accentColor = isTakeProfit ? 'text-brand-green' : 'text-brand-red'
  const accentBg = isTakeProfit ? 'bg-brand-green' : 'bg-brand-red'
  const accentBorder = isTakeProfit ? 'border-brand-green/40' : 'border-brand-red/40'
  const accentGlow = isTakeProfit
    ? 'shadow-[0_0_40px_rgba(34,197,94,0.25)]'
    : 'shadow-[0_0_40px_rgba(229,57,53,0.25)]'
  const accentGradient = isTakeProfit
    ? 'from-brand-green/20 via-brand-green/5 to-transparent'
    : 'from-brand-red/20 via-brand-red/5 to-transparent'
  const Icon = isTakeProfit ? TrendingUp : TrendingDown

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={dismiss}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className={`relative w-full max-w-sm rounded-3xl bg-bg-secondary border ${accentBorder} ${accentGlow} overflow-hidden transition-all duration-300 ${
          visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: visible ? 'toast-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' : undefined }}
      >
        {/* Top accent bar */}
        <div className={`h-1.5 w-full ${accentBg}`} />

        {/* Ambient glow */}
        <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl ${accentBg}/10`} />

        <div className="relative p-6 sm:p-7">
          {/* Icon */}
          <div className="flex items-center justify-between mb-5">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${accentGradient} border ${accentBorder} flex items-center justify-center`}>
              <Icon className={`w-7 h-7 ${accentColor}`} />
            </div>
            <button
              onClick={dismiss}
              className="w-9 h-9 rounded-xl bg-bg-tertiary flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title */}
          <h2 className={`text-xl sm:text-2xl font-bold ${accentColor} mb-1.5`}>
            {isTakeProfit ? 'Take Profit Reached' : 'Stop Loss Reached'}
          </h2>

          {/* Subtitle */}
          <p className="text-sm text-text-secondary mb-5">
            {isTakeProfit
              ? 'Your bot has hit its profit target and stopped trading.'
              : 'Your bot has hit its loss limit and stopped trading.'}
          </p>

          {/* Profit figure */}
          <div className={`rounded-2xl bg-gradient-to-br ${accentGradient} border ${accentBorder} p-4 mb-5`}>
            <div className="text-xs text-text-muted mb-1">Total Profit / Loss</div>
            <div className={`text-3xl font-bold tabular ${isPositive ? 'text-brand-green' : 'text-brand-red'}`}>
              {isPositive ? '+' : ''}{profit.toFixed(2)} <span className="text-lg text-text-muted">{alert.currency}</span>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={dismiss}
            className="w-full h-11 rounded-xl bg-bg-tertiary border border-border-light text-text-primary font-semibold text-sm hover:bg-bg-hover transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
