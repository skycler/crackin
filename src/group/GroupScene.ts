import Phaser from 'phaser'
import { decodeConfig, type SessionConfig } from '../config/session'
import {
  generateGroupRound,
  coveredBy,
  isFullyCovered,
  isMinimumSet,
  type GroupRound,
} from './group'
import {
  initialScoreState,
  onCorrect as scoreOnCorrect,
  onError as scoreOnError,
  type ScoreState,
} from '../scoring/score'

// ── Colours ───────────────────────────────────────────────────────────────────

const C = {
  bg: 0x0a0a0a,
  number: 0x2a2a2a,
  numberText: '#ffffff',
  covered: 0x06d6a0,
  drawerActive: 0x3a86ff,
  drawerInactive: 0x1a1a1a,
  drawerText: '#ffffff',
  error: 0xff4444,
}

const FONT = { fontFamily: 'monospace', color: '#ffffff' }

// ── GroupScene ────────────────────────────────────────────────────────────────

export class GroupScene extends Phaser.Scene {
  private config!: SessionConfig
  private scoreState!: ScoreState
  private round = 0
  private roundStartMs = 0

  private currentRound!: GroupRound
  private selectedDrawers: number[] = []

  private numberTokens: Map<number, Phaser.GameObjects.Container> = new Map()
  private drawerButtons: Map<number, Phaser.GameObjects.Container> = new Map()

  private scoreText!: Phaser.GameObjects.Text
  private feedbackText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'GroupScene' })
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  init(): void {
    const qs = window.location.search.slice(1)
    this.config = decodeConfig(qs)
    this.scoreState = initialScoreState()
    this.round = 0
    this.selectedDrawers = []
  }

  create(): void {
    const { width } = this.scale

    this.scoreText = this.add
      .text(width - 16, 16, 'score: 0', {
        ...FONT,
        fontSize: '22px',
        color: '#888888',
      })
      .setOrigin(1, 0)

    this.feedbackText = this.add
      .text(width / 2, 16, '', {
        ...FONT,
        fontSize: '22px',
        color: '#ffd166',
      })
      .setOrigin(0.5, 0)

    this.nextRound()
  }

  // ── Round management ─────────────────────────────────────────────────────────

  private nextRound(): void {
    if (this.round >= this.config.sessionLength) {
      this.scene.start('SessionEndScene', {
        score: this.scoreState.total,
        errors: this.scoreState.errors,
        fromScene: 'GroupScene',
      })
      return
    }
    this.round++
    this.selectedDrawers = []
    this.clearRoundObjects()

    this.currentRound = generateGroupRound(this.config.drawers, 5)
    this.roundStartMs = Date.now()
    this.feedbackText.setText(`round ${this.round}`)

    this.buildNumberTokens()
    this.buildDrawerButtons()
  }

  // ── Number tokens ────────────────────────────────────────────────────────────

  private buildNumberTokens(): void {
    const { width, height } = this.scale
    const nums = this.currentRound.numbers
    const cols = Math.ceil(nums.length / 2)
    const spacing = 130
    const startX = width / 2 - ((cols - 1) * spacing) / 2
    const rows = nums.length <= 4 ? 1 : 2

    nums.forEach((n, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = startX + col * spacing
      const y = height / 2 - 60 + row * 100 - (rows === 1 ? 0 : 50)

      const bg = this.add.rectangle(0, 0, 100, 60, C.number).setOrigin(0.5)
      const label = this.add
        .text(0, 0, String(n), { ...FONT, fontSize: '28px', fontStyle: 'bold' })
        .setOrigin(0.5)
      const container = this.add.container(x, y, [bg, label])
      this.numberTokens.set(n, container)
    })
  }

  // ── Drawer buttons ───────────────────────────────────────────────────────────

  private buildDrawerButtons(): void {
    const { width, height } = this.scale
    const drawers = [...this.config.drawers].sort((a, b) => a - b)
    const btnW = 72
    const spacing = 84
    const totalW = drawers.length * spacing - (spacing - btnW)
    const startX = width / 2 - totalW / 2

    drawers.forEach((d, idx) => {
      const x = startX + idx * spacing + btnW / 2
      const y = height - 56

      const bg = this.add
        .rectangle(0, 0, btnW, 52, C.drawerInactive)
        .setOrigin(0.5)
      const label = this.add
        .text(0, 0, String(d), { ...FONT, fontSize: '24px', fontStyle: 'bold' })
        .setOrigin(0.5)
      const container = this.add.container(x, y, [bg, label])
      container.setSize(btnW, 52)
      container.setInteractive({ useHandCursor: true })
      container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.toggleDrawer(d))
      this.drawerButtons.set(d, container)
    })

    // Submit button
    const submit = this.add
      .text(width / 2, height - 110, '[check answer]', {
        ...FONT,
        fontSize: '20px',
        color: '#00ff88',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    submit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.checkAnswer())

    // Store for cleanup
    this.drawerButtons.set(-1, this.add.container(0, 0, [submit]))
  }

  // ── Interaction ──────────────────────────────────────────────────────────────

  private toggleDrawer(drawer: number): void {
    const idx = this.selectedDrawers.indexOf(drawer)
    if (idx === -1) {
      this.selectedDrawers.push(drawer)
    } else {
      this.selectedDrawers.splice(idx, 1)
    }
    this.updateHighlights()
  }

  private updateHighlights(): void {
    const { numbers } = this.currentRound

    // Reset all tokens to uncovered colour
    for (const [, container] of this.numberTokens) {
      const bg = container.list[0] as Phaser.GameObjects.Rectangle
      bg.setFillStyle(C.number)
    }

    // Highlight covered numbers
    for (const d of this.selectedDrawers) {
      for (const n of coveredBy(numbers, d)) {
        const container = this.numberTokens.get(n)
        if (container) {
          const bg = container.list[0] as Phaser.GameObjects.Rectangle
          bg.setFillStyle(C.covered)
        }
      }
    }

    // Update drawer button colours
    for (const [d, container] of this.drawerButtons) {
      if (d === -1) continue
      const bg = container.list[0] as Phaser.GameObjects.Rectangle
      const active = this.selectedDrawers.includes(d)
      bg.setFillStyle(active ? C.drawerActive : C.drawerInactive)
    }
  }

  private checkAnswer(): void {
    const { numbers } = this.currentRound

    if (!isFullyCovered(numbers, this.selectedDrawers)) {
      this.feedbackText.setText('not covered yet!')
      this.feedbackText.setColor('#ff6b6b')
      this.scoreState = scoreOnError(this.scoreState)
      return
    }

    const ms = Date.now() - this.roundStartMs
    const minimum = isMinimumSet(numbers, this.selectedDrawers)

    if (minimum) {
      this.scoreState = scoreOnCorrect(this.scoreState, ms)
      this.feedbackText.setText('minimum! +bonus')
      this.feedbackText.setColor('#00ff88')
    } else {
      // Covered but not minimal — partial credit
      this.scoreState = scoreOnCorrect(
        this.scoreState,
        ms * 2, // Penalty: doubled time for non-minimal
      )
      this.feedbackText.setText('covered — but not minimum')
      this.feedbackText.setColor('#ffd166')
    }

    this.scoreText.setText(`score: ${this.scoreState.total}`)
    this.time.delayedCall(800, () => this.nextRound())
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  private clearRoundObjects(): void {
    for (const [, c] of this.numberTokens) c.destroy()
    for (const [, c] of this.drawerButtons) c.destroy()
    this.numberTokens.clear()
    this.drawerButtons.clear()
  }
}
