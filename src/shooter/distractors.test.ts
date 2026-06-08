import { describe, it, expect } from 'vitest'
import { generateDistractors } from './distractors'

// Helper: run multiple times and collect all results (for probabilistic tests)
function runMany(answer: number, count: number, runs = 30): number[][] {
  return Array.from({ length: runs }, () => generateDistractors(answer, count))
}

describe('generateDistractors', () => {
  it('returns exactly count distractors', () => {
    expect(generateDistractors(42, 4)).toHaveLength(4)
    expect(generateDistractors(35, 6)).toHaveLength(6)
  })

  it('never includes the correct answer', () => {
    for (const result of runMany(42, 4)) {
      expect(result).not.toContain(42)
    }
  })

  it('returns unique values', () => {
    for (const result of runMany(42, 4)) {
      expect(new Set(result).size).toBe(result.length)
    }
  })

  it('all returned values are positive', () => {
    for (const result of runMany(42, 4)) {
      expect(result.every((n) => n > 0)).toBe(true)
    }
  })

  // ── Pool 1: nearby ──────────────────────────────────────────────────────

  it('pool 1: includes at least one nearby value (±1–2) across runs', () => {
    const nearby = new Set([40, 41, 43, 44])
    const allResults = runMany(42, 4, 50).flat()
    const hasNearby = allResults.some((n) => nearby.has(n))
    expect(hasNearby).toBe(true)
  })

  // ── Pool 2: same-drawer ─────────────────────────────────────────────────

  it('pool 2: includes same-drawer products across runs for 42 (drawers 6 and 7)', () => {
    // Same-drawer 6 products: 12, 18, 24, 30, 36, 48, 54, 60
    // Same-drawer 7 products: 7, 14, 21, 28, 35, 49, 56, 63, 70
    const sameDrawer6 = new Set([12, 18, 24, 30, 36, 48, 54, 60])
    const sameDrawer7 = new Set([7, 14, 21, 28, 35, 49, 56, 63, 70])
    const allResults = runMany(42, 4, 50).flat()
    const hasSameDrawer = allResults.some((n) => sameDrawer6.has(n) || sameDrawer7.has(n))
    expect(hasSameDrawer).toBe(true)
  })

  // ── Pool 3: cross-drawer ────────────────────────────────────────────────

  it('pool 3: includes cross-drawer products across runs for 42', () => {
    // Adjacent drawers to 6 = {5, 7}; adjacent to 7 = {6, 8}
    // Cross-drawer: drawers 5 and 8 products
    const drawer5 = new Set([10, 15, 20, 25, 30, 35, 40, 45, 50])
    const drawer8 = new Set([16, 24, 32, 40, 48, 56, 64, 72, 80])
    const allResults = runMany(42, 4, 50).flat()
    const hasCross = allResults.some((n) => drawer5.has(n) || drawer8.has(n))
    expect(hasCross).toBe(true)
  })

  // ── Edge cases ──────────────────────────────────────────────────────────

  it('handles answer with few nearby values gracefully (e.g. answer = 2)', () => {
    // ±1 = 1 (excluded — product 1 not in base 2–9 range but valid triple)
    // ±2 = 4 — valid
    const result = generateDistractors(2, 3)
    expect(result).toHaveLength(3)
    expect(result).not.toContain(2)
  })

  it('handles requesting count = 1', () => {
    const result = generateDistractors(42, 1)
    expect(result).toHaveLength(1)
    expect(result[0]).not.toBe(42)
  })

  it('handles a high count without throwing (falls back gracefully)', () => {
    // The total product space is ~40 unique values; requesting count = 30 should
    // return as many as available without crash
    expect(() => generateDistractors(42, 30)).not.toThrow()
  })

  it('is deterministic with a seeded random function', () => {
    let seed = 0
    const seeded = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    const a = generateDistractors(42, 4, seeded)
    seed = 0
    const b = generateDistractors(42, 4, seeded)
    expect(a).toEqual(b)
  })
})
