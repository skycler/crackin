import Phaser from 'phaser'
import { decodeConfig, type SessionConfig } from '../config/session'
import {
  buildChallengePool,
  pickChallenge,
  type ShooterChallenge,
} from './challenges'
import { generateDistractors } from './distractors'
import {
  initialScoreState,
  onCorrect as scoreOnCorrect,
  onError as scoreOnError,
  nextMilestone,
  DEFAULT_MILESTONES,
  type ScoreState,
} from '../scoring/score'

// ── Tile colours (geometric palette) ─────────────────────────────────────────

const TILE_COLOURS = [0x3a86ff, 0xff6b6b, 0xffd166, 0x06d6a0, 0xbf5af2, 0xfe7f2d]

// ── Tile data ─────────────────────────────────────────────────────────────────

interface TileData {
  value: number
  isCorrect: boolean
  container: Phaser.GameObjects.Container
  spawnedAt: number
}

// ── ShooterScene ──────────────────────────────────────────────────────────────

export class ShooterScene extends Phaser.Scene {
  private config!: SessionConfig
  private pool: ShooterChallenge[] = []
  private current!: ShooterChallenge

  private promptText!: Phaser.GameObjects.Text
  private scoreText!: Phaser.GameObjects.Text
  private streakText!: Phaser.GameObjects.Text
  private tiles: TileData[] = []

  private scoreState!: ScoreState
  private round = 0
  private roundStartMs = 0

  constructor() {
    super({ key: 'ShooterScene' })
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  init(): void {
    const qs = window.location.search.slice(1)
    this.config = decodeConfig(qs)
    this.pool = buildChallengePool(this.config)
    this.scoreState = initialScoreState()
    this.round = 0
    this.tiles = []
  }

  create(): void {
    const { width } = this.scale

    // HUD — prompt
    this.promptText = this.add
      .text(width / 2, 56, '', {
        fontSize: '52px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)

    // HUD — score
    this.scoreText = this.add
      .text(width - 16, 16, 'score: 0', {
        fontSize: '22px',
        fontFamily: 'monospace',
        color: '#888888',
      })
      .setOrigin(1, 0)

    // HUD — streak
    this.streakText = this.add
      .text(16, 16, '', {
        fontSize: '22px',
        fontFamily: 'monospace',
        color: '#ffd166',
      })
      .setOrigin(0, 0)

    // Input: tap / click
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      this.handlePointerDown(p)
    })

    // Input: spacebar fires at the nearest tile
    this.input.keyboard?.on(
      Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
      (e: KeyboardEvent) => {
        if (e.code === 'Space') this.fireAtNearest()
      },
    )

    this.nextRound()
  }

  update(): void {
    const { width } = this.scale
    for (let i = this.tiles.length - 1; i >= 0; i--) {
      const tile = this.tiles[i]
      if (tile.container.x > width + 80) {
        if (tile.isCorrect) this.onEscape()
        tile.container.destroy()
        this.tiles.splice(i, 1)
      }
    }
  }

  // ── Rounds ──────────────────────────────────────────────────────────────────

  private nextRound(): void {
    if (this.round >= this.config.sessionLength) {
      this.endSession()
      return
    }
    this.round++
    this.clearTiles()

    this.current = pickChallenge(this.pool)
    this.promptText.setText(this.current.prompt)
    this.roundStartMs = Date.now()

    const distractorValues = generateDistractors(
      this.current.answer,
      this.config.shooter.distractorCount,
    )
    const allValues = Phaser.Utils.Array.Shuffle([
      this.current.answer,
      ...distractorValues,
    ]) as number[]

    allValues.forEach((value, idx) => {
      this.time.delayedCall(idx * 300, () => {
        this.spawnTile(value, value === this.current.answer)
      })
    })
  }

  // ── Tile spawning ────────────────────────────────────────────────────────────

  private spawnTile(value: number, isCorrect: boolean): void {
    const { height } = this.scale
    const colour = TILE_COLOURS[Math.floor(Math.random() * TILE_COLOURS.length)]
    const y = Phaser.Math.Between(100, height - 60)

    const gfx = this.add.graphics()
    const r = 44
    gfx.fillStyle(colour, 1)
    gfx.fillCircle(0, 0, r)
    gfx.lineStyle(3, 0xffffff, 0.25)
    gfx.strokeCircle(0, 0, r)

    const label = this.add
      .text(0, 0, String(value), {
        fontSize: '30px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    const container = this.add.container(-80, y, [gfx, label])
    container.setSize(r * 2, r * 2)
    container.setInteractive()

    const tileData: TileData = { value, isCorrect, container, spawnedAt: Date.now() }

    container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.handleTileHit(tileData)
    })

    const speed = this.config.shooter.tileSpeed
    const duration = ((this.scale.width + 160) / speed) * 1000

    this.tweens.add({
      targets: container,
      x: this.scale.width + 80,
      duration,
      ease: 'Linear',
    })

    this.tiles.push(tileData)
  }

  // ── Input handlers ───────────────────────────────────────────────────────────

  private handlePointerDown(p: Phaser.Input.Pointer): void {
    let closest: TileData | null = null
    let minDist = 60

    for (const tile of this.tiles) {
      const dx = tile.container.x - p.x
      const dy = tile.container.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < minDist) {
        minDist = dist
        closest = tile
      }
    }

    if (closest) this.handleTileHit(closest)
  }

