import { describe, it, expect } from 'vitest'
import { buildChallengePool, pickChallenge, basicDistractors, buildClassifyChallenge } from './challenges'
import { DEFAULT_CONFIG } from '../config/session'

describe('buildChallengePool', () => {
  it('returns a non-empty pool for the default config', () => {
    const pool = buildChallengePool(DEFAULT_CONFIG)
    expect(pool.length).toBeGreaterThan(0)
  })

  it('only includes mul challenges when only mul is active', () => {
    const config = {
      ...DEFAULT_CONFIG,
      shooter: { ...DEFAULT_CONFIG.shooter, challenges: ['mul' as const] },
    }
    const pool = buildChallengePool(config)
    expect(pool.every((c) => c.type === 'mul')).toBe(true)
  })

  it('only includes div challenges when only div is active', () => {
    const config = {
      ...DEFAULT_CONFIG,
      shooter: { ...DEFAULT_CONFIG.shooter, challenges: ['div' as const] },
    }
    const pool = buildChallengePool(config)
    expect(pool.every((c) => c.type === 'div')).toBe(true)
  })

  it('prompt for mul challenge contains ×', () => {
    const config = {
      ...DEFAULT_CONFIG,
      shooter: { ...DEFAULT_CONFIG.shooter, challenges: ['mul' as const] },
    }
    const pool = buildChallengePool(config)
    expect(pool.every((c) => c.prompt.includes('×'))).toBe(true)
  })

  it('prompt for div challenge contains ÷', () => {
    const config = {
      ...DEFAULT_CONFIG,
      shooter: { ...DEFAULT_CONFIG.shooter, challenges: ['div' as const] },
    }
    const pool = buildChallengePool(config)
    expect(pool.every((c) => c.prompt.includes('÷'))).toBe(true)
  })

  it('answer matches the triple for mul challenges', () => {
    const config = {
      ...DEFAULT_CONFIG,
      shooter: { ...DEFAULT_CONFIG.shooter, challenges: ['mul' as const] },
    }
    for (const c of buildChallengePool(config)) {
      expect(c.answer).toBe(c.triple.a * c.triple.b)
    }
  })

  it('excludes trivial ×1 triples', () => {
    const pool = buildChallengePool(DEFAULT_CONFIG)
    expect(pool.every((c) => c.triple.a > 1 && c.triple.b > 1)).toBe(true)
  })

  it('excludes triples not in active drawers', () => {
    const config = {
      ...DEFAULT_CONFIG,
      drawers: new Set([7]),
      shooter: { ...DEFAULT_CONFIG.shooter, challenges: ['mul' as const] },
    }
    const pool = buildChallengePool(config)
    // Every triple must have 7 as a or b
    expect(pool.every((c) => c.triple.a === 7 || c.triple.b === 7)).toBe(true)
  })
})

describe('pickChallenge', () => {
  it('returns a challenge from the pool', () => {
    const pool = buildChallengePool(DEFAULT_CONFIG)
    const picked = pickChallenge(pool)
    expect(pool).toContainEqual(picked)
  })

  it('throws when pool is empty', () => {
    expect(() => pickChallenge([])).toThrow()
  })

  it('uses the provided random function', () => {
    const pool = buildChallengePool(DEFAULT_CONFIG)
    // Always pick last element
    const last = pickChallenge(pool, () => 0.9999)
    expect(last).toBe(pool[pool.length - 1])
  })
})

describe('basicDistractors', () => {
  it('returns exactly count distractors', () => {
    const result = basicDistractors(42, 4)
    expect(result).toHaveLength(4)
  })

  it('never includes the correct answer', () => {
    for (let i = 0; i < 20; i++) {
      const result = basicDistractors(42, 4)
      expect(result).not.toContain(42)
    }
  })

  it('returns unique values', () => {
    const result = basicDistractors(42, 4)
    expect(new Set(result).size).toBe(result.length)
  })
})

// ── buildClassifyChallenge ────────────────────────────────────────────────────

describe('buildClassifyChallenge', () => {
  const allDrawers = new Set([2, 3, 4, 5, 6, 7, 8, 9])

  it('returns a classify challenge with type "classify"', () => {
    const c = buildClassifyChallenge(7, allDrawers)
    expect(c?.type).toBe('classify')
  })

  it('sets the drawer number correctly', () => {
    const c = buildClassifyChallenge(7, allDrawers)
    expect(c?.drawer).toBe(7)
  })

  it('prompt contains the drawer number', () => {
    const c = buildClassifyChallenge(7, allDrawers)
    expect(c?.prompt).toContain('7')
  })

  it('correctAnswers all belong to drawer 7', () => {
    const c = buildClassifyChallenge(7, allDrawers)!
    for (const p of c.correctAnswers) {
      expect(p % 7).toBe(0)
    }
  })

  it('distractors do not include products belonging to drawer 7', () => {
    const c = buildClassifyChallenge(7, allDrawers)!
    for (const d of c.distractors) {
      // A distractor for drawer 7 should not be divisible by 7
      // (or the other factor would be > 10)
      const other = d / 7
      expect(Number.isInteger(other) && other <= 10).toBe(false)
    }
  })

  it('no overlap between correctAnswers and distractors', () => {
    const c = buildClassifyChallenge(7, allDrawers)!
    const correctSet = new Set(c.correctAnswers)
    for (const d of c.distractors) {
      expect(correctSet.has(d)).toBe(false)
    }
  })

  it('buildChallengePool includes classify challenges when active', () => {
    const config = {
      ...DEFAULT_CONFIG,
      shooter: { ...DEFAULT_CONFIG.shooter, challenges: ['classify' as const] },
    }
    const pool = buildChallengePool(config)
    expect(pool.every((c) => c.type === 'classify')).toBe(true)
    expect(pool.length).toBeGreaterThan(0)
  })

  it('buildChallengePool excludes classify challenges when not active', () => {
    const config = {
      ...DEFAULT_CONFIG,
      shooter: { ...DEFAULT_CONFIG.shooter, challenges: ['mul' as const] },
    }
    const pool = buildChallengePool(config)
    expect(pool.some((c) => c.type === 'classify')).toBe(false)
  })
})
