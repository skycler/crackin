/**
 * Session config schema, defaults, and URL-param encode/decode.
 *
 * All session parameters are encoded as URL query parameters so the
 * app remains stateless and every session is shareable as a link.
 *
 * Domain reference: CONTEXT.md §Configuration
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** Which drawers (2–9) are active for the session. */
export type DrawerSet = Set<number>

/** The three challenge types available in Shooter mode. */
export type ShooterChallengeType = 'mul' | 'div' | 'classify'

/** The three game modes. */
export type GameMode = 'shooter' | 'group' | 'relate'

export interface ShooterConfig {
  /** Challenge types active in Shooter (at least one required). */
  challenges: ShooterChallengeType[]
  /** Number of distractor tiles spawned per round. */
  distractorCount: number
  /** Tile flight speed in px/s at the base resolution. */
  tileSpeed: number
}

export interface SessionConfig {
  /** Active drawers (subset of 2–9). */
  drawers: DrawerSet
  /** Active game modes (at least one required). */
  modes: GameMode[]
  /** Shooter-specific settings. */
  shooter: ShooterConfig
  /** Total number of rounds per session (applies to all modes). */
  sessionLength: number
  /**
   * Number of trailing zeros to append to all challenge numbers (0–3).
   * 0 = base space (42); 1 = ×10 (420); 2 = ×100 (4200).
   * Trains decimal-extension fluency: 6×7=42 ↔ 6×70=420.
   */
  decimalZeros: number
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: Readonly<SessionConfig> = Object.freeze({
  drawers: new Set([2, 3, 4, 5, 6, 7, 8, 9]),
  modes: ['shooter'] as GameMode[],
  shooter: {
    challenges: ['mul', 'div'] as ShooterChallengeType[],
    distractorCount: 4,
    tileSpeed: 100,
  },
  sessionLength: 20,
  decimalZeros: 0,
})

// ── Encode ────────────────────────────────────────────────────────────────────

/**
 * Encodes a SessionConfig into a URL query string.
 * Example: "d=2345679&m=shooter&sc=mul,div&sd=4&ss=200&sl=20"
 */
export function encodeConfig(config: SessionConfig): string {
  const params = new URLSearchParams()

  // Drawers: sorted comma-separated digits
  params.set('d', [...config.drawers].sort((a, b) => a - b).join(''))

  // Modes
  params.set('m', config.modes.join(','))

  // Shooter challenges
  params.set('sc', config.shooter.challenges.join(','))

  // Shooter distractor count
  params.set('sd', String(config.shooter.distractorCount))

  // Shooter tile speed
  params.set('ss', String(config.shooter.tileSpeed))

  // Session length
  params.set('sl', String(config.sessionLength))

  // Decimal zeros
  params.set('dz', String(config.decimalZeros))

  return params.toString()
}

// ── Decode ────────────────────────────────────────────────────────────────────

const VALID_DRAWERS = new Set([2, 3, 4, 5, 6, 7, 8, 9])
const VALID_MODES = new Set<GameMode>(['shooter', 'group', 'relate'])
const VALID_CHALLENGES = new Set<ShooterChallengeType>(['mul', 'div', 'classify'])

/**
 * Decodes a URL query string into a validated SessionConfig.
 * Any invalid or missing params fall back to DEFAULT_CONFIG values.
 */
export function decodeConfig(queryString: string): SessionConfig {
  const params = new URLSearchParams(queryString)

  // Drawers
  const drawers = parseDrawers(params.get('d'))

  // Modes
  const modes = parseModes(params.get('m'))

  // Shooter challenges
  const challenges = parseChallenges(params.get('sc'))

  // Shooter distractor count
  const distractorCount = parsePositiveInt(
    params.get('sd'),
    DEFAULT_CONFIG.shooter.distractorCount,
  )

  // Shooter tile speed
  const tileSpeed = parsePositiveInt(params.get('ss'), DEFAULT_CONFIG.shooter.tileSpeed)

  // Session length
  const sessionLength = parsePositiveInt(params.get('sl'), DEFAULT_CONFIG.sessionLength)

  // Decimal zeros (0–3, default 0)
  const decimalZeros = parseDecimalZeros(params.get('dz'))

  return {
    drawers,
    modes,
    shooter: { challenges, distractorCount, tileSpeed },
    sessionLength,
    decimalZeros,
  }
}

// ── Parse helpers ─────────────────────────────────────────────────────────────

function parseDrawers(raw: string | null): DrawerSet {
  if (!raw) return new Set(DEFAULT_CONFIG.drawers)
  const digits = [...raw].map(Number).filter((n) => VALID_DRAWERS.has(n))
  return digits.length > 0 ? new Set(digits) : new Set(DEFAULT_CONFIG.drawers)
}

function parseModes(raw: string | null): GameMode[] {
  if (!raw) return [...DEFAULT_CONFIG.modes]
  const modes = raw
    .split(',')
    .map((s) => s.trim() as GameMode)
    .filter((m) => VALID_MODES.has(m))
  return modes.length > 0 ? modes : [...DEFAULT_CONFIG.modes]
}

function parseChallenges(raw: string | null): ShooterChallengeType[] {
  if (!raw) return [...DEFAULT_CONFIG.shooter.challenges]
  const challenges = raw
    .split(',')
    .map((s) => s.trim() as ShooterChallengeType)
    .filter((c) => VALID_CHALLENGES.has(c))
  return challenges.length > 0 ? challenges : [...DEFAULT_CONFIG.shooter.challenges]
}

function parsePositiveInt(raw: string | null, fallback: number): number {
  if (!raw) return fallback
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function parseDecimalZeros(raw: string | null): number {
  if (!raw) return DEFAULT_CONFIG.decimalZeros
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 && n <= 3 ? n : DEFAULT_CONFIG.decimalZeros
}
