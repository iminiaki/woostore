/**
 * Lightweight UI feedback sounds via Web Audio API (no asset files).
 * Safe to call from event handlers / toast helpers on the client.
 */

let sharedCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!sharedCtx) sharedCtx = new AC()
  if (sharedCtx.state === "suspended") {
    void sharedCtx.resume().catch(() => undefined)
  }
  return sharedCtx
}

function playTone(
  ctx: AudioContext,
  {
    frequency,
    startAt,
    duration,
    type = "sine",
    gain = 0.06,
    slideTo,
  }: {
    frequency: number
    startAt: number
    duration: number
    type?: OscillatorType
    gain?: number
    slideTo?: number
  },
) {
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, startAt)
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), startAt + duration)
  }

  amp.gain.setValueAtTime(0.0001, startAt)
  amp.gain.exponentialRampToValueAtTime(gain, startAt + 0.02)
  amp.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)

  osc.connect(amp)
  amp.connect(ctx.destination)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.02)
}

/** Soft ascending chime for successful actions. */
export function playSuccessSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const t = ctx.currentTime
    playTone(ctx, { frequency: 523.25, startAt: t, duration: 0.11, type: "sine", gain: 0.055 }) // C5
    playTone(ctx, { frequency: 659.25, startAt: t + 0.08, duration: 0.12, type: "sine", gain: 0.05 }) // E5
    playTone(ctx, { frequency: 783.99, startAt: t + 0.16, duration: 0.18, type: "triangle", gain: 0.045 }) // G5
  } catch {
    /* ignore autoplay / audio errors */
  }
}

/** Soft double-tap (minor fall) for failed actions — clearer, less harsh than a buzz. */
export function playErrorSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const t = ctx.currentTime
    // Two muted sine taps: E4 → C4
    playTone(ctx, {
      frequency: 329.63,
      startAt: t,
      duration: 0.09,
      type: "sine",
      gain: 0.05,
    })
    playTone(ctx, {
      frequency: 261.63,
      startAt: t + 0.11,
      duration: 0.16,
      type: "triangle",
      gain: 0.045,
      slideTo: 220,
    })
  } catch {
    /* ignore autoplay / audio errors */
  }
}

export type FeedbackSound = "success" | "error" | false

export function playFeedbackSound(kind: FeedbackSound) {
  if (kind === "success") playSuccessSound()
  else if (kind === "error") playErrorSound()
}
