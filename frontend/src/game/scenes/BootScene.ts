import * as Phaser from 'phaser';
import { gameEvents, GAME_EVENTS } from '../events/GameEvents';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

export class BootScene extends Phaser.Scene {
  private loadingBar!: Phaser.GameObjects.Graphics;
  private progressBar!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createLoadingUI();
    this.loadAssets();
    this.setupLoadingEvents();
  }

  private createLoadingUI(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Loading bar background
    this.loadingBar = this.add.graphics();
    this.loadingBar.fillStyle(0x222222, 1);
    this.loadingBar.fillRect(centerX - 160, centerY - 25, 320, 50);

    // Progress bar (will be drawn in progress callback)
    this.progressBar = this.add.graphics();

    // Loading text
    this.loadingText = this.add.text(centerX, centerY - 60, 'Loading...', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffffff',
    });
    this.loadingText.setOrigin(0.5);

    // Game title
    this.add.text(centerX, centerY - 120, 'ASHFALL', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#ff6600',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private loadAssets(): void {
    // Generate placeholder assets programmatically
    this.generatePlaceholderTextures();
  }

  private generatePlaceholderTextures(): void {
    // Player sprite (32x32)
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    playerGraphics.fillStyle(0x4488ff, 1);
    playerGraphics.fillRect(4, 4, 24, 24);
    playerGraphics.fillStyle(0xffffff, 1);
    playerGraphics.fillRect(8, 8, 6, 6); // Eyes
    playerGraphics.fillRect(18, 8, 6, 6);
    playerGraphics.generateTexture('player', 32, 32);
    playerGraphics.destroy();

    // Enemy sprites (32x32)
    this.createEnemyTexture('enemy-goblin', 0x44aa44);
    this.createEnemyTexture('enemy-skeleton', 0xcccccc);
    this.createEnemyTexture('enemy-demon', 0xaa2222);

    // Tile textures
    this.createTileTexture('tile-floor', 0x333333);
    this.createTileTexture('tile-wall', 0x555555);
    this.createTileTexture('tile-door', 0x886644);
    this.createTileTexture('tile-exit', 0x44ff44);

    // Item icons (24x24)
    this.createItemTexture('item-sword', 0xaaaaaa, 'S');
    this.createItemTexture('item-shield', 0x6666aa, 'D');
    this.createItemTexture('item-armor', 0x886644, 'A');
    this.createItemTexture('item-potion', 0xff4444, 'P');
    this.createItemTexture('item-gold', 0xffcc00, 'G');

    // UI elements
    this.createUITexture('button', 0x444444, 120, 40);
    this.createUITexture('panel', 0x222222, 200, 300);
  }

  private createEnemyTexture(key: string, color: number): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color, 1);
    g.fillRect(4, 4, 24, 24);
    g.fillStyle(0xff0000, 1);
    g.fillRect(8, 8, 6, 6); // Red eyes
    g.fillRect(18, 8, 6, 6);
    g.generateTexture(key, 32, 32);
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

  private createItemTexture(key: string, color: number, letter: string): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color, 1);
    g.fillRoundedRect(2, 2, 20, 20, 4);
    g.generateTexture(key, 24, 24);
    g.destroy();

    // Add letter overlay via text (done in scenes that use items)
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
    gameEvents.emit(GAME_EVENTS.SCENE_READY, 'BootScene');

    // Transition to menu after a brief delay
    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }
}
