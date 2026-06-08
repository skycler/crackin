import Phaser from 'phaser'
import {
  DEFAULT_CONFIG,
  encodeConfig,
  decodeConfig,
  type SessionConfig,
  type GameMode,
  type ShooterChallengeType,
} from '../config/session'

// ── Layout constants ──────────────────────────────────────────────────────────

const COLORS = {
  bg: 0x0a0a0a,
  panel: 0x161616,
  active: 0x3a86ff,
  inactive: 0x2a2a2a,
  text: '#ffffff',
  dim: '#666666',
  url: '#3a86ff',
}

const FONT = { fontFamily: 'monospace', color: COLORS.text }

// ── SettingsScene ─────────────────────────────────────────────────────────────

/**
 * Settings screen shown on app load (and accessible from any end screen).
 * A parent configures the session; the screen generates a live shareable URL.
 * Opening a URL with encoded config pre-populates the screen.
 */
export class SettingsScene extends Phaser.Scene {
  private config!: SessionConfig
  private urlText!: Phaser.GameObjects.Text
  private drawerButtons: Map<number, Phaser.GameObjects.Container> = new Map()
  private modeButtons: Map<GameMode, Phaser.GameObjects.Container> = new Map()
  private challengeButtons: Map<ShooterChallengeType, Phaser.GameObjects.Container> =
    new Map()

  constructor() {
    super({ key: 'SettingsScene' })
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  init(): void {
    const qs = window.location.search.slice(1)
    this.config = qs ? decodeConfig(qs) : { ...DEFAULT_CONFIG }
  }

  create(): void {
    const { width } = this.scale

    // Title
    this.add.text(width / 2, 24, "Crackin' — settings", {
      ...FONT,
      fontSize: '28px',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0)

    let y = 72

    // ── Drawers ──────────────────────────────────────────────────────────────
    this.add.text(24, y, 'drawers', { ...FONT, fontSize: '18px', color: COLORS.dim })
    y += 28
    this.buildDrawerToggles(y)
    y += 60

    // ── Modes ────────────────────────────────────────────────────────────────
    this.add.text(24, y, 'modes', { ...FONT, fontSize: '18px', color: COLORS.dim })
    y += 28
    this.buildModeToggles(y)
    y += 60

    // ── Shooter challenges ───────────────────────────────────────────────────
    this.add.text(24, y, 'shooter challenges', {
      ...FONT,
      fontSize: '18px',
      color: COLORS.dim,
    })
    y += 28
    this.buildChallengeToggles(y)
    y += 60

    // ── Difficulty ───────────────────────────────────────────────────────────
    this.add.text(24, y, 'difficulty', { ...FONT, fontSize: '18px', color: COLORS.dim })
    y += 28
    this.buildDifficultyControls(y)
    y += 70

    // ── Shareable URL ────────────────────────────────────────────────────────
    this.add.text(24, y, 'shareable link', {
      ...FONT,
      fontSize: '18px',
      color: COLORS.dim,
    })
    y += 28
    this.urlText = this.add
      .text(24, y, '', { ...FONT, fontSize: '13px', color: COLORS.url, wordWrap: { width: width - 48 } })
      .setInteractive({ useHandCursor: true })
    this.urlText.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        void navigator.clipboard.writeText(this.urlText.text)
      }
    })
    this.refreshUrl()

