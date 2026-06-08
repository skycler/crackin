import Phaser from 'phaser'
import { decodeConfig, type GameMode } from '../config/session'

const FONT = { fontFamily: 'monospace', color: '#ffffff' }

const MODE_LABELS: Record<GameMode, string> = {
  shooter: 'Shooter',
  group: 'Group',
  relate: 'Relate',
}

const MODE_DESCS: Record<GameMode, string> = {
  shooter: 'shoot the correct answer',
  group: 'cover numbers with drawers',
  relate: 'build a path step by step',
}

const MODE_SCENE: Record<GameMode, string> = {
  shooter: 'ShooterScene',
  group: 'GroupScene',
  relate: 'RelateScene',
}

/**
 * MenuScene — shown after the settings screen when more than one mode is active.
 * Lists active modes with descriptions and routes on selection.
 * Keyboard: arrow keys + enter, or number keys 1–N.
 */
export class MenuScene extends Phaser.Scene {
  private activeModes: GameMode[] = []
  private selectedIdx = 0
  private modeItems: Phaser.GameObjects.Container[] = []

  constructor() {
    super({ key: 'MenuScene' })
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  init(): void {
    const qs = window.location.search.slice(1)
    const config = decodeConfig(qs)
    this.activeModes = config.modes
    this.selectedIdx = 0
  }

  create(): void {
    const { width } = this.scale

    // Title
    this.add
      .text(width / 2, 32, "Crackin'", {
        ...FONT,
        fontSize: '36px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)

    this.add
      .text(width / 2, 72, 'choose a mode', {
        ...FONT,
        fontSize: '20px',
        color: '#666666',
      })
      .setOrigin(0.5, 0)

    // Settings link
    this.add
      .text(width - 16, 16, '[settings]', {
        ...FONT,
        fontSize: '18px',
        color: '#444444',
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () =>
        this.scene.start('SettingsScene'),
      )

    this.buildModeList()

    // Keyboard navigation
    this.input.keyboard?.on(
      Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
      (e: KeyboardEvent) => {
        if (e.code === 'ArrowDown') {
          this.selectedIdx = (this.selectedIdx + 1) % this.activeModes.length
          this.updateSelection()
        } else if (e.code === 'ArrowUp') {
          this.selectedIdx =
            (this.selectedIdx - 1 + this.activeModes.length) % this.activeModes.length
          this.updateSelection()
        } else if (e.code === 'Enter') {
          this.launchMode(this.activeModes[this.selectedIdx])
        } else {
          const num = parseInt(e.key, 10)
          if (num >= 1 && num <= this.activeModes.length) {
            this.launchMode(this.activeModes[num - 1])
          }
        }
      },
    )
  }

  // ── Mode list ────────────────────────────────────────────────────────────────

  private buildModeList(): void {
    const { width, height } = this.scale
    const startY = height / 2 - ((this.activeModes.length - 1) * 80) / 2

    this.activeModes.forEach((mode, idx) => {
      const y = startY + idx * 80

      const bg = this.add.rectangle(0, 0, width - 80, 64, 0x161616).setOrigin(0.5)
      const title = this.add
        .text(-((width - 80) / 2 - 20), 0, `${idx + 1}. ${MODE_LABELS[mode]}`, {
          ...FONT,
          fontSize: '26px',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5)
      const desc = this.add
        .text(-((width - 80) / 2 - 20), 22, MODE_DESCS[mode], {
          ...FONT,
          fontSize: '14px',
          color: '#666666',
        })
        .setOrigin(0, 0.5)

      const container = this.add.container(width / 2, y, [bg, title, desc])
      container.setSize(width - 80, 64)
      container.setInteractive({ useHandCursor: true })
      container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () =>
        this.launchMode(mode),
      )

      this.modeItems.push(container)
    })

    this.updateSelection()
  }

  private updateSelection(): void {
    this.modeItems.forEach((container, idx) => {
      const bg = container.list[0] as Phaser.GameObjects.Rectangle
      bg.setFillStyle(idx === this.selectedIdx ? 0x1a3a6a : 0x161616)
      const border = idx === this.selectedIdx ? 0x3a86ff : 0x161616
      bg.setStrokeStyle(2, border)
    })
  }

  // ── Routing ──────────────────────────────────────────────────────────────────

  private launchMode(mode: GameMode): void {
    this.scene.start(MODE_SCENE[mode])
  }
}
