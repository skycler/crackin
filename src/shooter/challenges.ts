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
  /** The correct answer (possibly scaled). */
  answer: number
  /** Scale factor used to generate same-space distractors (10^zeros). */
  distractorScale: number
}

export interface DivChallenge {
  type: 'div'
  triple: Triple
  /** The text shown to the player, e.g. "420 ÷ 60 = ?" */
  prompt: string
  /** The correct answer (possibly scaled). */
  answer: number
  /** Scale factor for distractor generation (1 when answer is unscaled). */
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
 * active drawers in the session config. All challenges are generated at
 * scale=1 (no decimal zeros). Call `scaleChallenge` on each picked challenge
 * to apply random decimal-zero scaling at round time.
 */
export function buildChallengePool(
  config: Pick<SessionConfig, 'drawers' | 'shooter'>,
): ShooterChallenge[] {
  const { drawers, shooter } = config
  const activeTypes = new Set<ShooterChallengeType>(shooter.challenges)

  const challenges: ShooterChallenge[] = []

  for (const triple of getTriples()) {
    const { a, b, product } = triple
    if (!drawers.has(a) && !drawers.has(b)) continue
    if (a === 1 || b === 1) continue

    if (activeTypes.has('mul')) {
      challenges.push({
        type: 'mul',
        triple,
        prompt: `${a} × ${b} = ?`,
        answer: product,
        distractorScale: 1,
      })
    }

    if (activeTypes.has('div')) {
      challenges.push({
        type: 'div',
        triple,
        prompt: `${product} ÷ ${a} = ?`,
        answer: b,
        distractorScale: 1,
      })
      if (a !== b) {
        challenges.push({
          type: 'div',
          triple,
          prompt: `${product} ÷ ${b} = ?`,
          answer: a,
          distractorScale: 1,
        })
      }
    }
  }

  // Classify challenges — one per active drawer, unscaled
  if (activeTypes.has('classify')) {
    for (const drawer of drawers) {
      const classify = buildClassifyChallenge(drawer, drawers)
      if (classify) challenges.push(classify)
    }
  }

  return challenges
}

/**
 * Applies random decimal-zero scaling to a challenge at round time.
 *
 * Randomly picks zeros ∈ {0..maxZeros} and applies 10^zeros to a randomly
 * chosen factor (a or b). The product scales by the same amount. For division
 * challenges the prompt and answer are updated to reflect which factor is
 * scaled. For classify challenges all products are scaled uniformly.
 *
 * Returns the original challenge unchanged when maxZeros=0 or zeros=0.
 */
export function scaleChallenge(
  challenge: ShooterChallenge,
  maxZeros: number,
  random: () => number = Math.random,
): ShooterChallenge {
  if (maxZeros === 0) return challenge
  const zeros = Math.floor(random() * (maxZeros + 1))
  if (zeros === 0) return challenge
  const scale = Math.pow(10, zeros)

  if (challenge.type === 'classify') {
    return {
      ...challenge,
      correctAnswers: challenge.correctAnswers.map((p) => p * scale),
      distractors: challenge.distractors.map((p) => p * scale),
    }
  }

  const { a, b, product } = challenge.triple
  const applyToA = random() < 0.5

  if (challenge.type === 'mul') {
    const [fa, fb] = applyToA ? [a * scale, b] : [a, b * scale]
    return {
      ...challenge,
      prompt: `${fa} × ${fb} = ?`,
      answer: product * scale,
      distractorScale: scale,
    }
  }

  // div: base prompt is "product ÷ divisor = answer"
  // Determine which factor is divisor vs answer in the base challenge.
  const baseDivisorIsA = challenge.answer === b
  const baseDivisor = baseDivisorIsA ? a : b
  const baseAnswer = challenge.answer

  if (applyToA) {
    if (baseDivisorIsA) {
      // Scale divisor (a): (product×s) ÷ (a×s) = b  — answer stays unscaled
      return {
        ...challenge,
        prompt: `${product * scale} ÷ ${baseDivisor * scale} = ?`,
        answer: baseAnswer,
        distractorScale: 1,
      }
    } else {
      // Scale answer (a): (product×s) ÷ b = (a×s)
      return {
        ...challenge,
        prompt: `${product * scale} ÷ ${baseDivisor} = ?`,
        answer: baseAnswer * scale,
        distractorScale: scale,
      }
    }
  } else {
    if (!baseDivisorIsA) {
      // Scale divisor (b): (product×s) ÷ (b×s) = a  — answer stays unscaled
      return {
        ...challenge,
        prompt: `${product * scale} ÷ ${baseDivisor * scale} = ?`,
        answer: baseAnswer,
        distractorScale: 1,
      }
    } else {
      // Scale answer (b): (product×s) ÷ a = (b×s)
      return {
        ...challenge,
        prompt: `${product * scale} ÷ ${baseDivisor} = ?`,
        answer: baseAnswer * scale,
        distractorScale: scale,
      }
    }
  }
}

/**
 * Builds one Classify challenge for a given drawer.
 * Returns null if there are not enough products to form a meaningful round.
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
