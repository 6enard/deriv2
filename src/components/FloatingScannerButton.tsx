import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Radar } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const STORAGE_KEY = 'floating_scanner_pos'
const BUTTON_SIZE = 56
const EDGE_MARGIN = 16

interface Position {
  x: number
  y: number
}

function clampPosition(pos: Position): Position {
  const maxX = window.innerWidth - BUTTON_SIZE - EDGE_MARGIN
  const maxY = window.innerHeight - BUTTON_SIZE - EDGE_MARGIN
  return {
    x: Math.max(EDGE_MARGIN, Math.min(pos.x, maxX)),
    y: Math.max(EDGE_MARGIN, Math.min(pos.y, maxY)),
  }
}

function loadPosition(): Position {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Position
      if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
        return clampPosition(parsed)
      }
    }
  } catch {
    // ignore
  }
  return {
    x: window.innerWidth - BUTTON_SIZE - EDGE_MARGIN - 20,
    y: window.innerHeight - BUTTON_SIZE - EDGE_MARGIN - 80,
  }
}

export default function FloatingScannerButton() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const [position, setPosition] = useState<Position>(() => loadPosition())
  const [dragging, setDragging] = useState(false)
  const [showLabel, setShowLabel] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const movedRef = useRef(false)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    setDragging(true)
    setShowLabel(false)
    movedRef.current = false
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      px: position.x,
      py: position.y,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [position])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !dragStartRef.current) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      movedRef.current = true
    }
    setPosition(clampPosition({
      x: dragStartRef.current.px + dx,
      y: dragStartRef.current.py + dy,
    }))
  }, [dragging])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setDragging(false)
    dragStartRef.current = null
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    setPosition((pos) => {
      const clamped = clampPosition(pos)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clamped))
      } catch {
        // ignore
      }
      return clamped
    })
    if (!movedRef.current) {
      navigate('/scanner')
    }
  }, [navigate])

  useEffect(() => {
    const handleResize = () => setPosition((pos) => clampPosition(pos))
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!isAuthenticated || location.pathname === '/scanner') return
    const timer = setTimeout(() => setShowLabel(true), 1000)
    const hideTimer = setTimeout(() => setShowLabel(false), 5000)
    return () => {
      clearTimeout(timer)
      clearTimeout(hideTimer)
    }
  }, [isAuthenticated, location.pathname])

  if (!isAuthenticated || location.pathname === '/scanner') return null

  return (
    <div
      className="fixed z-[90] select-none"
      style={{
        left: position.x,
        top: position.y,
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
      }}
    >
      <div className="absolute inset-0 rounded-full bg-brand-red/20 blur-lg pulse-glow pointer-events-none" />

      {showLabel && !dragging && (
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-bg-secondary border border-border-light px-3 py-2 shadow-xl slide-in pointer-events-none">
          <span className="text-xs font-semibold text-text-primary">AI Scanner</span>
          <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-l-[6px] border-l-bg-secondary border-y-[5px] border-y-transparent" />
        </div>
      )}

      <button
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={() => setShowLabel(true)}
        onMouseLeave={() => { if (!dragging) setShowLabel(false) }}
        className={`relative w-full h-full rounded-full bg-brand-red text-white shadow-xl flex items-center justify-center transition-transform duration-200 ${
          dragging ? 'scale-110 cursor-grabbing' : 'cursor-grab hover:scale-105 active:scale-95'
        }`}
        aria-label="Open AI Scanner"
      >
        <Radar className="w-6 h-6" />
      </button>
    </div>
  )
}
