import Phaser from 'phaser'
import { decodeConfig, type SessionConfig } from '../config/session'
import {
  generateRelateChallenge,
  initialRelateState,
  applyStep,
  undoStep,
  type RelateState,
  type RelateOp,
} from './relate'
import {
  initialScoreState,
  onCorrect as scoreOnCorrect,
  onError as scoreOnError,
  type ScoreState,
} from '../scoring/score'

const FONT = { fontFamily: 'monospace', color: '#ffffff' }

// ── RelateScene ───────────────────────────────────────────────────────────────

export class RelateScene extends Phaser.Scene {
  private config!: SessionConfig
  private scoreState!: ScoreState
  private round = 0
  private roundStartMs = 0
  private relateState!: RelateState

  private currentNumberText!: Phaser.GameObjects.Text
  private targetText!: Phaser.GameObjects.Text
  private pathText!: Phaser.GameObjects.Text
  private scoreText!: Phaser.GameObjects.Text
  private feedbackText!: Phaser.GameObjects.Text

  // Op/operand selection state
  private selectedOp: RelateOp = '×'
  private opButtons: Map<RelateOp, Phaser.GameObjects.Container> = new Map()
  private operandButtons: Map<number, Phaser.GameObjects.Container> = new Map()
  private roundObjects: Phaser.GameObjects.GameObject[] = []

