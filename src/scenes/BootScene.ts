import Phaser from 'phaser'

/**
 * BootScene — placeholder scene that displays the game title and
 * registers touch and keyboard input so integration smoke tests pass.
 */
export class BootScene extends Phaser.Scene {
  private inputIndicator!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'BootScene' })
  }

  create(): void {
    const { width, height } = this.scale

    // Title
    this.add
      .text(width / 2, height / 2 - 40, "Crackin'", {
        fontSize: '72px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    // Subtitle
    this.add
      .text(width / 2, height / 2 + 30, 'math fluency game', {
        fontSize: '24px',
        fontFamily: 'monospace',
        color: '#888888',
      })
      .setOrigin(0.5)

    // Input indicator — updated on any input to prove registration
    this.inputIndicator = this.add
      .text(width / 2, height - 40, 'tap or press any key to continue', {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#444444',
      })
      .setOrigin(0.5)

    this.tweens.add({
      targets: this.inputIndicator,
      alpha: 0.2,
      yoyo: true,
      repeat: -1,
      duration: 900,
    })

    // Touch input
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.onAnyInput()
    })

    // Keyboard input
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, () => {
      this.onAnyInput()
    })
  }

  private onAnyInput(): void {
    this.inputIndicator.setText('loading...')
    this.inputIndicator.setColor('#00ff88')
    this.inputIndicator.setAlpha(1)
    this.tweens.killTweensOf(this.inputIndicator)
    this.time.delayedCall(200, () => this.scene.start('SettingsScene'))
  }
}
