import * as Phaser from 'phaser';
import { gameEvents, GAME_EVENTS } from '../events/GameEvents';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { soundManager } from '../effects';
import type { Character, Item, DungeonRun } from '@/types';

interface VictorySceneData {
  character: Character;
  dungeonRun: DungeonRun;
  lootGained: Item[];
}

export class VictoryScene extends Phaser.Scene {
  private character!: Character;
  private dungeonRun!: DungeonRun;
  private lootGained!: Item[];
  private overlay!: Phaser.GameObjects.Graphics;
  private victoryText!: Phaser.GameObjects.Text;
  private particles!: Phaser.GameObjects.Graphics[];

  constructor() {
    super({ key: 'VictoryScene' });
  }

  init(data: VictorySceneData): void {
    this.character = data.character;
    this.dungeonRun = data.dungeonRun;
    this.lootGained = data.lootGained || [];
    this.particles = [];
  }

  create(): void {
    gameEvents.emit(GAME_EVENTS.DUNGEON_VICTORY, {
      character: this.character,
      dungeonRun: this.dungeonRun,
    });

    this.createBackground();
    this.createParticles();
    this.createVictoryText();
    this.startVictorySequence();
  }

  private createBackground(): void {
    this.overlay = this.add.graphics();
    this.overlay.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setAlpha(0);
  }

  private createParticles(): void {
    const colors = [0xffd700, 0xffa500, 0xffff00, 0xffffff];
    for (let i = 0; i < 30; i++) {
      const particle = this.add.graphics();
      const color = colors[Math.floor(Math.random() * colors.length)];
      particle.fillStyle(color, 0.8);
      particle.fillCircle(0, 0, 3 + Math.random() * 5);
      particle.setPosition(
        Math.random() * GAME_WIDTH,
        GAME_HEIGHT + 50
      );
      particle.setAlpha(0);
      this.particles.push(particle);
    }
  }

  private createVictoryText(): void {
    this.victoryText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'DUNGEON CLEARED!', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.victoryText.setOrigin(0.5);
    this.victoryText.setAlpha(0);
    this.victoryText.setScale(0.5);
  }

  private startVictorySequence(): void {
    // Play victory fanfare
    soundManager.play('victory');

    // Phase 1: Flash and overlay
    this.cameras.main.flash(500, 255, 215, 0);

    this.tweens.add({
      targets: this.overlay,
      alpha: 1,
      duration: 800,
      ease: 'Power2',
    });

    // Phase 2: Particles rise
    this.time.delayedCall(300, () => {
      this.particles.forEach((particle, i) => {
        this.tweens.add({
          targets: particle,
          alpha: 1,
          y: -50,
          duration: 3000 + Math.random() * 2000,
          delay: i * 50,
          ease: 'Sine.easeOut',
          onComplete: () => {
            particle.setY(GAME_HEIGHT + 50);
            this.tweens.add({
              targets: particle,
              y: -50,
              duration: 3000 + Math.random() * 2000,
              repeat: -1,
              ease: 'Sine.easeOut',
            });
          },
        });
      });
    });

    // Phase 3: Victory text appears
    this.time.delayedCall(500, () => {
      this.tweens.add({
        targets: this.victoryText,
        alpha: 1,
        scale: 1,
        duration: 600,
        ease: 'Back.easeOut',
      });

      // Shimmer effect
      this.tweens.add({
        targets: this.victoryText,
        scaleX: { from: 1, to: 1.02 },
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // Phase 4: Show React overlay with stats
    this.time.delayedCall(2000, () => {
      const timeElapsed = Date.now() - this.dungeonRun.startedAt;
      gameEvents.emit(GAME_EVENTS.UI_SHOW_VICTORY, {
        floorCleared: this.dungeonRun.currentFloor,
        enemiesKilled: this.dungeonRun.enemiesKilled,
        timeElapsed,
        lootGained: this.lootGained,
      });
    });
  }

  // Called from React when player clicks Return to Town
  public onReturn(): void {
    gameEvents.emit(GAME_EVENTS.VICTORY_COMPLETE, {
      character: this.character,
      lootGained: this.lootGained,
    });
    this.scene.start('MenuScene');
  }
}