  constructor() {
    super({ key: 'RelateScene' })
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  init(): void {
    const qs = window.location.search.slice(1)
    this.config = decodeConfig(qs)
    this.scoreState = initialScoreState()
    this.round = 0
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
        fontSize: '20px',
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
      })
      return
    }
    this.round++
    this.clearRoundObjects()
    this.selectedOp = '×'

    const challenge = generateRelateChallenge(this.config.drawers)
    this.relateState = initialRelateState(challenge)
    this.roundStartMs = Date.now()

    this.buildUI()
    this.updateDisplay()
  }

  // ── UI building ──────────────────────────────────────────────────────────────

  private buildUI(): void {
    const { width, height } = this.scale

    // ── Numbers display ──────────────────────────────────────────────────────
    // Current number (large, centre)
    this.currentNumberText = this.track(
      this.add
        .text(width / 2, height / 2 - 20, '', {
          ...FONT,
          fontSize: '80px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    )

    // Target (top right)
    this.targetText = this.track(
      this.add
        .text(width - 24, height / 2 - 60, `→ ${this.relateState.target}`, {
          ...FONT,
          fontSize: '36px',
          color: '#ffd166',
        })
        .setOrigin(1, 0.5),
    )

    // Path display
    this.pathText = this.track(
      this.add
        .text(width / 2, height / 2 + 60, '', {
          ...FONT,
          fontSize: '18px',
          color: '#888888',
          wordWrap: { width: width - 48 },
        })
        .setOrigin(0.5, 0),
    )

    // ── Op toggle ────────────────────────────────────────────────────────────
    const ops: RelateOp[] = ['×', '÷']
    ops.forEach((op, idx) => {
      const x = 60 + idx * 80
      const y = height - 100
      const bg = this.add.rectangle(0, 0, 64, 48, op === this.selectedOp ? 0x3a86ff : 0x2a2a2a)
      const label = this.add
        .text(0, 0, op, { ...FONT, fontSize: '28px' })
        .setOrigin(0.5)
      const container = this.track(this.add.container(x, y, [bg, label]))
      container.setSize(64, 48)
      container.setInteractive({ useHandCursor: true })
      container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        this.selectedOp = op
        this.refreshOpButtons()
      })
      this.opButtons.set(op, container)
    })

    // ── Operand buttons (1–9) ────────────────────────────────────────────────
    for (let n = 1; n <= 9; n++) {
      const col = (n - 1) % 3
      const row = Math.floor((n - 1) / 3)
      const x = 220 + col * 76
      const y = height - 130 + row * 56
      const bg = this.add.rectangle(0, 0, 60, 44, 0x1a3a6a)
      const label = this.add
        .text(0, 0, String(n), { ...FONT, fontSize: '22px', fontStyle: 'bold' })
        .setOrigin(0.5)
      const container = this.track(this.add.container(x, y, [bg, label]))
      container.setSize(60, 44)
      container.setInteractive({ useHandCursor: true })
      container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.applyOperand(n))
      this.operandButtons.set(n, container)
    }

    // ── Undo button ──────────────────────────────────────────────────────────
    const undo = this.track(
      this.add
        .text(width - 24, height - 100, '[undo]', { ...FONT, fontSize: '20px', color: '#ff6b6b' })
        .setOrigin(1, 0.5)
        .setInteractive({ useHandCursor: true }),
    )
    undo.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.handleUndo())

    // Keyboard: number keys apply operand, U = undo, X = toggle op, Z = toggle op
    this.input.keyboard?.on(
      Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
      (e: KeyboardEvent) => {
        const num = parseInt(e.key, 10)
        if (num >= 1 && num <= 9) this.applyOperand(num)
        if (e.code === 'KeyU') this.handleUndo()
        if (e.code === 'KeyX' || e.code === 'KeyZ') {
          this.selectedOp = this.selectedOp === '×' ? '÷' : '×'
          this.refreshOpButtons()
        }
      },
    )
  }

  // ── Interaction ──────────────────────────────────────────────────────────────

  private applyOperand(n: number): void {
    const next = applyStep(this.relateState, this.selectedOp, n)
    if (!next) {
      this.feedbackText.setText('invalid move')
      this.feedbackText.setColor('#ff4444')
      this.scoreState = scoreOnError(this.scoreState)
      this.time.delayedCall(600, () => this.feedbackText.setText(''))
      return
    }

    this.relateState = next
    this.updateDisplay()

    if (this.relateState.isComplete) {
      this.onComplete()
    }
  }

  private handleUndo(): void {
    this.relateState = undoStep(this.relateState)
    this.updateDisplay()
    this.feedbackText.setText('undone')
    this.feedbackText.setColor('#888888')
    this.time.delayedCall(400, () => this.feedbackText.setText(''))
  }

  private onComplete(): void {
    const ms = Date.now() - this.roundStartMs
    this.scoreState = scoreOnCorrect(this.scoreState, ms)
    this.scoreText.setText(`score: ${this.scoreState.total}`)

    this.feedbackText.setText(`done in ${this.relateState.pathLength} step(s)!`)
    this.feedbackText.setColor('#00ff88')

    this.time.delayedCall(1000, () => this.nextRound())
  }

  // ── Display update ────────────────────────────────────────────────────────────

  private updateDisplay(): void {
    this.currentNumberText.setText(String(this.relateState.current))
    this.targetText.setText(`→ ${this.relateState.target}`)

    // Build path string
    const parts = [`${this.relateState.start}`]
    for (const step of this.relateState.steps) {
      const freeTag = step.isFree ? ' (free)' : ''
      parts.push(`${step.op}${step.operand}${freeTag} = ${step.result}`)
    }
    const pathStr = parts.join(' → ')
    this.pathText.setText(pathStr)

    // Steps counter
    this.feedbackText.setText(
      `steps: ${this.relateState.pathLength}  |  round ${this.round}/${this.config.sessionLength}`,
    )
    this.feedbackText.setColor('#888888')
  }

  private refreshOpButtons(): void {
    for (const [op, container] of this.opButtons) {
      const bg = container.list[0] as Phaser.GameObjects.Rectangle
      bg.setFillStyle(op === this.selectedOp ? 0x3a86ff : 0x2a2a2a)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.roundObjects.push(obj)
    return obj
  }

  private clearRoundObjects(): void {
    for (const obj of this.roundObjects) obj.destroy()
    this.roundObjects = []
    this.opButtons.clear()
    this.operandButtons.clear()
  }
}
