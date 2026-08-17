import { useEffect, useRef, useState } from 'react'
import { CircleAlert as AlertCircle, CircleCheck as CheckCircle2, Loader as Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDerivAuth } from '../hooks/useDerivAuth'

export default function CallbackPage() {
  const navigate = useNavigate()
  const { handleCallback } = useDerivAuth()
  const [error, setError] = useState<string | null>(null)
  const hasProcessed = useRef(false)

  useEffect(() => {
    if (hasProcessed.current) return
    hasProcessed.current = true

    handleCallback(new URLSearchParams(window.location.search))
      .then(() => navigate('/dashboard', { replace: true }))
      .catch((callbackError: unknown) => {
        setError(callbackError instanceof Error ? callbackError.message : 'Unable to complete Deriv sign-in.')
      })
  }, [handleCallback, navigate])

  if (error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-bg-secondary border border-brand-red/30 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-brand-red mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Sign-in could not be completed</h1>
          <p className="text-sm text-text-secondary leading-relaxed mb-6">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="px-5 py-2.5 rounded-xl bg-brand-red text-white font-semibold hover:bg-brand-red-dim transition-colors"
          >
            Return to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-brand-red animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-semibold mb-2">Connecting your Deriv account</h1>
        <p className="text-sm text-text-secondary">Please wait while we prepare your trading session.</p>
        <div className="flex items-center justify-center gap-2 mt-5 text-xs text-brand-red">
          <CheckCircle2 className="w-4 h-4" />
          Secure redirect received
        </div>
      </div>
    </div>
  )
}
