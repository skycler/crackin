/**
 * Session scoring and streak system.
 *
 * Score per correct answer: floor(1000 / response_ms) × streak_multiplier
 * Streak multiplier increases at configurable milestones.
 * Score is not persisted between sessions.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** A streak milestone: when streak reaches `at`, apply `multiplier`. */
export interface StreakMilestone {
  at: number
  multiplier: number
}

/** Default milestones: ×2 at 3-in-a-row, ×3 at 5-in-a-row. */
export const DEFAULT_MILESTONES: StreakMilestone[] = [
  { at: 3, multiplier: 2 },
  { at: 5, multiplier: 3 },
]

export interface ScoreState {
  /** Running session score. */
  total: number
  /** Consecutive correct answers since last error. */
  streak: number
  /** Current streak multiplier. */
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
 * Returns a new ScoreState after a correct answer.
 *
 * @param state   Current score state
 * @param ms      Response time in milliseconds
 * @param milestones  Streak milestone config (default: DEFAULT_MILESTONES)
 */
export function onCorrect(
  state: ScoreState,
  ms: number,
  milestones: StreakMilestone[] = DEFAULT_MILESTONES,
): ScoreState {
  const streak = state.streak + 1
  const multiplier = resolveMultiplier(streak, milestones)
  const points = Math.floor(1000 / Math.max(ms, 1)) * multiplier
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
    total: state.total,
    streak: 0,
    multiplier: 1,
    errors: state.errors + 1,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the highest multiplier whose milestone has been reached.
 */
export function resolveMultiplier(
  streak: number,
  milestones: StreakMilestone[],
): number {
  let multiplier = 1
  for (const m of milestones) {
    if (streak >= m.at) multiplier = m.multiplier
  }
  return multiplier
}

/**
 * Returns the next milestone the player is heading toward, or null if
 * they are already at the highest milestone.
 */
export function nextMilestone(
  streak: number,
  milestones: StreakMilestone[],
): StreakMilestone | null {
  for (const m of [...milestones].sort((a, b) => a.at - b.at)) {
    if (streak < m.at) return m
  }
  return null
}
