import Phaser from 'phaser'
import { decodeConfig } from '../config/session'

/**
 * SessionEndScene — shown after any session completes.
 * Displays final score and routes to play-again or menu/settings.
 * Routes through MenuScene when multiple modes are active.
 */
export class SessionEndScene extends Phaser.Scene {
  private lastScene = 'ShooterScene'

  constructor() {
    super({ key: 'SessionEndScene' })
  }

  init(data: { score: number; errors: number; fromScene?: string }): void {
    this.registry.set('lastScore', data.score)
    this.registry.set('lastErrors', data.errors)
    this.lastScene = data.fromScene ?? 'ShooterScene'
  }

  create(): void {
    const { width, height } = this.scale
    const score = this.registry.get('lastScore') as number
    const errors = this.registry.get('lastErrors') as number

    const config = decodeConfig(window.location.search.slice(1))
    const menuTarget = config.modes.length > 1 ? 'MenuScene' : 'SettingsScene'

    this.add
      .text(width / 2, height / 2 - 80, 'session complete', {
        fontSize: '40px',
        fontFamily: 'monospace',
        color: '#888888',
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, height / 2, `score: ${score}`, {
        fontSize: '72px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, height / 2 + 70, `errors: ${errors}`, {
        fontSize: '28px',
        fontFamily: 'monospace',
        color: '#ff6b6b',
      })
      .setOrigin(0.5)

    // Play again — replays the same mode
    const playAgain = this.add
      .text(width / 2 - 130, height / 2 + 140, '[play again]', {
        fontSize: '26px',
        fontFamily: 'monospace',
        color: '#3a86ff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    playAgain.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.scene.start(this.lastScene)
    })

    // Menu or settings
    const menuLabel = config.modes.length > 1 ? '[menu]' : '[settings]'
    const menu = this.add
      .text(width / 2 + 130, height / 2 + 140, menuLabel, {
        fontSize: '26px',
        fontFamily: 'monospace',
        color: '#888888',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    menu.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.scene.start(menuTarget)
    })

    // Keyboard: R/Enter = play again, M/S = menu
    this.input.keyboard?.on(
      Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
      (e: KeyboardEvent) => {
        if (e.code === 'KeyR' || e.code === 'Enter') this.scene.start(this.lastScene)
        if (e.code === 'KeyM' || e.code === 'KeyS') this.scene.start(menuTarget)
      },
    )
  }
}
