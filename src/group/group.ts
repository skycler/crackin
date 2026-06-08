/**
 * Group mini-game logic — pure, stateless, no Phaser dependency.
 *
 * A cluster of numbers is shown; the player taps drawer labels (2–9)
 * to claim coverage. The round ends when the minimum drawer set
 * covering all numbers is found.
 *
 * Domain: a drawer "covers" a number if that drawer is valid for it
 * (i.e. number = drawer × m where m ∈ 1..10).
 */

import { getDrawers } from '../domain/triples'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GroupRound {
  /** The cluster of numbers the player must cover. */
  numbers: number[]
  /**
   * The minimum set of drawers that covers every number.
   * There may be multiple minimal solutions; this is one valid solution.
   */
  minimumSolution: number[]
}

// ── Round generation ──────────────────────────────────────────────────────────

/**
 * Generates a Group round with `size` numbers (default 4–6).
 * Only numbers that have at least one valid active drawer are included.
 *
 * @param activeDrawers  Drawers available in the session (subset of 2–9)
 * @param size           How many numbers to include (clamped to available)
 * @param random         Injectable RNG
 */
export function generateGroupRound(
  activeDrawers: ReadonlySet<number>,
  size = 5,
  random: () => number = Math.random,
): GroupRound {
  // Build pool of (number, validDrawers) pairs
  const pool: { n: number; drawers: number[] }[] = []
  for (const drawer of activeDrawers) {
    for (let m = 2; m <= 10; m++) {
      const n = drawer * m
      const validDrawers = getDrawers(n).filter((d) => activeDrawers.has(d))
      if (validDrawers.length > 0) {
        pool.push({ n, drawers: validDrawers })
      }
    }
  }

  // Deduplicate by number
  const seen = new Map<number, number[]>()
  for (const { n, drawers } of pool) {
    if (!seen.has(n)) seen.set(n, drawers)
  }

  const candidates = [...seen.entries()].map(([n, drawers]) => ({ n, drawers }))

  // Shuffle and pick `size` entries
  const shuffled = [...candidates].sort(() => random() - 0.5)
  const picked = shuffled.slice(0, Math.min(size, shuffled.length))
  const numbers = picked.map((p) => p.n)

  const minimumSolution = findMinimumCover(numbers, activeDrawers)

  return { numbers, minimumSolution }
}

// ── Coverage helpers ──────────────────────────────────────────────────────────

/**
 * Returns which numbers from `cluster` the given `drawer` covers.
 */
export function coveredBy(cluster: number[], drawer: number): number[] {
  return cluster.filter((n) => {
    const drawers = getDrawers(n)
    return drawers.includes(drawer)
  })
}

/**
 * Returns true if the selected set of drawers covers every number in `cluster`.
 */
export function isFullyCovered(cluster: number[], selectedDrawers: number[]): boolean {
  return cluster.every((n) => {
    const drawers = getDrawers(n)
    return selectedDrawers.some((d) => drawers.includes(d))
  })
}

/**
 * Returns true if the selection is the minimum set (no drawer is redundant).
 */
export function isMinimumSet(cluster: number[], selectedDrawers: number[]): boolean {
  if (!isFullyCovered(cluster, selectedDrawers)) return false
  // Check that removing any one drawer breaks coverage
  return selectedDrawers.every((d) => {
    const without = selectedDrawers.filter((x) => x !== d)
    return !isFullyCovered(cluster, without)
  })
}

/**
 * Finds one minimum cover set using greedy set cover.
 * Returns the drawer numbers in the minimum set.
 */
export function findMinimumCover(
  cluster: number[],
  activeDrawers: ReadonlySet<number>,
): number[] {
  const uncovered = new Set(cluster)
  const chosen: number[] = []
  const remaining = new Set(activeDrawers)

  while (uncovered.size > 0 && remaining.size > 0) {
    // Pick the drawer that covers the most uncovered numbers
    let best: number | null = null
    let bestCount = 0

    for (const d of remaining) {
      const count = [...uncovered].filter((n) => getDrawers(n).includes(d)).length
      if (count > bestCount) {
        bestCount = count
        best = d
      }
    }

    if (best === null) break // no progress

    chosen.push(best)
    remaining.delete(best)

    for (const n of [...uncovered]) {
      if (getDrawers(n).includes(best)) uncovered.delete(n)
    }
  }

  return chosen
}
