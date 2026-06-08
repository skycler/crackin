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
  /** The text shown to the player, e.g. "6 × 70 = ?" */
  prompt: string
  /** The correct answer (scaled by 10^decimalZeros) */
  answer: number
  /** Scale factor used to generate same-space distractors (10^decimalZeros). */
  distractorScale: number
}

export interface DivChallenge {
  type: 'div'
  triple: Triple
  /** The text shown to the player, e.g. "420 ÷ 60 = ?" */
  prompt: string
  /** The correct answer (always an unscaled factor). */
  answer: number
  /** Scale factor for distractor generation (always 1 for div challenges). */
  distractorScale: number
}

export interface ClassifyChallenge {
  type: 'classify'
  /** The drawer number being classified, e.g. 7 */
  drawer: number
  /** The text shown to the player, e.g. "Drawer 7" */
  prompt: string
  /** Products that belong to this drawer (correct tiles) */
  correctAnswers: number[]
  /** Products that do NOT belong to this drawer (distractor tiles) */
  distractors: number[]
}

export type ShooterChallenge = MulChallenge | DivChallenge | ClassifyChallenge

/**
 * Returns all possible Multiplication/Division/Classify challenges for the
 * active drawers in the session config, filtered to the requested types.
 *
 * When decimalZeros > 0, all displayed numbers are scaled by 10^decimalZeros.
 * Mul answers and classify products are scaled; div answers remain unscaled
 * factors so the scale symmetry is always made explicit in the prompt.
 */
export function buildChallengePool(
  config: Pick<SessionConfig, 'drawers' | 'shooter' | 'decimalZeros'>,
): ShooterChallenge[] {
  const { drawers, shooter } = config
  const activeTypes = new Set<ShooterChallengeType>(shooter.challenges)
  const scale = Math.pow(10, config.decimalZeros ?? 0)

  const challenges: ShooterChallenge[] = []

  for (const triple of getTriples()) {
    const { a, b, product } = triple
    if (!drawers.has(a) && !drawers.has(b)) continue
    if (a === 1 || b === 1) continue

    if (activeTypes.has('mul')) {
      challenges.push({
        type: 'mul',
        triple,
        prompt: `${a} × ${b * scale} = ?`,
        answer: product * scale,
        distractorScale: scale,
      })
    }

    if (activeTypes.has('div')) {
      // Both divisors are scaled → answer is the complementary unscaled factor.
      // e.g. scale=10: "420 ÷ 60 = 7"  and  "420 ÷ 70 = 6"
      challenges.push({
        type: 'div',
        triple,
        prompt: `${product * scale} ÷ ${a * scale} = ?`,
        answer: b,
        distractorScale: 1,
      })
      if (a !== b) {
        challenges.push({
          type: 'div',
          triple,
          prompt: `${product * scale} ÷ ${b * scale} = ?`,
          answer: a,
          distractorScale: 1,
        })
      }
    }
  }

  // Classify challenges — one per active drawer, products scaled
  if (activeTypes.has('classify')) {
    for (const drawer of drawers) {
      const classify = buildClassifyChallenge(drawer, drawers, scale)
      if (classify) challenges.push(classify)
    }
  }

  return challenges
}

/**
 * Builds one Classify challenge for a given drawer.
 * Returns null if there are not enough products to form a meaningful round.
 * Products in the returned challenge are scaled by `scale` (10^decimalZeros).
 */
export function buildClassifyChallenge(
  drawer: number,
  activeDrawers: ReadonlySet<number>,
  scale = 1,
): ClassifyChallenge | null {
  const allTriples = getTriples().filter((t) => t.a >= 2 && t.b >= 2)

  const correctAnswers = [
    ...new Set(
      allTriples
        .filter((t) => t.a === drawer || t.b === drawer)
        .map((t) => t.product * scale),
    ),
  ]

  if (correctAnswers.length === 0) return null

  const distractorSet = new Set<number>()
  for (const t of allTriples) {
    if (
      (activeDrawers.has(t.a) || activeDrawers.has(t.b)) &&
      t.a !== drawer &&
      t.b !== drawer
    ) {
      distractorSet.add(t.product * scale)
    }
  }
  const distractors = [...distractorSet]

  return {
    type: 'classify',
    drawer,
    prompt: `Drawer ${drawer}`,
    correctAnswers,
    distractors,
  }
}

/**
 * Picks a random challenge from the pool.
 *
 * When `activeTypes` is provided, challenge types are sampled uniformly first
 * so that each type (mul / div / classify) appears at equal frequency regardless
 * of how many challenges exist per type in the pool.
 *
 * Falls back to flat uniform sampling if `activeTypes` is empty or a selected
 * type has no entries in the pool.
 */
export function pickChallenge(
  pool: ShooterChallenge[],
  activeTypes?: ShooterChallengeType[],
  random: () => number = Math.random,
): ShooterChallenge {
  if (pool.length === 0) {
    throw new Error('Challenge pool is empty')
  }
  if (activeTypes && activeTypes.length > 0) {
    const type = activeTypes[Math.floor(random() * activeTypes.length)]
    const typed = pool.filter((c) => c.type === type)
    if (typed.length > 0) {
      return typed[Math.floor(random() * typed.length)]
    }
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
