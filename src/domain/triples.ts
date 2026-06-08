/**
 * Core domain: Triples, Drawers, and decimal-strip helpers.
 *
 * Terminology from CONTEXT.md:
 *   Triple   — (a, b, p) where a × b = p and a, b ∈ 1..10
 *   Drawer   — the family of products for factor n (n ∈ 2..9)
 *   Base space — the full 10×10 table; both factors must be ≤ 10
 */

export interface Triple {
  a: number
  b: number
  product: number
}

/**
 * Returns all unique triples (a, b, p) from the base space where
 * a, b ∈ 1..10.  Each distinct (a, b) pair with a ≤ b appears once.
 */
export function getTriples(): Triple[] {
  const triples: Triple[] = []
  for (let a = 1; a <= 10; a++) {
    for (let b = a; b <= 10; b++) {
      triples.push({ a, b, product: a * b })
    }
  }
  return triples
}

/**
 * Returns all valid drawer numbers for a given product.
 *
 * Drawer n is valid for product p only if p = n × m where both
 * n ≤ 10 and m ≤ 10.  Trailing zeros are stripped before the lookup
 * so that 420 and 42 share the same drawers.
 *
 * Only drawers 2–9 are returned (drawers 1 and 10 are not meaningful
 * recall targets per the domain rules).
 */
export function getDrawers(product: number): number[] {
  const core = stripZeros(product)
  const drawers: number[] = []
  for (let n = 2; n <= 9; n++) {
    if (core % n === 0) {
      const other = core / n
      if (Number.isInteger(other) && other >= 1 && other <= 10) {
        drawers.push(n)
      }
    }
  }
  return drawers.sort((a, b) => a - b)
}

/**
 * Strips trailing zeros from n and returns the core pattern.
 * 420 → 42, 4200 → 42, 42 → 42, 7 → 7.
 * n must be a positive integer.
 */
export function stripZeros(n: number): number {
  if (n <= 0 || !Number.isInteger(n)) {
    throw new RangeError(`stripZeros expects a positive integer, got ${n}`)
  }
  let result = n
  while (result % 10 === 0) {
    result /= 10
  }
  return result
}
