import { describe, it, expect } from 'vitest'
import { buildChallengePool, pickChallenge, basicDistractors, buildClassifyChallenge, scaleChallenge } from './challenges'
import type { MulChallenge, DivChallenge } from './challenges'
import { DEFAULT_CONFIG } from '../config/session'

describe('buildChallengePool', () => {
  it('returns a non-empty pool for the default config', () => {
    const pool = buildChallengePool(DEFAULT_CONFIG)
    expect(pool.length).toBeGreaterThan(0)
  })

  it('generates unscaled base challenges (distractorScale=1)', () => {
    const config = { ...DEFAULT_CONFIG, shooter: { ...DEFAULT_CONFIG.shooter, challenges: ['mul' as const] } }
    const pool = buildChallengePool(config)
    expect(pool.every((c) => c.type !== 'mul' || c.distractorScale === 1)).toBe(true)
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
      if (c.type !== 'mul') continue
      expect(c.answer).toBe(c.triple.a * c.triple.b)
    }
  })

  it('excludes trivial ×1 triples', () => {
    const pool = buildChallengePool(DEFAULT_CONFIG).filter(
      (c): c is MulChallenge | DivChallenge => c.type === 'mul' || c.type === 'div',
    )
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
    expect(
      pool.every((c) => c.type !== 'classify' && (c.triple.a === 7 || c.triple.b === 7)),
    ).toBe(true)
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
    // Always pick last element — pass undefined for activeTypes to use flat sampling
    const last = pickChallenge(pool, undefined, () => 0.9999)
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

// ── scaleChallenge ────────────────────────────────────────────────────────────

describe('scaleChallenge', () => {
  const config = { ...DEFAULT_CONFIG, shooter: { ...DEFAULT_CONFIG.shooter, challenges: ['mul' as const, 'div' as const] } }
  const pool = buildChallengePool(config)
  const mulBase = pool.find((c): c is MulChallenge => c.type === 'mul')!
  const divBase = pool.find((c): c is DivChallenge => c.type === 'div')!

  it('returns challenge unchanged when maxZeros=0', () => {
    expect(scaleChallenge(mulBase, 0)).toBe(mulBase)
  })

  it('may return challenge unchanged when zeros rolls 0', () => {
    // Inject RNG that always picks 0 → zeros=0
    const result = scaleChallenge(mulBase, 3, () => 0)
    expect(result).toBe(mulBase)
  })

  it('mul: scales answer and distractorScale by chosen zeros', () => {
    // RNG: first call (zeros) → 1/4 * 4 = 1 zero; second call (factor) → 0 (applyToA)
    const result = scaleChallenge(mulBase, 3, (() => {
      let n = 0
      return () => [0.26, 0][n++]  // zeros=floor(0.26*4)=1; applyToA=true
    })()) as MulChallenge
    const { a, product } = mulBase.triple
    expect(result.answer).toBe(product * 10)
    expect(result.distractorScale).toBe(10)
    expect(result.prompt).toContain(`${a * 10}`)
  })

  it('div: divisor scaled → answer stays unscaled, distractorScale=1', () => {
    // Find a div challenge where answer===b (divisor is a)
    const ch = pool.find((c): c is DivChallenge => c.type === 'div' && c.answer === c.triple.b)!
    // zeros=1, applyToA=true (divisor is a → divisor scales, answer=b stays)
    const result = scaleChallenge(ch, 1, (() => {
      let n = 0
      return () => [0.9, 0][n++]  // zeros=floor(0.9*2)=1; applyToA=true
    })()) as DivChallenge
    expect(result.answer).toBe(ch.triple.b)
    expect(result.distractorScale).toBe(1)
    expect(result.prompt).toContain(`${ch.triple.a * 10}`)
  })

  it('div: answer scaled → distractorScale matches scale', () => {
    // Find a div challenge where answer===b (divisor is a), force applyToB
    const ch = pool.find((c): c is DivChallenge => c.type === 'div' && c.answer === c.triple.b)!
    // zeros=1, applyToA=false (answer is b → answer scales)
    const result = scaleChallenge(ch, 1, (() => {
      let n = 0
      return () => [0.9, 0.9][n++]  // zeros=1; applyToA=false
    })()) as DivChallenge
    expect(result.answer).toBe(ch.triple.b * 10)
    expect(result.distractorScale).toBe(10)
  })

  it('classify: scales all products', () => {
    const classifyPool = buildChallengePool({
      ...DEFAULT_CONFIG,
      shooter: { ...DEFAULT_CONFIG.shooter, challenges: ['classify' as const] },
    })
    const base = classifyPool[0]
    // zeros=1 (RNG returns 0.6 → floor(0.6*2)=1)
    const result = scaleChallenge(base, 1, () => 0.6)
    if (result.type !== 'classify' || base.type !== 'classify') return
    expect(result.correctAnswers).toEqual(base.correctAnswers.map((p) => p * 10))
    expect(result.distractors).toEqual(base.distractors.map((p) => p * 10))
  })
})
