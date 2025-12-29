import * as Phaser from 'phaser';
import { gameEvents, GAME_EVENTS } from '../events/GameEvents';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

// Asset configuration - real assets to attempt loading
const ASSETS = {
  sprites: {
    players: ['warrior', 'rogue', 'mage'],
    enemies: ['skeleton', 'zombie', 'ghoul', 'vampire', 'lich', 'boss'],
    items: ['sword', 'shield', 'armor', 'potion', 'ring', 'gold'],
  },
  tiles: ['floor', 'wall', 'door', 'exit', 'chest'],
  audio: {
    sfx: [
      'attack', 'hit', 'critical', 'player-hurt', 'player-death',
      'enemy-death', 'item-pickup', 'level-up', 'door-open',
      'button-click', 'menu-open', 'flee', 'error', 'victory'
    ],
    music: ['menu', 'dungeon', 'combat', 'boss'],
  },
};

export class BootScene extends Phaser.Scene {
  private loadingBar!: Phaser.GameObjects.Graphics;
  private progressBar!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private failedAssets: Set<string> = new Set();

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createLoadingUI();
    this.setupErrorHandler();
    this.loadAssets();
    this.setupLoadingEvents();
  }

  private createLoadingUI(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.loadingBar = this.add.graphics();
    this.loadingBar.fillStyle(0x222222, 1);
    this.loadingBar.fillRect(centerX - 160, centerY - 25, 320, 50);

    this.progressBar = this.add.graphics();

    this.loadingText = this.add.text(centerX, centerY - 60, 'Loading...', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffffff',
    });
    this.loadingText.setOrigin(0.5);

    this.add.text(centerX, centerY - 120, 'ASHFALL', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#ff6600',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private setupErrorHandler(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      this.failedAssets.add(file.key);
    });
  }

  private loadAssets(): void {
    // Try to load real assets
    this.loadPlayerSprites();
    this.loadEnemySprites();
    this.loadTileSprites();
    this.loadItemSprites();
    this.loadAudio();
  }

  private loadAudio(): void {
    // Load SFX
    ASSETS.audio.sfx.forEach(sfx => {
      this.load.audio(sfx, `/assets/audio/sfx/${sfx}.mp3`);
    });
    // Load music
    ASSETS.audio.music.forEach(track => {
      this.load.audio(`music-${track}`, `/assets/audio/music/${track}.mp3`);
    });
  }

  private loadPlayerSprites(): void {
    ASSETS.sprites.players.forEach(player => {
      this.load.image(`player-${player}`, `/assets/sprites/player/${player}.png`);
    });
    this.load.image('player', '/assets/sprites/player/warrior.png');
  }

  private loadEnemySprites(): void {
    ASSETS.sprites.enemies.forEach(enemy => {
      this.load.image(`enemy-${enemy}`, `/assets/sprites/enemies/${enemy}.png`);
    });
  }

  private loadTileSprites(): void {
    ASSETS.tiles.forEach(tile => {
      this.load.image(`tile-${tile}`, `/assets/tiles/${tile}.png`);
    });
  }

  private loadItemSprites(): void {
    ASSETS.sprites.items.forEach(item => {
      this.load.image(`item-${item}`, `/assets/sprites/items/${item}.png`);
    });
  }

  private setupLoadingEvents(): void {
    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0xff6600, 1);
      this.progressBar.fillRect(
        GAME_WIDTH / 2 - 150,
        GAME_HEIGHT / 2 - 15,
        300 * value,
        30
      );
      this.loadingText.setText(`Loading... ${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      this.loadingText.setText('Ready!');
    });
  }

  create(): void {
    // Generate fallback textures for any assets that failed to load
    this.generateFallbackTextures();

    gameEvents.emit(GAME_EVENTS.SCENE_READY, 'BootScene');
    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }

  private generateFallbackTextures(): void {
    // Player fallbacks
    if (this.failedAssets.has('player') || !this.textures.exists('player')) {
      this.createPlayerTexture('player', 0x4488ff);
    }
    ASSETS.sprites.players.forEach((p, i) => {
      const key = `player-${p}`;
      if (this.failedAssets.has(key) || !this.textures.exists(key)) {
        const colors = [0x4488ff, 0x44aa44, 0xaa44aa];
        this.createPlayerTexture(key, colors[i] || 0x4488ff);
      }
    });

    // Enemy fallbacks
    const enemyColors: Record<string, number> = {
      skeleton: 0xcccccc, zombie: 0x446644, ghoul: 0x666688,
      vampire: 0x880044, lich: 0x440088, boss: 0xff2200,
    };
    ASSETS.sprites.enemies.forEach(enemy => {
      const key = `enemy-${enemy}`;
      if (this.failedAssets.has(key) || !this.textures.exists(key)) {
        this.createEnemyTexture(key, enemyColors[enemy] || 0xaa2222, enemy === 'boss');
      }
    });

    // Tile fallbacks
    const tileColors: Record<string, number> = {
      floor: 0x333333, wall: 0x555555, door: 0x886644, exit: 0x44ff44, chest: 0xccaa00,
    };
    ASSETS.tiles.forEach(tile => {
      const key = `tile-${tile}`;
      if (this.failedAssets.has(key) || !this.textures.exists(key)) {
        this.createTileTexture(key, tileColors[tile] || 0x333333);
      }
    });

    // Item fallbacks
    const itemColors: Record<string, number> = {
      sword: 0xaaaaaa, shield: 0x6666aa, armor: 0x886644,
      potion: 0xff4444, ring: 0xffaa00, gold: 0xffcc00,
    };
    ASSETS.sprites.items.forEach(item => {
      const key = `item-${item}`;
      if (this.failedAssets.has(key) || !this.textures.exists(key)) {
        this.createItemTexture(key, itemColors[item] || 0xaaaaaa);
      }
    });

    // UI elements (always generated)
    this.createUITexture('button', 0x444444, 120, 40);
    this.createUITexture('panel', 0x222222, 200, 300);
  }

  private createPlayerTexture(key: string, color: number): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color, 1);
    g.fillRect(4, 4, 24, 24);
    g.fillStyle(0xffffff, 1);
    g.fillRect(8, 8, 6, 6);
    g.fillRect(18, 8, 6, 6);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  private createEnemyTexture(key: string, color: number, isBoss = false): void {
    const size = isBoss ? 64 : 32;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color, 1);
    g.fillRect(2, 2, size - 4, size - 4);
    g.fillStyle(0xff0000, 1);
    const eyeSize = isBoss ? 10 : 6;
    g.fillRect(size * 0.25 - eyeSize / 2, size * 0.25, eyeSize, eyeSize);
    g.fillRect(size * 0.75 - eyeSize / 2, size * 0.25, eyeSize, eyeSize);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private createTileTexture(key: string, color: number): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color, 1);
    g.fillRect(0, 0, 32, 32);
    g.lineStyle(1, 0x222222, 0.3);
    g.strokeRect(0, 0, 32, 32);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  private createItemTexture(key: string, color: number): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color, 1);
    g.fillRoundedRect(2, 2, 20, 20, 4);
    g.generateTexture(key, 24, 24);
    g.destroy();
  }

  private createUITexture(key: string, color: number, w: number, h: number): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 0, w, h, 8);
    g.lineStyle(2, 0x666666, 1);
    g.strokeRoundedRect(0, 0, w, h, 8);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
