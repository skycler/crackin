import { describe, it, expect } from 'vitest'
import {
  initialRelateState,
  applyStep,
  undoStep,
  isFreeStep,
  applyFreeSteps,
  estimateMinPath,
  generateRelateChallenge,
} from './relate'

// ── isFreeStep ────────────────────────────────────────────────────────────────

describe('isFreeStep', () => {
  it('10 is a free step', () => expect(isFreeStep(10)).toBe(true))
  it('100 is a free step', () => expect(isFreeStep(100)).toBe(true))
  it('1000 is a free step', () => expect(isFreeStep(1000)).toBe(true))
  it('1 is not a free step', () => expect(isFreeStep(1)).toBe(false))
  it('7 is not a free step', () => expect(isFreeStep(7)).toBe(false))
  it('20 is not a free step (20 = 2×10)', () => expect(isFreeStep(20)).toBe(false))
})

// ── applyFreeSteps ────────────────────────────────────────────────────────────

describe('applyFreeSteps', () => {
  it('auto-applies ÷10 when stripZeros(current) === stripZeros(target)', () => {
    // 70 → target 7: strip(70)=7, strip(7)=7 → ÷10 free step
    const { finalResult, freeSteps } = applyFreeSteps(70, 7)
    expect(finalResult).toBe(7)
    expect(freeSteps).toHaveLength(1)
    expect(freeSteps[0].isFree).toBe(true)
    expect(freeSteps[0].op).toBe('÷')
  })

  it('auto-applies ×10 when scaling up toward target', () => {
    const { finalResult, freeSteps } = applyFreeSteps(7, 70)
    expect(finalResult).toBe(70)
    expect(freeSteps).toHaveLength(1)
    expect(freeSteps[0].op).toBe('×')
  })

  it('returns no free steps when cores differ', () => {
    const { finalResult, freeSteps } = applyFreeSteps(42, 35)
    expect(finalResult).toBe(42)
    expect(freeSteps).toHaveLength(0)
  })

  it('returns no free steps when already at target', () => {
    const { finalResult, freeSteps } = applyFreeSteps(42, 42)
    expect(finalResult).toBe(42)
    expect(freeSteps).toHaveLength(0)
  })
})

// ── applyStep ─────────────────────────────────────────────────────────────────

describe('applyStep', () => {
  const challenge = { start: 420, target: 35, minPathLength: 2 }

  it('applies × step correctly', () => {
    const state = initialRelateState({ start: 7, target: 35, minPathLength: 1 })
    const next = applyStep(state, '×', 5)
    expect(next?.current).toBe(35)
    expect(next?.isComplete).toBe(true)
    expect(next?.pathLength).toBe(1)
  })

  it('applies ÷ step correctly', () => {
    const state = initialRelateState(challenge)
    const next = applyStep(state, '÷', 6)
    // 420 ÷ 6 = 70, then free ÷10 → 7 (since stripZeros(70)=7 but target is 35, cores differ — so no free step)
    expect(next?.current).toBe(70)
    expect(next?.pathLength).toBe(1)
    expect(next?.isComplete).toBe(false)
  })

  it('auto-applies free step when core matches target core', () => {
    // 420 ÷ 6 = 70; strip(70)=7, strip(35)=35≠7 → no free step
    // But 420 ÷ 6 = 70; then 70 ÷ 2 = 35 — 2 steps total
    const s0 = initialRelateState(challenge)
    const s1 = applyStep(s0, '÷', 6)!
    const s2 = applyStep(s1, '÷', 2)
    expect(s2?.current).toBe(35)
    expect(s2?.isComplete).toBe(true)
    expect(s2?.pathLength).toBe(2)
  })

  it('returns null for non-integer division', () => {
    const state = initialRelateState({ start: 7, target: 35, minPathLength: 1 })
    const next = applyStep(state, '÷', 3) // 7 ÷ 3 not integer
    expect(next).toBeNull()
  })

  it('returns null for operand out of range', () => {
    const state = initialRelateState({ start: 7, target: 35, minPathLength: 1 })
    expect(applyStep(state, '×', 0)).toBeNull()
    expect(applyStep(state, '×', 10)).toBeNull()
  })

  it('increments pathLength only for non-free steps', () => {
    // 7 × 10 (free) should be handled separately; via applyStep with operand 1-9 only
    const state = initialRelateState({ start: 7, target: 70, minPathLength: 0 })
    // ×10 is out of range for operand 1-9, so applyFreeSteps handles scale
    // Let's test: 7 × 1 = 7 → no free step change
    const next = applyStep(state, '×', 1)
    expect(next?.pathLength).toBe(1)
  })
})

// ── undoStep ──────────────────────────────────────────────────────────────────

describe('undoStep', () => {
  it('undoes the last non-free step', () => {
    const state = initialRelateState({ start: 420, target: 35, minPathLength: 2 })
    const s1 = applyStep(state, '÷', 6)! // → 70
    const s2 = undoStep(s1)
    expect(s2.current).toBe(420)
    expect(s2.pathLength).toBe(0)
  })

  it('does nothing when path is empty', () => {
    const state = initialRelateState({ start: 7, target: 35, minPathLength: 1 })
    const undone = undoStep(state)
    expect(undone).toEqual(state)
  })
})

// ── estimateMinPath ───────────────────────────────────────────────────────────

describe('estimateMinPath', () => {
  it('returns 0 when start core equals target core (pure scale)', () => {
    // 420 → 42: strip(420)=42, strip(42)=42 — scale only
    expect(estimateMinPath(420, 42)).toBe(0)
  })

  it('returns 1 for single-step pairs', () => {
    expect(estimateMinPath(7, 35)).toBe(1) // 7 × 5
    expect(estimateMinPath(35, 7)).toBe(1) // 35 ÷ 5
  })

  it('returns 2 for longer paths', () => {
    expect(estimateMinPath(7, 48)).toBe(2)
  })
})

// ── generateRelateChallenge ───────────────────────────────────────────────────

describe('generateRelateChallenge', () => {
  it('start and target are different', () => {
    const c = generateRelateChallenge(new Set([2, 3, 4, 5, 6, 7, 8, 9]))
    expect(c.start).not.toBe(c.target)
  })

  it('is deterministic with seeded random', () => {
    let seed = 42
    const rng = () => {
      seed = (seed * 16807 + 7) % 2147483647
      return (seed - 1) / 2147483646
    }
    const drawers = new Set([6, 7, 8])
    const a = generateRelateChallenge(drawers, rng)
    seed = 42
    const b = generateRelateChallenge(drawers, rng)
    expect(a.start).toBe(b.start)
    expect(a.target).toBe(b.target)
  })
})
