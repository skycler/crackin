import { describe, it, expect } from 'vitest'
import {
  DEFAULT_CONFIG,
  encodeConfig,
  decodeConfig,
  type SessionConfig,
} from './session'

// ── Defaults ──────────────────────────────────────────────────────────────────

describe('DEFAULT_CONFIG', () => {
  it('has all drawers 2–9 active by default', () => {
    expect([...DEFAULT_CONFIG.drawers].sort()).toEqual([2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('has shooter as the default mode', () => {
    expect(DEFAULT_CONFIG.modes).toContain('shooter')
  })
})

// ── encodeConfig ──────────────────────────────────────────────────────────────

describe('encodeConfig', () => {
  it('produces a non-empty query string', () => {
    const qs = encodeConfig({ ...DEFAULT_CONFIG })
    expect(qs.length).toBeGreaterThan(0)
  })

  it('encodes drawers as sorted joined digits', () => {
    const config: SessionConfig = {
      ...DEFAULT_CONFIG,
      drawers: new Set([7, 3, 5]),
    }
    const qs = encodeConfig(config)
    const params = new URLSearchParams(qs)
    expect(params.get('d')).toBe('357')
  })

  it('encodes multiple modes as comma-separated string', () => {
    const config: SessionConfig = {
      ...DEFAULT_CONFIG,
      modes: ['shooter', 'group'],
    }
    const qs = encodeConfig(config)
    const params = new URLSearchParams(qs)
    expect(params.get('m')).toBe('shooter,group')
  })

  it('encodes all shooter challenge types', () => {
    const config: SessionConfig = {
      ...DEFAULT_CONFIG,
      shooter: { ...DEFAULT_CONFIG.shooter, challenges: ['mul', 'div', 'classify'] },
    }
    const qs = encodeConfig(config)
    const params = new URLSearchParams(qs)
    expect(params.get('sc')).toBe('mul,div,classify')
  })
})

// ── decodeConfig ──────────────────────────────────────────────────────────────

describe('decodeConfig', () => {
  it('decodes drawers correctly', () => {
    const config = decodeConfig('d=357')
    expect([...config.drawers].sort()).toEqual([3, 5, 7])
  })

  it('decodes modes correctly', () => {
    const config = decodeConfig('m=shooter%2Cgroup')
    expect(config.modes).toContain('shooter')
    expect(config.modes).toContain('group')
  })

  it('falls back to defaults for missing params', () => {
    const config = decodeConfig('')
    expect([...config.drawers].sort()).toEqual([...DEFAULT_CONFIG.drawers].sort())
    expect(config.modes).toEqual(DEFAULT_CONFIG.modes)
    expect(config.sessionLength).toBe(DEFAULT_CONFIG.sessionLength)
  })

  it('falls back to defaults for invalid drawer chars', () => {
    const config = decodeConfig('d=xyz')
    expect([...config.drawers].sort()).toEqual([...DEFAULT_CONFIG.drawers].sort())
  })

  it('falls back to defaults for invalid modes', () => {
    const config = decodeConfig('m=bogus')
    expect(config.modes).toEqual(DEFAULT_CONFIG.modes)
  })

  it('falls back to default sessionLength for non-numeric value', () => {
    const config = decodeConfig('sl=abc')
    expect(config.sessionLength).toBe(DEFAULT_CONFIG.sessionLength)
  })

  it('falls back to default sessionLength for zero or negative', () => {
    expect(decodeConfig('sl=0').sessionLength).toBe(DEFAULT_CONFIG.sessionLength)
    expect(decodeConfig('sl=-1').sessionLength).toBe(DEFAULT_CONFIG.sessionLength)
  })

  it('ignores out-of-range drawer digits (e.g. 1 and 0)', () => {
    const config = decodeConfig('d=1023')
    // Only '2' and '3' are valid from that string
    expect([...config.drawers].sort()).toEqual([2, 3])
  })
})

// ── Round-trip invariant ──────────────────────────────────────────────────────

describe('round-trip: decodeConfig(encodeConfig(config)) equals config', () => {
  it('round-trips the default config', () => {
    const encoded = encodeConfig({ ...DEFAULT_CONFIG })
    const decoded = decodeConfig(encoded)
    expect([...decoded.drawers].sort()).toEqual([...DEFAULT_CONFIG.drawers].sort())
    expect(decoded.modes).toEqual(DEFAULT_CONFIG.modes)
    expect(decoded.shooter.challenges).toEqual(DEFAULT_CONFIG.shooter.challenges)
    expect(decoded.shooter.distractorCount).toBe(DEFAULT_CONFIG.shooter.distractorCount)
    expect(decoded.shooter.tileSpeed).toBe(DEFAULT_CONFIG.shooter.tileSpeed)
    expect(decoded.sessionLength).toBe(DEFAULT_CONFIG.sessionLength)
    expect(decoded.decimalZeros).toBe(DEFAULT_CONFIG.decimalZeros)
  })

  it('round-trips a custom config', () => {
    const custom: SessionConfig = {
      drawers: new Set([3, 6, 9]),
      modes: ['shooter', 'relate'],
      shooter: {
        challenges: ['classify'],
        distractorCount: 6,
        tileSpeed: 300,
      },
      sessionLength: 10,
      decimalZeros: 2,
    }
    const encoded = encodeConfig(custom)
    const decoded = decodeConfig(encoded)
    expect([...decoded.drawers].sort()).toEqual([3, 6, 9])
    expect(decoded.modes).toEqual(['shooter', 'relate'])
    expect(decoded.shooter.challenges).toEqual(['classify'])
    expect(decoded.shooter.distractorCount).toBe(6)
    expect(decoded.shooter.tileSpeed).toBe(300)
    expect(decoded.sessionLength).toBe(10)
    expect(decoded.decimalZeros).toBe(2)
  })
})
