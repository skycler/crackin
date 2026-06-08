import { describe, it, expect } from 'vitest'
import {
  initialScoreState,
  onCorrect,
  onError,
  resolveMultiplier,
  nextMilestone,
  DEFAULT_MILESTONES,
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

// ── onCorrect ─────────────────────────────────────────────────────────────────

describe('onCorrect', () => {
  it('increments streak on correct answer', () => {
    const s = onCorrect(initialScoreState(), 500)
    expect(s.streak).toBe(1)
  })

  it('adds floor(1000/ms) × multiplier to total', () => {
    const s = onCorrect(initialScoreState(), 500)
    // floor(1000/500) × 1 = 2
    expect(s.total).toBe(2)
  })

  it('uses streak multiplier for scoring', () => {
    let s = initialScoreState()
    s = onCorrect(s, 1000) // streak 1, ×1 → +1
    s = onCorrect(s, 1000) // streak 2, ×1 → +1
    s = onCorrect(s, 1000) // streak 3, ×2 → +2
    expect(s.streak).toBe(3)
    expect(s.multiplier).toBe(2)
    expect(s.total).toBe(4)
  })

  it('reaches ×3 at 5-in-a-row', () => {
    let s = initialScoreState()
    for (let i = 0; i < 5; i++) {
      s = onCorrect(s, 1000)
    }
    expect(s.multiplier).toBe(3)
    expect(s.streak).toBe(5)
  })

  it('does not add negative total for very fast answers', () => {
    const s = onCorrect(initialScoreState(), 1)
    expect(s.total).toBeGreaterThan(0)
  })

  it('handles ms = 0 without throwing (guarded to 1ms)', () => {
    expect(() => onCorrect(initialScoreState(), 0)).not.toThrow()
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
    expect(s.multiplier).toBe(2)
    s = onError(s)
    expect(s.multiplier).toBe(1)
  })

  it('does not change total', () => {
    let s = onCorrect(initialScoreState(), 500)
    const totalBefore = s.total
    s = onError(s)
    expect(s.total).toBe(totalBefore)
  })
})

// ── resolveMultiplier ─────────────────────────────────────────────────────────

describe('resolveMultiplier', () => {
  it('returns 1 below first milestone', () => {
    expect(resolveMultiplier(0, DEFAULT_MILESTONES)).toBe(1)
    expect(resolveMultiplier(2, DEFAULT_MILESTONES)).toBe(1)
  })

  it('returns ×2 at streak 3', () => {
    expect(resolveMultiplier(3, DEFAULT_MILESTONES)).toBe(2)
    expect(resolveMultiplier(4, DEFAULT_MILESTONES)).toBe(2)
  })

  it('returns ×3 at streak 5', () => {
    expect(resolveMultiplier(5, DEFAULT_MILESTONES)).toBe(3)
    expect(resolveMultiplier(10, DEFAULT_MILESTONES)).toBe(3)
  })

  it('works with custom milestones', () => {
    const custom = [{ at: 2, multiplier: 5 }]
    expect(resolveMultiplier(1, custom)).toBe(1)
    expect(resolveMultiplier(2, custom)).toBe(5)
  })
})

// ── nextMilestone ─────────────────────────────────────────────────────────────

describe('nextMilestone', () => {
  it('returns first milestone when streak is 0', () => {
    const m = nextMilestone(0, DEFAULT_MILESTONES)
    expect(m?.at).toBe(3)
  })

  it('returns second milestone after first is reached', () => {
    const m = nextMilestone(3, DEFAULT_MILESTONES)
    expect(m?.at).toBe(5)
  })

  it('returns null when all milestones are reached', () => {
    expect(nextMilestone(5, DEFAULT_MILESTONES)).toBeNull()
    expect(nextMilestone(10, DEFAULT_MILESTONES)).toBeNull()
  })
})