    // ── Play button ──────────────────────────────────────────────────────────
    const playY = this.scale.height - 40
    const playBtn = this.add
      .text(width / 2, playY, '[ PLAY ]', {
        ...FONT,
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#00ff88',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    playBtn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.startGame())

    // Keyboard: Enter = play
    this.input.keyboard?.on(
      Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
      (e: KeyboardEvent) => {
        if (e.code === 'Enter') this.startGame()
      },
    )
  }

  // ── Toggle builders ─────────────────────────────────────────────────────────

  private buildDrawerToggles(y: number): void {
    const drawers = [2, 3, 4, 5, 6, 7, 8, 9]
    drawers.forEach((n, idx) => {
      const x = 24 + idx * 58
      const container = this.makeToggle(x, y, String(n), this.config.drawers.has(n), () => {
        if (this.config.drawers.has(n)) {
          if (this.config.drawers.size > 1) this.config.drawers.delete(n)
        } else {
          this.config.drawers.add(n)
        }
        this.updateToggle(container, this.config.drawers.has(n))
        this.refreshUrl()
      })
      this.drawerButtons.set(n, container)
    })
  }

  private buildModeToggles(y: number): void {
    const modes: GameMode[] = ['shooter', 'group', 'relate']
    modes.forEach((mode, idx) => {
      const x = 24 + idx * 140
      const container = this.makeToggle(
        x,
        y,
        mode,
        this.config.modes.includes(mode),
        () => {
          if (this.config.modes.includes(mode)) {
            if (this.config.modes.length > 1) {
              this.config.modes = this.config.modes.filter((m) => m !== mode)
            }
          } else {
            this.config.modes = [...this.config.modes, mode]
          }
          this.updateToggle(container, this.config.modes.includes(mode))
          this.refreshUrl()
        },
        120,
      )
      this.modeButtons.set(mode, container)
    })
  }

  private buildChallengeToggles(y: number): void {
    const types: ShooterChallengeType[] = ['mul', 'div', 'classify']
    const labels: Record<ShooterChallengeType, string> = {
      mul: '× multiply',
      div: '÷ divide',
      classify: '? classify',
    }
    types.forEach((type, idx) => {
      const x = 24 + idx * 170
      const active = this.config.shooter.challenges.includes(type)
      const container = this.makeToggle(x, y, labels[type], active, () => {
        const chs = this.config.shooter.challenges
        if (chs.includes(type)) {
          if (chs.length > 1) {
            this.config.shooter = {
              ...this.config.shooter,
              challenges: chs.filter((c) => c !== type),
            }
          }
        } else {
          this.config.shooter = { ...this.config.shooter, challenges: [...chs, type] }
        }
        this.updateToggle(container, this.config.shooter.challenges.includes(type))
        this.refreshUrl()
      }, 150)
      this.challengeButtons.set(type, container)
    })
  }

  private buildDifficultyControls(y: number): void {
    // Tile speed
    this.add.text(24, y, 'tile speed', { ...FONT, fontSize: '16px', color: COLORS.dim })
    const speedVal = this.add.text(164, y, String(this.config.shooter.tileSpeed), {
      ...FONT,
      fontSize: '16px',
    })
    this.makeSpinner(220, y, -50, 50, 100, 500, () => this.config.shooter.tileSpeed, (v) => {
      this.config.shooter = { ...this.config.shooter, tileSpeed: v }
      speedVal.setText(String(v))
      this.refreshUrl()
    })

    // Distractor count
    this.add.text(360, y, 'distractors', { ...FONT, fontSize: '16px', color: COLORS.dim })
    const dcVal = this.add.text(490, y, String(this.config.shooter.distractorCount), {
      ...FONT,
      fontSize: '16px',
    })
    this.makeSpinner(530, y, -1, 1, 1, 8, () => this.config.shooter.distractorCount, (v) => {
      this.config.shooter = { ...this.config.shooter, distractorCount: v }
      dcVal.setText(String(v))
      this.refreshUrl()
    })

    // Session length
    this.add.text(590, y, 'rounds', { ...FONT, fontSize: '16px', color: COLORS.dim })
    const slVal = this.add.text(692, y, String(this.config.sessionLength), {
      ...FONT,
      fontSize: '16px',
    })
    this.makeSpinner(730, y, -5, 5, 5, 50, () => this.config.sessionLength, (v) => {
      this.config.sessionLength = v
      slVal.setText(String(v))
      this.refreshUrl()
    })
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private makeToggle(
    x: number,
    y: number,
    label: string,
    active: boolean,
    onToggle: () => void,
    width = 48,
  ): Phaser.GameObjects.Container {
    const height = 36
    const bg = this.add.rectangle(width / 2, height / 2, width, height, active ? COLORS.active : COLORS.inactive)
    const text = this.add
      .text(width / 2, height / 2, label, { ...FONT, fontSize: '14px' })
      .setOrigin(0.5)
    const container = this.add.container(x, y, [bg, text])
    container.setSize(width, height)
    container.setInteractive({ useHandCursor: true })
    container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, onToggle)
    return container
  }

  private updateToggle(container: Phaser.GameObjects.Container, active: boolean): void {
    const bg = container.list[0] as Phaser.GameObjects.Rectangle
    bg.setFillStyle(active ? COLORS.active : COLORS.inactive)
  }

  private makeSpinner(
    x: number,
    y: number,
    decStep: number,
    incStep: number,
    min: number,
    max: number,
    getVal: () => number,
    setVal: (v: number) => void,
  ): void {
    const dec = this.add
      .text(x, y, '−', { ...FONT, fontSize: '20px', color: '#ff6b6b' })
      .setInteractive({ useHandCursor: true })
    dec.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      setVal(Math.max(min, getVal() + decStep))
    })

    const inc = this.add
      .text(x + 28, y, '+', { ...FONT, fontSize: '20px', color: '#00ff88' })
      .setInteractive({ useHandCursor: true })
    inc.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      setVal(Math.min(max, getVal() + incStep))
    })
  }

  private refreshUrl(): void {
    const encoded = encodeConfig(this.config)
    const base = window.location.origin + window.location.pathname
    this.urlText.setText(`${base}?${encoded}`)
  }

  private startGame(): void {
    // Push config into URL without reload so ShooterScene can read it
    const encoded = encodeConfig(this.config)
    const url = window.location.pathname + '?' + encoded
    window.history.replaceState(null, '', url)

    // Start the first active mode
    // If only one mode is active, skip the menu and go directly
    if (this.config.modes.length === 1) {
      const first = this.config.modes[0]
      if (first === 'shooter') this.scene.start('ShooterScene')
      else if (first === 'group') this.scene.start('GroupScene')
      else if (first === 'relate') this.scene.start('RelateScene')
    } else {
      this.scene.start('MenuScene')
    }
  }
}
