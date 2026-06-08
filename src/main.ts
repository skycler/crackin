import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { SettingsScene } from './scenes/SettingsScene'
import { ShooterScene } from './shooter/ShooterScene'
import { GroupScene } from './group/GroupScene'
import { SessionEndScene } from './scenes/SessionEndScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0a0a0a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540,
  },
  scene: [BootScene, SettingsScene, ShooterScene, GroupScene, SessionEndScene],
  input: {
    activePointers: 3,
  },
}

export default new Phaser.Game(config)
