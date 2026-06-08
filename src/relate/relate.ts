/**
 * Relate mini-game logic — pure, stateless, no Phaser dependency.
 *
 * The player constructs a path from start to target using ×/÷ with
 * operands 1–9. Operations ×10^n and ÷10^n are free steps (not counted).
 *
 * Example: 420 → 35
 *   ÷6 → 70, ÷10 (free) → 7, ×5 → 35
 *   Path length = 2 (two non-free steps)
 */

import { stripZeros } from '../domain/triples'

// ── Types ─────────────────────────────────────────────────────────────────────

export type RelateOp = '×' | '÷'

export interface RelateStep {
  op: RelateOp
  operand: number
  /** Result after this step */
  result: number
  /** true if this step is ×10^n or ÷10^n (free step) */
  isFree: boolean
}

export interface RelateState {
  start: number
  target: number
  current: number
  steps: RelateStep[]
  /** Non-free step count */
  pathLength: number
  isComplete: boolean
}

// ── Challenge generation ──────────────────────────────────────────────────────

export interface RelateChallenge {
  start: number
  target: number
  /** Minimum path length (non-free steps) */
  minPathLength: number
}

/**
 * Generates a Relate challenge from the active drawers.
 * Start and target are both valid products in the base space.
 */
export function generateRelateChallenge(
  activeDrawers: ReadonlySet<number>,
  random: () => number = Math.random,
): RelateChallenge {
  // Build pool of valid products
  const products: number[] = []
  for (const d of activeDrawers) {
    for (let m = 2; m <= 10; m++) {
      const p = d * m
      if (!products.includes(p)) products.push(p)
    }
  }

  // Shuffle and pick start + target that are different
  const shuffled = [...products].sort(() => random() - 0.5)
  const start = shuffled[0]
  const target = shuffled.find((p) => p !== start) ?? shuffled[1]

  return {
    start,
    target,
    minPathLength: estimateMinPath(start, target),
  }
}

// ── State machine ─────────────────────────────────────────────────────────────

/** Creates the initial relate state. */
export function initialRelateState(challenge: RelateChallenge): RelateState {
  return {
    start: challenge.start,
    target: challenge.target,
    current: challenge.start,
    steps: [],
    pathLength: 0,
    isComplete: challenge.start === challenge.target,
  }
}

/**
 * Applies an operation to the current state and returns the new state.
 * Automatically applies free steps (×/÷ powers of 10) after each non-free step.
 *
 * Returns null if the operation is invalid (e.g. non-integer division result,
 * result ≤ 0, or operand out of range 1–9).
 */
export function applyStep(
  state: RelateState,
  op: RelateOp,
  operand: number,
): RelateState | null {
  if (operand < 1 || operand > 9 || !Number.isInteger(operand)) return null

  const rawResult = op === '×' ? state.current * operand : state.current / operand

  if (!Number.isInteger(rawResult) || rawResult <= 0) return null

  const step: RelateStep = {
    op,
    operand,
    result: rawResult,
    isFree: false,
  }

  const newSteps = [...state.steps, step]
  const newPathLength = state.pathLength + 1

  // Auto-apply free steps to bring rawResult closer to target
  const { finalResult, freeSteps } = applyFreeSteps(rawResult, state.target)

  const allSteps = [...newSteps, ...freeSteps]

  return {
    start: state.start,
    target: state.target,
    current: finalResult,
    steps: allSteps,
    pathLength: newPathLength,
    isComplete: finalResult === state.target,
  }
}

/**
 * Undoes the last non-free step (and any trailing free steps).
 */
export function undoStep(state: RelateState): RelateState {
  if (state.pathLength === 0) return state

  // Find the last non-free step and remove everything from it onward
  let lastNonFreeIdx = -1
  for (let i = state.steps.length - 1; i >= 0; i--) {
    if (!state.steps[i].isFree) {
      lastNonFreeIdx = i
      break
    }
  }

  if (lastNonFreeIdx === -1) return state

  const newSteps = state.steps.slice(0, lastNonFreeIdx)
  const previous = newSteps.length > 0 ? newSteps[newSteps.length - 1].result : state.start

  return {
    start: state.start,
    target: state.target,
    current: previous,
    steps: newSteps,
    pathLength: state.pathLength - 1,
    isComplete: previous === state.target,
  }
}

// ── Free step logic ───────────────────────────────────────────────────────────

/**
 * Returns true if the operation (op, operand) is a free step.
 * A step is free if operand is a power of 10 (10, 100, 1000, …).
 * Note: operand range for non-free steps is 1–9, so powers of 10 are
 * handled separately in the UI as dedicated ×10/÷10 buttons.
 */
export function isFreeStep(operand: number): boolean {
  if (operand <= 0) return false
  let n = operand
  while (n % 10 === 0) n /= 10
  return n === 1 && operand !== 1
}

/**
 * After a non-free step, auto-applies ×10/÷10 free steps to bring the
 * current number toward the target (stripping/restoring scale noise).
 *
 * Strategy: if stripZeros(current) === stripZeros(target), apply ×10 or ÷10
 * to match the scale of the target.
 */
export function applyFreeSteps(
  current: number,
  target: number,
): { finalResult: number; freeSteps: RelateStep[] } {
  const freeSteps: RelateStep[] = []
  let n = current

  // If the core patterns match, adjust scale toward target
  const coreN = stripZeros(n)
  const coreT = stripZeros(target)

  if (coreN === coreT && n !== target) {
    // Multiply or divide by 10 repeatedly
    let attempts = 0
    while (n !== target && attempts < 10) {
      if (n < target && target % (n * 10) === 0) {
        freeSteps.push({ op: '×', operand: 10, result: n * 10, isFree: true })
        n = n * 10
      } else if (n > target && n % 10 === 0) {
        freeSteps.push({ op: '÷', operand: 10, result: n / 10, isFree: true })
        n = n / 10
      } else {
        break
      }
      attempts++
    }
  }

  return { finalResult: n, freeSteps }
}

// ── Path estimation ───────────────────────────────────────────────────────────

/**
 * Returns a rough lower bound on the minimum non-free path length.
 * Used for scoring (not enforced).
 */
export function estimateMinPath(start: number, target: number): number {
  const s = stripZeros(start)
  const t = stripZeros(target)
  if (s === t) return 0
  // If target is a multiple of start (or vice versa) that fits in a single ×/÷ with operand 1–9
  if (t % s === 0 && t / s <= 9) return 1
  if (s % t === 0 && s / t <= 9) return 1
  return 2 // Most pairs reachable in 2 steps via a common factor
}
