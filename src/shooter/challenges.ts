/**
 * Challenge generation for the Shooter scene.
 *
 * Produces Multiplication and Division challenges from the active drawers.
 * All logic is pure and stateless — no Phaser dependency.
 */

import { getTriples, type Triple } from '../domain/triples'
import type { SessionConfig, ShooterChallengeType } from '../config/session'

export interface MulChallenge {
  type: 'mul'
  triple: Triple
  /** The text shown to the player, e.g. "6 × 7 = ?" */
  prompt: string
  /** The correct answer */
  answer: number
}

export interface DivChallenge {
  type: 'div'
  triple: Triple
  /** The text shown to the player, e.g. "42 ÷ 6 = ?" */
  prompt: string
  /** The correct answer */
  answer: number
}

export type ShooterChallenge = MulChallenge | DivChallenge

/**
 * Returns all possible Multiplication/Division challenges for the
 * active drawers in the session config, filtered to the requested
 * challenge types.
 */
export function buildChallengePool(
  config: Pick<SessionConfig, 'drawers' | 'shooter'>,
): ShooterChallenge[] {
  const { drawers, shooter } = config
  const activeTypes = new Set<ShooterChallengeType>(shooter.challenges)

  const challenges: ShooterChallenge[] = []

  for (const triple of getTriples()) {
    const { a, b, product } = triple
    // Only include triples where at least one factor is an active drawer
    // and both factors are in 2..9 (drawer range).
    if (!drawers.has(a) && !drawers.has(b)) continue
    // Exclude trivial ×1 triples
    if (a === 1 || b === 1) continue

    if (activeTypes.has('mul')) {
      challenges.push({
        type: 'mul',
        triple,
        prompt: `${a} × ${b} = ?`,
        answer: product,
      })
    }

    if (activeTypes.has('div')) {
      // Divide by a → answer is b
      challenges.push({
        type: 'div',
        triple,
        prompt: `${product} ÷ ${a} = ?`,
        answer: b,
      })
      if (a !== b) {
        // Divide by b → answer is a
        challenges.push({
          type: 'div',
          triple,
          prompt: `${product} ÷ ${b} = ?`,
          answer: a,
        })
      }
    }
  }

  return challenges
}

/**
 * Picks a random challenge from the pool.
 * Uses the provided random function for testability.
 */
export function pickChallenge(
  pool: ShooterChallenge[],
  random: () => number = Math.random,
): ShooterChallenge {
  if (pool.length === 0) {
    throw new Error('Challenge pool is empty')
  }
  return pool[Math.floor(random() * pool.length)]
}

/**
 * Generates N random distractor answers from the same product space,
 * ensuring no duplicates and the correct answer is excluded.
 * This is the basic version; distractor quality is improved in issue #7.
 */
export function basicDistractors(
  answer: number,
  count: number,
  random: () => number = Math.random,
): number[] {
  const allProducts = new Set(getTriples().map((t) => t.product))
  allProducts.delete(answer)
  const pool = [...allProducts]
  const chosen = new Set<number>()
  let attempts = 0
  while (chosen.size < count && attempts < 1000) {
    const candidate = pool[Math.floor(random() * pool.length)]
    chosen.add(candidate)
    attempts++
  }
  return [...chosen].slice(0, count)
}
