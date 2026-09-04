import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDerivAuth } from '../hooks/useDerivAuth'
import LoadingScreen from '../components/LoadingScreen'

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

  return (
    <LoadingScreen
      error={error}
      onComplete={error ? () => {} : undefined}
    />
  )
}
