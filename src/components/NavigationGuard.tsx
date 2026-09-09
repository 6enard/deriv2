import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useBotRunnerContext } from '../context/BotRunnerContext'
import { TriangleAlert as AlertTriangle, Loader as Loader2, ArrowRight } from 'lucide-react'

export default function NavigationGuard() {
  const { isRunning, handleStop } = useBotRunnerContext()
  const location = useLocation()
  const navigate = useNavigate()
  const lastPath = useRef(location.pathname)
  const [pendingPath, setPendingPath] = useState<string | null>(null)
  const [stopping, setStopping] = useState(false)

  const stopBotAndNavigate = useCallback(async (target: string) => {
    setStopping(true)
    handleStop()
    // Give the bot a moment to initiate shutdown
    await new Promise<void>((r) => setTimeout(r, 1500))
    setStopping(false)
    setPendingPath(null)
    lastPath.current = target
    navigate(target)
  }, [handleStop, navigate])

  const leaveAndKeepRunning = useCallback((target: string) => {
    setPendingPath(null)
    lastPath.current = target
    navigate(target)
  }, [navigate])

  // Intercept in-app navigation
  useEffect(() => {
    if (!isRunning) {
      lastPath.current = location.pathname
      return
    }

    if (location.pathname !== lastPath.current) {
      setPendingPath(location.pathname)
      // Bounce back immediately
      navigate(lastPath.current, { replace: true })
    }
  }, [location.pathname, isRunning, navigate])

  // Handle page reload / tab close
  useEffect(() => {
    if (!isRunning) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isRunning])

  if (!pendingPath) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-bg-secondary border border-border-light shadow-2xl slide-in">
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-amber/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-brand-amber" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-text-primary">Bot is still running</h2>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                Your bot is actively trading. You can leave this page while keeping the bot running, or stop it before leaving.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <button
              onClick={() => leaveAndKeepRunning(pendingPath)}
              disabled={stopping}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-green text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <ArrowRight className="w-4 h-4" />
              Leave but keep running
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => stopBotAndNavigate(pendingPath)}
                disabled={stopping}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-red text-white font-semibold text-sm hover:bg-brand-red-dim transition-colors disabled:opacity-50"
              >
                {stopping ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {stopping ? 'Stopping...' : 'Stop bot & leave'}
              </button>
              <button
                onClick={() => setPendingPath(null)}
                disabled={stopping}
                className="px-4 py-2.5 rounded-xl bg-bg-tertiary text-text-secondary text-sm font-medium hover:text-text-primary transition-colors"
              >
                Stay here
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