  private fireAtNearest(): void {
    if (this.tiles.length === 0) return
    const nearest = this.tiles.reduce((a, b) => (a.container.x > b.container.x ? a : b))
    this.handleTileHit(nearest)
  }

  private handleTileHit(tile: TileData): void {
    if (this.tiles.indexOf(tile) === -1) return

    if (tile.isCorrect) {
      this.handleCorrect(tile)
    } else {
      this.handleIncorrect(tile)
    }
  }

  // ── Outcome handlers ─────────────────────────────────────────────────────────

  private handleCorrect(tile: TileData): void {
    const ms = Date.now() - this.roundStartMs
    const prev = this.scoreState
    this.scoreState = scoreOnCorrect(this.scoreState, ms)

    this.scoreText.setText(`score: ${this.scoreState.total}`)
    this.updateStreakHud()

    // Milestone celebration
    if (this.scoreState.multiplier > prev.multiplier) {
      this.celebrateMilestone(this.scoreState.multiplier)
    }

    this.flashText(tile.container.x, tile.container.y, '✓', '#00ff88')
    this.destroyTile(tile)
    this.time.delayedCall(400, () => this.nextRound())
  }

  private handleIncorrect(tile: TileData): void {
    this.scoreState = scoreOnError(this.scoreState)
    this.updateStreakHud()
    this.flashText(tile.container.x, tile.container.y, '✗', '#ff4444')
    this.destroyTile(tile)
  }

  private onEscape(): void {
    this.scoreState = scoreOnError(this.scoreState)
    this.updateStreakHud()
    this.time.delayedCall(200, () => this.nextRound())
  }

  // ── HUD helpers ──────────────────────────────────────────────────────────────

  private updateStreakHud(): void {
    const { streak, multiplier } = this.scoreState
    if (streak === 0) {
      this.streakText.setText('')
      return
    }
    const next = nextMilestone(streak, DEFAULT_MILESTONES)
    const until = next ? ` → ×${next.multiplier} in ${next.at - streak}` : ' (max)'
    this.streakText.setText(`streak: ${streak}  ×${multiplier}${until}`)
  }

  private celebrateMilestone(multiplier: number): void {
    const { width, height } = this.scale
    const t = this.add
      .text(width / 2, height / 2, `×${multiplier} streak!`, {
        fontSize: '64px',
        fontFamily: 'monospace',
        color: '#ffd166',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0)

    this.tweens.add({
      targets: t,
      alpha: { from: 0, to: 1 },
      scaleX: { from: 0.5, to: 1.1 },
      scaleY: { from: 0.5, to: 1.1 },
      duration: 300,
      yoyo: true,
      hold: 400,
      onComplete: () => t.destroy(),
    })
  }

  // ── Tile helpers ─────────────────────────────────────────────────────────────

  private destroyTile(tile: TileData): void {
    const idx = this.tiles.indexOf(tile)
    if (idx !== -1) this.tiles.splice(idx, 1)
    this.tweens.add({
      targets: tile.container,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 150,
      onComplete: () => tile.container.destroy(),
    })
  }

  private clearTiles(): void {
    for (const tile of [...this.tiles]) tile.container.destroy()
    this.tiles = []
  }

  private flashText(x: number, y: number, text: string, color: string): void {
    const t = this.add
      .text(x, y, text, {
        fontSize: '40px',
        fontFamily: 'monospace',
        color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    this.tweens.add({
      targets: t,
      y: y - 60,
      alpha: 0,
      duration: 600,
      onComplete: () => t.destroy(),
    })
  }

  private endSession(): void {
    this.clearTiles()
    this.scene.start('SessionEndScene', {
      score: this.scoreState.total,
      errors: this.scoreState.errors,
    })
  }
}
