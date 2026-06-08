/**
 * Session scoring and streak system.
 *
 * Score per correct answer: round((1 + speedBonus) × streakMultiplier(streak))
 *   speedBonus       = 0.5^(ms / 3000)  — halves every 3 s, ranges 1 → 0
 *   streakMultiplier = 1 + streak / 10  — continuous: ×1 at 0, ×1.5 at 5, ×2 at 10
 *
 * Minimum 1 point per correct answer (base, no speed bonus, no streak).
 * Score is not persisted between sessions.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScoreState {
  /** Running session score. */
  total: number
  /** Consecutive correct answers since last error. */
  streak: number
  /** Current streak multiplier: 1 + streak / 10. */
  multiplier: number
  /** Number of errors in the session. */
  errors: number
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function initialScoreState(): ScoreState {
  return { total: 0, streak: 0, multiplier: 1, errors: 0 }
}

// ── Core ──────────────────────────────────────────────────────────────────────

/**
 * Continuous streak multiplier: 1 + streak / 10.
 * streak 0 → ×1.0, streak 5 → ×1.5, streak 10 → ×2.0, etc.
 */
export function streakMultiplier(streak: number): number {
  return 1 + streak / 10
}

/**
 * Returns a new ScoreState after a correct answer.
 *
 * points = round((1 + speedBonus) × streakMultiplier(streak))
 * speedBonus = 0.5^(ms / 3000)  — halves every 3 s
 *
 * @param state  Current score state
 * @param ms     Response time in milliseconds
 */
export function onCorrect(state: ScoreState, ms: number): ScoreState {
  const streak = state.streak + 1
  const multiplier = streakMultiplier(streak)
  const speedBonus = Math.pow(0.5, ms / 3000)
  const points = Math.round((1 + speedBonus) * multiplier)
  return {
    total: state.total + points,
    streak,
    multiplier,
    errors: state.errors,
  }
}

/**
 * Returns a new ScoreState after an error.
 * Resets streak and multiplier.
 */
export function onError(state: ScoreState): ScoreState {
  return {
    total: state.total - 1,
    streak: 0,
    multiplier: 1,
    errors: state.errors + 1,
  }
}
