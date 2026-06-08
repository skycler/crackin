import Phaser from 'phaser'

/**
 * SessionEndScene — shown after a session completes.
 * Displays final score and buttons to play again or return to settings.
 */
export class SessionEndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SessionEndScene' })
  }

  init(data: { score: number; errors: number }): void {
    this.registry.set('lastScore', data.score)
    this.registry.set('lastErrors', data.errors)
  }

  create(): void {
    const { width, height } = this.scale
    const score = this.registry.get('lastScore') as number
    const errors = this.registry.get('lastErrors') as number

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

    // Play again
    const playAgain = this.add
      .text(width / 2 - 120, height / 2 + 140, '[play again]', {
        fontSize: '26px',
        fontFamily: 'monospace',
        color: '#3a86ff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    playAgain.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.scene.start('ShooterScene')
    })

    // Menu / settings
    const menu = this.add
      .text(width / 2 + 120, height / 2 + 140, '[settings]', {
        fontSize: '26px',
        fontFamily: 'monospace',
        color: '#888888',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    menu.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.scene.start('SettingsScene')
    })

    // Keyboard: R/Enter = play again, M/S = settings
    this.input.keyboard?.on(
      Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
      (e: KeyboardEvent) => {
        if (e.code === 'KeyR' || e.code === 'Enter') this.scene.start('ShooterScene')
        if (e.code === 'KeyM' || e.code === 'KeyS') this.scene.start('SettingsScene')
      },
    )
  }
}
