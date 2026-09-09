// Lightweight sound effects for bot events using the Web Audio API.
// No external audio files needed — sounds are synthesized at runtime.

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch {
      return null
    }
  }
  return audioCtx
}

// Browsers require a user gesture before audio can play. The AudioContext
// starts in "suspended" state and must be resumed. We resume eagerly on the
// first user interaction so that later programmatic sounds (bot events) play
// even though they weren't directly triggered by a click.
let resumeAttempted = false
function tryResumeOnGesture() {
  if (resumeAttempted) return
  const ctx = getCtx()
  if (!ctx) return
  resumeAttempted = true
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
  // Remove listeners once we've attempted a resume
  window.removeEventListener('pointerdown', tryResumeOnGesture)
  window.removeEventListener('keydown', tryResumeOnGesture)
  window.removeEventListener('touchstart', tryResumeOnGesture)
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', tryResumeOnGesture, { once: false, passive: true })
  window.addEventListener('keydown', tryResumeOnGesture, { once: false, passive: true })
  window.addEventListener('touchstart', tryResumeOnGesture, { once: false, passive: true })
}

interface ToneOptions {
  frequency: number
  duration: number
  type?: OscillatorType
  volume?: number
  delay?: number
}

function playTone({ frequency, duration, type = 'sine', volume = 0.15, delay = 0 }: ToneOptions) {
  const ctx = getCtx()
  if (!ctx) return

  // If the context is suspended, try to resume it first — but still
  // schedule the tone. On most browsers, once resume() is called the
  // context transitions to "running" and scheduled tones will play.
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }

  // If the context is still suspended after resume attempt, bail out
  // — scheduling on a suspended context produces no sound.
  if (ctx.state === 'suspended') return

  const start = ctx.currentTime + delay

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(frequency, start)

  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(start)
  osc.stop(start + duration + 0.05)
}

export type SoundEvent = 'start' | 'win' | 'loss' | 'sold' | 'done' | 'error'

export function playSound(event: SoundEvent) {
  const ctx = getCtx()
  if (!ctx) return

  // Resume context if suspended (browsers require user gesture)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }

  switch (event) {
    case 'start':
      playTone({ frequency: 523.25, duration: 0.15, type: 'sine', volume: 0.12 })
      playTone({ frequency: 659.25, duration: 0.15, type: 'sine', volume: 0.12, delay: 0.12 })
      break

    case 'win':
      // Ascending major triad: C5 → E5 → G5
      playTone({ frequency: 523.25, duration: 0.12, type: 'sine', volume: 0.15 })
      playTone({ frequency: 659.25, duration: 0.12, type: 'sine', volume: 0.15, delay: 0.1 })
      playTone({ frequency: 783.99, duration: 0.2, type: 'sine', volume: 0.15, delay: 0.2 })
      break

    case 'loss':
      // Descending minor: E4 → C4
      playTone({ frequency: 329.63, duration: 0.18, type: 'triangle', volume: 0.12 })
      playTone({ frequency: 261.63, duration: 0.3, type: 'triangle', volume: 0.12, delay: 0.16 })
      break

    case 'sold':
      playTone({ frequency: 440, duration: 0.12, type: 'sine', volume: 0.1 })
      playTone({ frequency: 554.37, duration: 0.15, type: 'sine', volume: 0.1, delay: 0.1 })
      break

    case 'done':
      // Two-note completion chime
      playTone({ frequency: 659.25, duration: 0.15, type: 'sine', volume: 0.12 })
      playTone({ frequency: 523.25, duration: 0.25, type: 'sine', volume: 0.12, delay: 0.15 })
      break

    case 'error':
      playTone({ frequency: 220, duration: 0.2, type: 'sawtooth', volume: 0.1 })
      playTone({ frequency: 180, duration: 0.3, type: 'sawtooth', volume: 0.1, delay: 0.18 })
      break
  }
}

// Call this from a user-gesture handler (e.g. button click) to unlock audio
// before the first programmatic sound needs to play.
export function unlockAudio() {
  const ctx = getCtx()
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
  resumeAttempted = true
  window.removeEventListener('pointerdown', tryResumeOnGesture)
  window.removeEventListener('keydown', tryResumeOnGesture)
  window.removeEventListener('touchstart', tryResumeOnGesture)
}
