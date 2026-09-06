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
