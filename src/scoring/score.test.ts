import { describe, it, expect } from 'vitest'
import {
  initialScoreState,
  onCorrect,
  onError,
  streakMultiplier,
} from './score'

// ── initialScoreState ─────────────────────────────────────────────────────────

describe('initialScoreState', () => {
  it('starts with zero total, streak, and errors', () => {
    const s = initialScoreState()
    expect(s.total).toBe(0)
    expect(s.streak).toBe(0)
    expect(s.errors).toBe(0)
    expect(s.multiplier).toBe(1)
  })
})

// ── streakMultiplier ──────────────────────────────────────────────────────────

describe('streakMultiplier', () => {
  it('returns 1.0 at streak 0', () => {
    expect(streakMultiplier(0)).toBe(1.0)
  })

  it('returns 1.5 at streak 5', () => {
    expect(streakMultiplier(5)).toBe(1.5)
  })

  it('returns 2.0 at streak 10', () => {
    expect(streakMultiplier(10)).toBe(2.0)
  })

  it('returns 3.0 at streak 20', () => {
    expect(streakMultiplier(20)).toBe(3.0)
  })

  it('increases linearly with streak', () => {
    expect(streakMultiplier(15)).toBe(2.5)
  })
})

// ── onCorrect ─────────────────────────────────────────────────────────────────

describe('onCorrect', () => {
  it('increments streak on correct answer', () => {
    const s = onCorrect(initialScoreState(), 500)
    expect(s.streak).toBe(1)
  })

  it('instant answer (ms=0) at first correct scores 2 points', () => {
    // streak→1, mult=1.1, speedBonus=1 → round(2 × 1.1) = 2
    const s = onCorrect(initialScoreState(), 0)
    expect(s.total).toBe(2)
  })

  it('very slow answer at first correct scores 1 point', () => {
    // streak→1, mult=1.1, speedBonus≈0 → round(1 × 1.1) = 1
    const s = onCorrect(initialScoreState(), 1_000_000)
    expect(s.total).toBe(1)
  })

  it('instant answer at streak 10 scores 4 points', () => {
    // streak→10, mult=2.0, speedBonus=1 → round(2 × 2.0) = 4
    const base = { ...initialScoreState(), streak: 9, multiplier: 1.9 }
    const s = onCorrect(base, 0)
    expect(s.streak).toBe(10)
    expect(s.multiplier).toBe(2.0)
    expect(s.total).toBe(4)
  })

  it('answer at 3000ms at streak 10 scores 3 points', () => {
    // streak→10, mult=2.0, speedBonus=0.5 → round(1.5 × 2.0) = 3
    const base = { ...initialScoreState(), streak: 9, multiplier: 1.9 }
    const s = onCorrect(base, 3000)
    expect(s.total).toBe(3)
  })

  it('faster answers score more than slower answers', () => {
    const fast = onCorrect(initialScoreState(), 100)
    const slow = onCorrect(initialScoreState(), 5000)
    expect(fast.total).toBeGreaterThan(slow.total)
  })

  it('score is always positive regardless of response time', () => {
    expect(onCorrect(initialScoreState(), 0).total).toBeGreaterThan(0)
    expect(onCorrect(initialScoreState(), 60_000).total).toBeGreaterThan(0)
  })

  it('does not change errors count', () => {
    const base = { ...initialScoreState(), errors: 2 }
    const s = onCorrect(base, 500)
    expect(s.errors).toBe(2)
  })
})

// ── onError ───────────────────────────────────────────────────────────────────

describe('onError', () => {
  it('increments errors', () => {
    const s = onError(initialScoreState())
    expect(s.errors).toBe(1)
  })

  it('resets streak to 0', () => {
    let s = onCorrect(onCorrect(onCorrect(initialScoreState(), 100), 100), 100)
    expect(s.streak).toBe(3)
    s = onError(s)
    expect(s.streak).toBe(0)
  })

  it('resets multiplier to ×1', () => {
    let s = onCorrect(onCorrect(onCorrect(initialScoreState(), 100), 100), 100)
    expect(s.multiplier).toBeGreaterThan(1)
    s = onError(s)
    expect(s.multiplier).toBe(1)
  })

  it('deducts 1 from total', () => {
    let s = onCorrect(initialScoreState(), 500)
    const totalBefore = s.total
    s = onError(s)
    expect(s.total).toBe(totalBefore - 1)
  })

  it('allows total to go negative', () => {
    const s = onError(initialScoreState())
    expect(s.total).toBe(-1)
  })
})
