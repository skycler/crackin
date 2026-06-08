import { describe, it, expect } from 'vitest'
import { getTriples, getDrawers, stripZeros } from './triples'

// ── getTriples ────────────────────────────────────────────────────────────────

describe('getTriples', () => {
  it('returns 55 unique (a ≤ b) triples from the base space', () => {
    const triples = getTriples()
    // C(10,2) + 10 = 45 + 10 = 55
    expect(triples).toHaveLength(55)
  })

  it('each triple satisfies a × b === product', () => {
    for (const { a, b, product } of getTriples()) {
      expect(a * b).toBe(product)
    }
  })

  it('all factors are within 1–10', () => {
    for (const { a, b } of getTriples()) {
      expect(a).toBeGreaterThanOrEqual(1)
      expect(a).toBeLessThanOrEqual(10)
      expect(b).toBeGreaterThanOrEqual(1)
      expect(b).toBeLessThanOrEqual(10)
    }
  })

  it('contains the triple (6, 7, 42)', () => {
    const triples = getTriples()
    expect(triples).toContainEqual({ a: 6, b: 7, product: 42 })
  })

  it('contains (1, 1, 1) and (10, 10, 100)', () => {
    const triples = getTriples()
    expect(triples).toContainEqual({ a: 1, b: 1, product: 1 })
    expect(triples).toContainEqual({ a: 10, b: 10, product: 100 })
  })
})

// ── stripZeros ────────────────────────────────────────────────────────────────

describe('stripZeros', () => {
  it('removes a single trailing zero', () => {
    expect(stripZeros(420)).toBe(42)
  })

  it('removes multiple trailing zeros', () => {
    expect(stripZeros(4200)).toBe(42)
    expect(stripZeros(10000)).toBe(1)
  })

  it('returns numbers with no trailing zero unchanged', () => {
    expect(stripZeros(42)).toBe(42)
    expect(stripZeros(7)).toBe(7)
  })

  it('handles 10 → 1', () => {
    expect(stripZeros(10)).toBe(1)
  })

  it('throws on zero or negative input', () => {
    expect(() => stripZeros(0)).toThrow()
    expect(() => stripZeros(-5)).toThrow()
  })
})

// ── getDrawers ────────────────────────────────────────────────────────────────

describe('getDrawers', () => {
  it('42 belongs to drawers 6 and 7 only', () => {
    expect(getDrawers(42)).toEqual([6, 7])
  })

  it('3×14 is excluded — 14 is outside the base space', () => {
    expect(getDrawers(42)).not.toContain(3)
  })

  it('420 returns the same drawers as 42 (decimal extension)', () => {
    expect(getDrawers(420)).toEqual(getDrawers(42))
  })

  it('4200 returns the same drawers as 42', () => {
    expect(getDrawers(4200)).toEqual(getDrawers(42))
  })

  it('35 belongs to drawers 5 and 7', () => {
    expect(getDrawers(35)).toEqual([5, 7])
  })

  it('36 belongs to drawers 4, 6, and 9', () => {
    // 4×9, 6×6, 9×4 — but 3×12 excluded (12 > 10)
    expect(getDrawers(36)).toEqual([4, 6, 9])
  })

  it('7 belongs to drawer 7 only (7×1)', () => {
    expect(getDrawers(7)).toEqual([7])
  })

  it('returns an empty array for a product with no valid drawers in range', () => {
    // 11 has no valid (n, m) with both ≤ 10 and n ∈ 2..9; 11 is prime > 10
    expect(getDrawers(11)).toEqual([])
  })

  it('result is sorted in ascending order', () => {
    const drawers = getDrawers(72)
    expect(drawers).toEqual([...drawers].sort((a, b) => a - b))
  })
})
