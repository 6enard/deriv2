import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { CircleCheck as CheckCircle, CircleAlert as AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastId = 0

const TOAST_DURATION = 5000

const toastConfig: Record<ToastType, { icon: typeof CheckCircle; accent: string; bg: string; border: string; text: string; bar: string }> = {
  success: {
    icon: CheckCircle,
    accent: 'text-brand-green',
    bg: 'bg-bg-secondary',
    border: 'border-brand-green/30',
    text: 'text-text-primary',
    bar: 'bg-brand-green',
  },
  error: {
    icon: AlertCircle,
    accent: 'text-brand-red',
    bg: 'bg-bg-secondary',
    border: 'border-brand-red/30',
    text: 'text-text-primary',
    bar: 'bg-brand-red',
  },
  info: {
    icon: Info,
    accent: 'text-brand-blue',
    bg: 'bg-bg-secondary',
    border: 'border-brand-blue/30',
    text: 'text-text-primary',
    bar: 'bg-brand-blue',
  },
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const config = toastConfig[toast.type]
  const Icon = config.icon
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const remainingRef = useRef<number>(TOAST_DURATION)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    startTimeRef.current = Date.now()
    remainingRef.current = TOAST_DURATION

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const pct = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100)
      setProgress(pct)
      if (pct <= 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        onDismiss(toast.id)
      }
    }, 50)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [toast.id, onDismiss])

  return (
    <div
      className={`pointer-events-auto relative w-full overflow-hidden rounded-2xl ${config.bg} border ${config.border} shadow-2xl backdrop-blur-xl`}
      style={{ animation: 'toast-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className={`shrink-0 mt-0.5`}>
          <Icon className={`w-5 h-5 ${config.accent}`} />
        </div>
        <p className={`flex-1 text-sm font-medium ${config.text} leading-relaxed`}>
          {toast.message}
        </p>
        <button
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 -mr-1 -mt-0.5 p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="h-0.5 w-full bg-bg-tertiary/50">
        <div
          className={`h-full ${config.bar} transition-all duration-75 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastId
    setToasts((prev) => [...prev.slice(-2), { id, type, message }])
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] sm:w-96 pointer-events-none">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
