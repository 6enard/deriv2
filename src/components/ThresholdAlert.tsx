import { useCallback, useEffect, useRef, useState } from 'react'
import { TrendingDown, TrendingUp, X } from 'lucide-react'

const AUTO_CLOSE_MS = 15000

export interface ThresholdAlertData {
  type: 'stop_loss' | 'take_profit'
  profit: number
  currency: string
}

const THEMES = {
  take_profit: {
    border: 'border-brand-green/40',
    header: 'bg-gradient-to-b from-brand-green/20 via-brand-green/5 to-transparent',
    iconTile: 'bg-brand-green shadow-[0_12px_32px_-8px_rgba(34,197,94,0.6)]',
    eyebrow: 'text-brand-green',
    button: 'bg-brand-green',
    bar: 'bg-brand-green',
  },
  stop_loss: {
    border: 'border-brand-red/40',
    header: 'bg-gradient-to-b from-brand-red/20 via-brand-red/5 to-transparent',
    iconTile: 'bg-brand-red shadow-[0_12px_32px_-8px_rgba(229,57,53,0.6)]',
    eyebrow: 'text-brand-red',
    button: 'bg-brand-red',
    bar: 'bg-brand-red',
  },
} as const

export function ThresholdAlert({
  alert,
  onDismiss,
}: {
  alert: ThresholdAlertData
  onDismiss: () => void
}) {
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(100)
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss
  const closingRef = useRef(false)

  const dismiss = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false)
    window.setTimeout(() => onDismissRef.current(), 300)
  }, [])

  useEffect(() => {
    const show = window.setTimeout(() => {
      setVisible(true)
      setProgress(0)
    }, 30)
    const autoClose = window.setTimeout(dismiss, AUTO_CLOSE_MS)
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(autoClose)
    }
  }, [dismiss])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismiss])

  const isTakeProfit = alert.type === 'take_profit'
  const theme = THEMES[alert.type]
  const isPositive = alert.profit >= 0
  const Icon = isTakeProfit ? TrendingUp : TrendingDown

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={dismiss}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="threshold-alert-title"
        className={`relative w-full max-w-md rounded-3xl bg-bg-secondary border ${theme.border} shadow-[0_24px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300 ${
          visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`relative px-6 pt-7 pb-6 sm:px-8 ${theme.header}`}>
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>

          <div className={`w-16 h-16 rounded-2xl ${theme.iconTile} flex items-center justify-center`}>
            <Icon className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>

          <p className={`mt-5 text-xs font-semibold uppercase tracking-widest ${theme.eyebrow}`}>
            {isTakeProfit ? 'Target reached' : 'Loss limit reached'}
          </p>
          <h2 id="threshold-alert-title" className="mt-1 text-2xl sm:text-3xl font-bold text-text-primary leading-[1.2]">
            {isTakeProfit ? 'Take Profit Reached' : 'Stop Loss Reached'}
          </h2>
          <p className="mt-2 text-sm text-text-secondary leading-[1.5]">
            {isTakeProfit
              ? 'Your bot hit its profit target and has stopped trading.'
              : 'Your bot hit its loss limit and has stopped trading.'}
          </p>
        </div>

        <div className="px-6 sm:px-8 pb-6">
          <div className="rounded-2xl bg-bg-tertiary border border-border-light p-5">
            <div className="text-xs font-medium text-text-muted">Session profit / loss</div>
            <div className={`mt-1 text-3xl font-bold tabular-nums ${isPositive ? 'text-brand-green' : 'text-brand-red'}`}>
              {isPositive ? '+' : ''}
              {alert.profit.toFixed(2)}{' '}
              <span className="text-base font-semibold text-text-muted">{alert.currency}</span>
            </div>
          </div>

          <button
            onClick={dismiss}
            className={`mt-5 w-full h-12 rounded-xl ${theme.button} text-white font-semibold text-sm hover:brightness-110 active:scale-[0.99] transition-all`}
          >
            Got it
          </button>

          <div className="mt-4 h-1 w-full rounded-full bg-bg-hover overflow-hidden" aria-hidden="true">
            <div
              className={`h-full rounded-full ${theme.bar}`}
              style={{ width: `${progress}%`, transition: `width ${AUTO_CLOSE_MS}ms linear` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
