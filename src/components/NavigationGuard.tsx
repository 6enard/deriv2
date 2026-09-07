import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useBotRunnerContext } from '../context/BotRunnerContext'

export default function NavigationGuard() {
  const { isRunning } = useBotRunnerContext()
  const location = useLocation()
  const navigate = useNavigate()
  const lastPath = useRef(location.pathname)

  useEffect(() => {
    if (!isRunning) {
      lastPath.current = location.pathname
      return
    }

    if (location.pathname !== lastPath.current) {
      navigate(lastPath.current, { replace: true })
    }
  }, [location.pathname, isRunning, navigate])

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

  return null
}
