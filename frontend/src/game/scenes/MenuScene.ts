import * as Phaser from 'phaser';
import { gameEvents, GAME_EVENTS } from '../events/GameEvents';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { TransitionManager, soundManager } from '../effects';
import type { Character } from '@/types';

export class MenuScene extends Phaser.Scene {
  private character: Character | null = null;
  private enterDungeonBtn!: Phaser.GameObjects.Container;
  private viewStashBtn!: Phaser.GameObjects.Container;
  private characterPreview!: Phaser.GameObjects.Container;
  private transitions!: TransitionManager;

  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data: { character?: Character }): void {
    this.character = data.character || null;
  }

  create(): void {
    this.transitions = new TransitionManager(this);
    this.createBackground();
    this.createTitle();
    this.createCharacterPreview();
    this.createButtons();
    this.setupEventListeners();

    this.transitions.fadeIn(400);
    gameEvents.emit(GAME_EVENTS.SCENE_READY, 'MenuScene');
  }

  private createBackground(): void {
    // Dark gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a0a, 0x0a0a0a, 0x1a1a2a, 0x1a1a2a, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Decorative elements
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const alpha = Phaser.Math.FloatBetween(0.1, 0.3);
      this.add.circle(x, y, 2, 0xff6600, alpha);
    }
  }

  private createTitle(): void {
    const title = this.add.text(GAME_WIDTH / 2, 80, 'ASHFALL', {
      fontFamily: 'monospace',
      fontSize: '64px',
      color: '#ff6600',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtle glow effect via tween
    this.tweens.add({
      targets: title,
      alpha: 0.8,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(GAME_WIDTH / 2, 130, 'Roguelike Dungeon Crawler', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#888888',
    }).setOrigin(0.5);
  }

  private createCharacterPreview(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = 280;

    this.characterPreview = this.add.container(centerX, centerY);

    if (this.character && this.character.isAlive) {
      this.showCharacterInfo();
    } else {
      this.showNoCharacterMessage();
    }
  }

  private showCharacterInfo(): void {
    if (!this.character) return;

    // Character sprite (scaled up)
    const sprite = this.add.image(0, -40, 'player').setScale(3);

    // Character name and class
    const nameText = this.add.text(0, 20, `${this.character.class}`, {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Stats display
    const statsText = this.add.text(0, 60, [
      `Level: ${this.character.level}`,
      `HP: ${this.character.health}/${this.character.maxHealth}`,
      `STR: ${this.character.stats.strength} | AGI: ${this.character.stats.agility} | INT: ${this.character.stats.intelligence}`,
    ].join('\n'), {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#aaaaaa',
      align: 'center',
    }).setOrigin(0.5, 0);

    this.characterPreview.add([sprite, nameText, statsText]);
  }

  private showNoCharacterMessage(): void {
    const message = this.add.text(0, 0, 'No character found\nCreate one to begin', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#666666',
      align: 'center',
    }).setOrigin(0.5);

    this.characterPreview.add(message);
  }

  private createButtons(): void {
    const centerX = GAME_WIDTH / 2;
    const buttonY = 450;
    const buttonSpacing = 60;

    // Enter Dungeon button
    this.enterDungeonBtn = this.createButton(
      centerX,
      buttonY,
      'Enter Dungeon',
      this.character?.isAlive ?? false
    );
    this.enterDungeonBtn.on('pointerdown', () => {
      soundManager.play('buttonClick');
      this.onEnterDungeon();
    });

    // View Stash button
    this.viewStashBtn = this.createButton(
      centerX,
      buttonY + buttonSpacing,
      'View Stash',
      true
    );
    this.viewStashBtn.on('pointerdown', () => {
      soundManager.play('buttonClick');
      this.onViewStash();
    });
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    enabled: boolean
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const width = 200;
    const height = 45;

    // Button background
    const bg = this.add.graphics();
    bg.fillStyle(enabled ? 0x444444 : 0x222222, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.lineStyle(2, enabled ? 0xff6600 : 0x333333, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);

    // Button text
    const text = this.add.text(0, 0, label, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: enabled ? '#ffffff' : '#555555',
    }).setOrigin(0.5);

    container.add([bg, text]);

    if (enabled) {
      container.setInteractive(
        new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
        Phaser.Geom.Rectangle.Contains
      );

      container.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(0x555555, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
        bg.lineStyle(2, 0xff8833, 1);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
      });

      container.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(0x444444, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
        bg.lineStyle(2, 0xff6600, 1);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
      });
    }

    return container;
  }

  private setupEventListeners(): void {
    // Listen for UI events from React
    gameEvents.on(GAME_EVENTS.UI_ENTER_DUNGEON, () => this.onEnterDungeon());
  }

  private onEnterDungeon(): void {
    if (!this.character?.isAlive) return;

    gameEvents.emit(GAME_EVENTS.DUNGEON_ENTER, { dungeonId: 1 });
    this.scene.start('DungeonScene', { character: this.character });
  }

  private onViewStash(): void {
    gameEvents.emit(GAME_EVENTS.UI_VIEW_STASH);
  }

  // Called from React to update character data
  updateCharacter(character: Character | null): void {
    this.character = character;
    this.characterPreview.removeAll(true);

    if (character?.isAlive) {
      this.showCharacterInfo();
      this.enterDungeonBtn.setInteractive();
    } else {
      this.showNoCharacterMessage();
      this.enterDungeonBtn.disableInteractive();
    }
  }
}
