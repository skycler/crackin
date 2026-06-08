import { describe, it, expect } from 'vitest'
import {
  generateGroupRound,
  coveredBy,
  isFullyCovered,
  isMinimumSet,
  findMinimumCover,
} from './group'

const allDrawers = new Set([2, 3, 4, 5, 6, 7, 8, 9])

// ── generateGroupRound ────────────────────────────────────────────────────────

describe('generateGroupRound', () => {
  it('returns the requested number of numbers', () => {
    const round = generateGroupRound(allDrawers, 5)
    expect(round.numbers).toHaveLength(5)
  })

  it('all numbers are covered by at least one active drawer', () => {
    const round = generateGroupRound(allDrawers, 6)
    for (const n of round.numbers) {
      const covered = isFullyCovered([n], [...allDrawers])
      expect(covered).toBe(true)
    }
  })

  it('minimumSolution covers all numbers', () => {
    for (let i = 0; i < 10; i++) {
      const round = generateGroupRound(allDrawers, 5)
      expect(isFullyCovered(round.numbers, round.minimumSolution)).toBe(true)
    }
  })

  it('works with a restricted drawer set', () => {
    const small = new Set([3, 6, 9])
    const round = generateGroupRound(small, 4)
    expect(round.numbers.length).toBeGreaterThan(0)
    expect(isFullyCovered(round.numbers, round.minimumSolution)).toBe(true)
  })
})

// ── coveredBy ─────────────────────────────────────────────────────────────────

describe('coveredBy', () => {
  it('returns numbers covered by the given drawer', () => {
    const cluster = [42, 35, 24, 11]
    const covered = coveredBy(cluster, 7)
    // 42 = 7×6 ✓, 35 = 7×5 ✓, 24 has no ×7, 11 prime
    expect(covered).toContain(42)
    expect(covered).toContain(35)
    expect(covered).not.toContain(24)
    expect(covered).not.toContain(11)
  })

  it('returns empty array when nothing is covered', () => {
    expect(coveredBy([11, 13, 17], 7)).toEqual([])
  })
})

// ── isFullyCovered ────────────────────────────────────────────────────────────

describe('isFullyCovered', () => {
  it('returns true when all numbers are covered', () => {
    // 42 = 6×7, 35 = 5×7 — drawers [6,7] and [5,7]
    expect(isFullyCovered([42, 35], [7])).toBe(true)
  })

  it('returns false when some numbers are uncovered', () => {
    // 24 ∈ drawer 4,6,8,3 — not covered by drawer 7
    expect(isFullyCovered([42, 24], [7])).toBe(false)
  })

  it('returns false for empty drawer selection', () => {
    expect(isFullyCovered([42], [])).toBe(false)
  })

  it('returns true for empty cluster (vacuously)', () => {
    expect(isFullyCovered([], [7])).toBe(true)
  })
})

// ── isMinimumSet ──────────────────────────────────────────────────────────────

describe('isMinimumSet', () => {
  it('returns true for a tight minimum cover', () => {
    // 42 needs drawer 6 or 7; 35 needs 5 or 7; if we pick [7] it covers both
    expect(isMinimumSet([42, 35], [7])).toBe(true)
  })

  it('returns false when a redundant drawer is included', () => {
    // [6, 7] both cover 42; adding 6 is redundant if 7 already covers all
    expect(isMinimumSet([42, 35], [6, 7])).toBe(false)
  })

  it('returns false when selection does not cover all', () => {
    expect(isMinimumSet([42, 24], [7])).toBe(false)
  })
})

// ── findMinimumCover ──────────────────────────────────────────────────────────

describe('findMinimumCover', () => {
  it('finds a cover that is fully covering', () => {
    for (let i = 0; i < 10; i++) {
      const round = generateGroupRound(allDrawers, 5)
      const cover = findMinimumCover(round.numbers, allDrawers)
      expect(isFullyCovered(round.numbers, cover)).toBe(true)
    }
  })

  it('returns a single drawer when one drawer covers all numbers', () => {
    // All multiples of 7 in base space
    const cluster = [7, 14, 21, 28]
    const cover = findMinimumCover(cluster, allDrawers)
    expect(cover).toContain(7)
    expect(cover.length).toBe(1)
  })
})
