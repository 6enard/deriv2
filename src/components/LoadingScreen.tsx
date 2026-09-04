import { useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { CircleCheck as CheckCircle2, Loader as Loader2, CircleAlert as AlertCircle } from 'lucide-react'

type StepStatus = 'pending' | 'active' | 'done'

type Step = {
  label: string
  detail: string
  status: StepStatus
}

const STEPS: Omit<Step, 'status'>[] = [
  { label: 'Verifying secure redirect', detail: 'Checking your Deriv authorization code' },
  { label: 'Exchanging authorization', detail: 'Securely trading your code for an access token' },
  { label: 'Fetching your accounts', detail: 'Retrieving your trading accounts from Deriv' },
  { label: 'Preparing trading session', detail: 'Opening a real-time connection to the markets' },
  { label: 'Entering the markets', detail: 'Loading your dashboard and live market data' },
]

const STEP_DURATION_MS = 1400

export default function LoadingScreen({
  error,
  onComplete,
}: {
  error: string | null
  onComplete?: () => void
}) {
  const { theme } = useTheme()
  const [steps, setSteps] = useState<Step[]>(
    STEPS.map((s) => ({ ...s, status: 'pending' as StepStatus }))
  )
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (error) {
      setSteps((prev) => prev.map((s) => (s.status === 'active' ? { ...s, status: 'done' } : s)))
      return
    }

    let cancelled = false
    let currentStep = 0

    const advance = () => {
      if (cancelled) return

      setSteps((prev) => {
        const next = [...prev]
        if (currentStep > 0) next[currentStep - 1].status = 'done'
        if (currentStep < next.length) next[currentStep].status = 'active'
        return next
      })

      setProgress(Math.min(((currentStep + 1) / STEPS.length) * 100, 100))

      currentStep++

      if (currentStep < STEPS.length) {
        setTimeout(advance, STEP_DURATION_MS)
      } else {
        setTimeout(() => {
          if (cancelled) return
          setSteps((prev) => prev.map((s) => ({ ...s, status: 'done' as StepStatus })))
          setProgress(100)
          onComplete?.()
        }, STEP_DURATION_MS)
      }
    }

    const timer = setTimeout(advance, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [error, onComplete])

  const logoSrc = theme === 'dark' ? '/black.jpeg' : '/white.jpeg'

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center bg-bg-primary px-4">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-brand-red/[0.04] blur-[120px] drift"
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10 fade-in-down">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-brand-red/20 blur-xl pulse-glow" />
            <img
              src={logoSrc}
              alt="DeriTraders"
              className="relative w-16 h-16 rounded-2xl object-cover shadow-lg"
            />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-text-primary">DeriTraders</h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            {error ? 'Connection could not be completed' : 'Connecting to the markets'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8 fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-text-muted">
              {error ? 'Connection failed' : 'Establishing connection'}
            </span>
            <span className="text-xs font-semibold tabular text-text-secondary">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-[1400ms] ease-out ${
                error ? 'bg-brand-red' : 'bg-gradient-to-r from-brand-red to-brand-red-dim'
              }`}
              style={{ width: `${error ? 100 : progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-1">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex items-start gap-3.5 px-3 py-3 rounded-xl transition-all duration-300 ${
                step.status === 'active'
                  ? 'bg-bg-tertiary/60'
                  : 'bg-transparent'
              }`}
              style={{
                opacity: step.status === 'pending' ? 0.4 : 1,
              }}
            >
              <div className="mt-0.5 shrink-0">
                {step.status === 'done' ? (
                  <CheckCircle2 className="w-5 h-5 text-brand-green" />
                ) : step.status === 'active' ? (
                  <Loader2 className="w-5 h-5 text-brand-red animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-border-light" />
                )}
              </div>
              <div className="min-w-0">
                <div
                  className={`text-sm font-medium transition-colors duration-300 ${
                    step.status === 'done'
                      ? 'text-text-secondary'
                      : step.status === 'active'
                      ? 'text-text-primary'
                      : 'text-text-muted'
                  }`}
                >
                  {step.label}
                </div>
                <div className="text-xs text-text-muted mt-0.5 leading-relaxed">
                  {step.detail}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="mt-8 fade-in-up">
            <div className="rounded-xl border border-brand-red/30 bg-brand-red/[0.06] p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
              <p className="text-sm text-text-secondary leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Footer note */}
        {!error && (
          <p className="mt-8 text-center text-[10px] text-text-muted leading-relaxed fade-in-up" style={{ animationDelay: '0.3s' }}>
            Securely connecting to Deriv's official API.<br />
            Your password is never requested or stored.
          </p>
        )}
      </div>
    </div>
  )
}
