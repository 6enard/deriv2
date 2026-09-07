import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { useBotRunnerContext } from '../context/BotRunnerContext'

export default function NavigationGuard() {
  const { isRunning } = useBotRunnerContext()

  useBlocker(({ currentLocation, nextLocation }) => {
    if (!isRunning) return false
    return currentLocation.pathname !== nextLocation.pathname
  })

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
