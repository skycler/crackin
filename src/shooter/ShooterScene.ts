import Phaser from 'phaser'
import { decodeConfig, type SessionConfig } from '../config/session'
import {
  buildChallengePool,
  pickChallenge,
  type ShooterChallenge,
  type ClassifyChallenge,
} from './challenges'
import { generateDistractors } from './distractors'
import {
  initialScoreState,
  onCorrect as scoreOnCorrect,
  onError as scoreOnError,
  type ScoreState,
} from '../scoring/score'

// ── Tile colours (geometric palette) ─────────────────────────────────────────

const TILE_COLOURS = [0x3a86ff, 0xff6b6b, 0xffd166, 0x06d6a0, 0xbf5af2, 0xfe7f2d]

// ── Tile radius (px) ──────────────────────────────────────────────────────────

const RADIUS = 44

// ── Tile data ─────────────────────────────────────────────────────────────────

interface TileData {
  value: number
  isCorrect: boolean
  container: Phaser.GameObjects.Container
  spawnedAt: number
  /** Velocity in px/s (set by spawnTile, updated by update()). */
  vx: number
  vy: number
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

    // HUD — score (top-right)
    this.scoreText = this.add
      .text(width - 16, 16, 'score: 0', {
        fontSize: '22px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(1, 0)

    // HUD — streak (top-left)
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

  /**
   * Per-frame bouncing physics.
   * Each tile moves by (vx, vy) × dt and reflects off the four walls.
   * Tiles never escape — there is no time limit per round.
   */
  update(_time: number, delta: number): void {
    const { width, height } = this.scale
    const dt = delta / 1000

    for (const tile of this.tiles) {
      tile.container.x += tile.vx * dt
      tile.container.y += tile.vy * dt

      // Reflect off left / right walls
      if (tile.container.x < RADIUS) {
        tile.container.x = RADIUS
        tile.vx = Math.abs(tile.vx)
      } else if (tile.container.x > width - RADIUS) {
        tile.container.x = width - RADIUS
        tile.vx = -Math.abs(tile.vx)
      }

      // Reflect off top (below HUD) / bottom walls
      const topWall = 100 + RADIUS
      if (tile.container.y < topWall) {
        tile.container.y = topWall
        tile.vy = Math.abs(tile.vy)
      } else if (tile.container.y > height - RADIUS) {
        tile.container.y = height - RADIUS
        tile.vy = -Math.abs(tile.vy)
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

    // Fair type selection: each active challenge type appears with equal frequency.
    this.current = pickChallenge(this.pool, this.config.shooter.challenges)
    this.promptText.setText(this.current.prompt)
    this.roundStartMs = Date.now()

    if (this.current.type === 'classify') {
      this.startClassifyRound(this.current)
    } else {
      const answer = this.current.answer
      const scale = this.current.distractorScale
      const distractorValues = generateDistractors(
        answer,
        this.config.shooter.distractorCount,
        undefined,
        scale,
      )
      const allValues = Phaser.Utils.Array.Shuffle([
        answer,
        ...distractorValues,
      ]) as number[]

      allValues.forEach((value, idx) => {
        this.time.delayedCall(idx * 300, () => {
          this.spawnTile(value, value === answer)
        })
      })
    }
  }

  /**
   * Classify round: show all correct tiles plus a subset of distractors.
   * The round ends when all correct tiles are shot.
   */
  private classifyCorrectTotal = 0
  private classifyCorrectShot = 0

  private startClassifyRound(challenge: ClassifyChallenge): void {
    this.classifyCorrectTotal = Math.min(challenge.correctAnswers.length, 4)
    this.classifyCorrectShot = 0

    const corrects = Phaser.Utils.Array.Shuffle([...challenge.correctAnswers]).slice(
      0,
      this.classifyCorrectTotal,
    ) as number[]

    const distractorCount = Math.min(
      challenge.distractors.length,
      this.config.shooter.distractorCount,
    )
    const distractors = Phaser.Utils.Array.Shuffle([...challenge.distractors]).slice(
      0,
      distractorCount,
    ) as number[]

    const allValues = Phaser.Utils.Array.Shuffle([
      ...corrects.map((v) => ({ v, correct: true })),
      ...distractors.map((v) => ({ v, correct: false })),
    ]) as { v: number; correct: boolean }[]

    allValues.forEach(({ v, correct }, idx) => {
      this.time.delayedCall(idx * 280, () => {
        this.spawnTile(v, correct)
      })
    })
  }

  // ── Tile spawning ────────────────────────────────────────────────────────────

  private spawnTile(value: number, isCorrect: boolean): void {
    const { width, height } = this.scale
    const colour = TILE_COLOURS[Math.floor(Math.random() * TILE_COLOURS.length)]

    // Random position within the play area (below HUD, clear of walls)
    const x = Phaser.Math.Between(RADIUS, width - RADIUS)
    const y = Phaser.Math.Between(100 + RADIUS, height - RADIUS)

    const gfx = this.add.graphics()
    gfx.fillStyle(colour, 1)
    gfx.fillCircle(0, 0, RADIUS)
    gfx.lineStyle(3, 0xffffff, 0.25)
    gfx.strokeCircle(0, 0, RADIUS)

    const label = this.add
      .text(0, 0, String(value), {
        fontSize: '30px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    const container = this.add.container(x, y, [gfx, label])
    container.setSize(RADIUS * 2, RADIUS * 2)
    container.setInteractive()

    // Random direction, speed controlled by config
    const angle = Math.random() * Math.PI * 2
    const speed = this.config.shooter.tileSpeed
    const tileData: TileData = {
      value,
      isCorrect,
      container,
      spawnedAt: Date.now(),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    }

    container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.handleTileHit(tileData)
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
    // Fire at the tile nearest to the horizontal centre of the screen
    const cx = this.scale.width / 2
    const nearest = this.tiles.reduce((a, b) =>
      Math.abs(a.container.x - cx) < Math.abs(b.container.x - cx) ? a : b,
    )
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
    this.scoreState = scoreOnCorrect(this.scoreState, ms)

    this.scoreText.setText(`score: ${this.scoreState.total}`)
    this.updateStreakHud()

    // Celebrate every 5-streak milestone
    if (this.scoreState.streak % 5 === 0) {
      this.celebrateMilestone(this.scoreState.streak)
    }

    this.flashText(tile.container.x, tile.container.y, '✓', '#00ff88')
    this.destroyTile(tile)

    // Classify rounds end when all correct tiles are shot
    if (this.current.type === 'classify') {
      this.classifyCorrectShot++
      if (this.classifyCorrectShot >= this.classifyCorrectTotal) {
        this.time.delayedCall(400, () => this.nextRound())
      }
    } else {
      this.time.delayedCall(400, () => this.nextRound())
    }
  }

  /**
   * Wrong tile hit: remove the tile and register an error, but keep the round
   * alive so the player can try again with the remaining tiles.
   */
  private handleIncorrect(tile: TileData): void {
    this.scoreState = scoreOnError(this.scoreState)
    this.updateStreakHud()
    this.flashText(tile.container.x, tile.container.y, '✗', '#ff4444')
    this.destroyTile(tile)
  }

  // ── HUD helpers ──────────────────────────────────────────────────────────────

  private updateStreakHud(): void {
    const { streak, multiplier } = this.scoreState
    if (streak === 0) {
      this.streakText.setText('')
      return
    }
    this.streakText.setText(`streak: ${streak} (x${multiplier.toFixed(1)})`)
  }

  private celebrateMilestone(streak: number): void {
    const { width, height } = this.scale
    const t = this.add
      .text(width / 2, height / 2, `${streak} in a row!`, {
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
    // Stop movement by zeroing velocity so the pop animation plays in place
    tile.vx = 0
    tile.vy = 0
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
      fromScene: 'ShooterScene',
    })
  }
}
