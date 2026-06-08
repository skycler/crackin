/**
 * Targeted distractor generation for the Shooter scene.
 *
 * Three pools cover the real error surface:
 *   Pool 1 (nearby)     — ±1 and ±2 from the correct answer
 *   Pool 2 (same-drawer) — other valid products from the same drawer(s)
 *   Pool 3 (cross-drawer) — valid products from overlapping/adjacent drawers
 *
 * The function guarantees at least one from each non-empty pool,
 * fills the remaining slots from any available pool, and never includes
 * the correct answer or duplicates.
 */

import { getTriples, getDrawers } from '../domain/triples'

// Pre-computed set of all valid products in the base space
const ALL_PRODUCTS: ReadonlySet<number> = new Set(getTriples().map((t) => t.product))

/**
 * Returns `count` unique wrong answers for a given correct `answer`.
 * Does not require the full triple — only the answer is needed to build
 * the pools.
 *
 * @param answer  The correct answer
 * @param count   How many distractors to generate
 * @param random  Injectable RNG for deterministic testing
 * @param scale   10^decimalZeros — all returned values are multiples of this.
 *                Pass the same scale used to produce `answer` so distractors
 *                live in the same number space.
 */
export function generateDistractors(
  answer: number,
  count: number,
  random: () => number = Math.random,
  scale = 1,
): number[] {
  const excluded = new Set([answer])

  // ── Pool 1: nearby ± 1–2 steps (in scaled space) ─────────────────────────
  const nearby = buildNearbyPool(answer, excluded, scale)

  // ── Pool 2: same-drawer products (scaled) ────────────────────────────────
  const sameDrawer = buildSameDrawerPool(answer, excluded, scale)

  // ── Pool 3: cross-drawer products (scaled) ───────────────────────────────
  const crossDrawer = buildCrossDrawerPool(answer, excluded, scale)

  // ── Fill strategy: guarantee ≥1 from each non-empty pool ────────────────
  const chosen = new Set<number>()

  const pickFrom = (pool: number[]): boolean => {
    const available = pool.filter((n) => !chosen.has(n))
    if (available.length === 0) return false
    const pick = available[Math.floor(random() * available.length)]
    chosen.add(pick)
    return true
  }

  pickFrom(nearby)
  pickFrom(sameDrawer)
  pickFrom(crossDrawer)

  // Fill remaining from combined fallback
  const fallback = shuffled(
    [...nearby, ...sameDrawer, ...crossDrawer, ...fallbackPool(answer, excluded, scale)].filter(
      (n, i, arr) => arr.indexOf(n) === i,
    ),
    random,
  )

  for (const n of fallback) {
    if (chosen.size >= count) break
    chosen.add(n)
  }

  return [...chosen].slice(0, count)
}

// ── Pool builders ─────────────────────────────────────────────────────────────

/**
 * Nearby: answer ± 1 and ± 2 steps in scaled space (i.e. ± scale and ± 2*scale).
 * For scale=1 this is ±1, ±2 as before.
 */
function buildNearbyPool(answer: number, excluded: ReadonlySet<number>, scale = 1): number[] {
  return [-2, -1, 1, 2]
    .map((delta) => answer + delta * scale)
    .filter((n) => n > 0 && !excluded.has(n))
}

/**
 * Same-drawer products, scaled.
 * getDrawers strips trailing zeros so scaled answers resolve correctly.
 */
function buildSameDrawerPool(answer: number, excluded: ReadonlySet<number>, scale = 1): number[] {
  const drawers = getDrawers(answer)
  const products = new Set<number>()
  for (const t of getTriples()) {
    for (const d of drawers) {
      const scaled = t.product * scale
      if ((t.a === d || t.b === d) && !excluded.has(scaled)) {
        products.add(scaled)
      }
    }
  }
  return [...products]
}

/**
 * Cross-drawer products (adjacent drawers ±1), scaled.
 */
function buildCrossDrawerPool(answer: number, excluded: ReadonlySet<number>, scale = 1): number[] {
  const ownDrawers = new Set(getDrawers(answer))
  const adjacent = new Set<number>()
  for (const d of ownDrawers) {
    if (d - 1 >= 2) adjacent.add(d - 1)
    if (d + 1 <= 9) adjacent.add(d + 1)
  }
  const products = new Set<number>()
  for (const t of getTriples()) {
    for (const d of adjacent) {
      const scaled = t.product * scale
      if ((t.a === d || t.b === d) && !excluded.has(scaled)) {
        products.add(scaled)
      }
    }
  }
  return [...products]
}

/** Last-resort pool: any valid (scaled) product not already excluded. */
function fallbackPool(answer: number, excluded: ReadonlySet<number>, scale = 1): number[] {
  return [...ALL_PRODUCTS].map((p) => p * scale).filter((n) => !excluded.has(n) && n !== answer)
}

function shuffled<T>(arr: T[], random: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
