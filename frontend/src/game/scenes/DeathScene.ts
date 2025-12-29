import * as Phaser from 'phaser';
import { gameEvents, GAME_EVENTS } from '../events/GameEvents';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { soundManager } from '../effects';
import type { Character, Item } from '@/types';

interface DeathSceneData {
  character: Character;
  floor: number;
  itemsLost: Item[];
}

export class DeathScene extends Phaser.Scene {
  private character!: Character;
  private floor!: number;
  private itemsLost!: Item[];
  private overlay!: Phaser.GameObjects.Graphics;
  private bloodSplatter!: Phaser.GameObjects.Graphics;
  private deathText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'DeathScene' });
  }

  init(data: DeathSceneData): void {
    this.character = data.character;
    this.floor = data.floor;
    this.itemsLost = data.itemsLost || [];
  }

  create(): void {
    gameEvents.emit(GAME_EVENTS.DEATH_SEQUENCE_START, {
      character: this.character,
      floor: this.floor,
    });

    this.createBloodSplatter();
    this.createOverlay();
    this.startDeathSequence();
  }

  private createBloodSplatter(): void {
    this.bloodSplatter = this.add.graphics();
    this.bloodSplatter.setAlpha(0);
    this.bloodSplatter.setDepth(5);

    // Draw splatter pattern
    const particles = 20;
    for (let i = 0; i < particles; i++) {
      const x = GAME_WIDTH / 2 + (Math.random() - 0.5) * 300;
      const y = GAME_HEIGHT / 2 + (Math.random() - 0.5) * 200;
      const radius = 10 + Math.random() * 30;
      this.bloodSplatter.fillStyle(0x8b0000, 0.6 + Math.random() * 0.4);
      this.bloodSplatter.fillCircle(x, y, radius);
    }
  }

  private createOverlay(): void {
    this.overlay = this.add.graphics();
    this.overlay.fillStyle(0x000000, 1);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setAlpha(0);
    this.overlay.setDepth(10);

    this.deathText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'YOU DIED', {
      fontFamily: 'monospace',
      fontSize: '64px',
      color: '#8b0000',
      fontStyle: 'bold',
    });
    this.deathText.setOrigin(0.5);
    this.deathText.setAlpha(0);
    this.deathText.setDepth(11);
  }

  private startDeathSequence(): void {
    // Play death sound
    soundManager.play('playerDeath');

    // Phase 1: Screen shake and red flash
    this.cameras.main.shake(500, 0.03);
    this.cameras.main.flash(300, 139, 0, 0);

    // Phase 2: Blood splatter
    this.time.delayedCall(200, () => {
      this.tweens.add({
        targets: this.bloodSplatter,
        alpha: 1,
        duration: 400,
        ease: 'Power2',
      });
    });

    // Phase 3: Fade to black
    this.time.delayedCall(800, () => {
      this.tweens.add({
        targets: this.overlay,
        alpha: 0.9,
        duration: 1000,
        ease: 'Power2',
      });
    });

    // Phase 4: Show death text
    this.time.delayedCall(1800, () => {
      this.tweens.add({
        targets: this.deathText,
        alpha: 1,
        duration: 800,
        ease: 'Power2',
      });

      // Pulse effect on text
      this.tweens.add({
        targets: this.deathText,
        scale: { from: 1, to: 1.05 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // Phase 5: Emit chain pending event
    this.time.delayedCall(2500, () => {
      gameEvents.emit(GAME_EVENTS.DEATH_CHAIN_PENDING, {
        character: this.character,
        floor: this.floor,
        itemsLost: this.itemsLost,
      });
    });

    // Phase 6: Transition to React overlay
    this.time.delayedCall(3500, () => {
      gameEvents.emit(GAME_EVENTS.UI_SHOW_DEATH, {
        floor: this.floor,
        itemsLost: this.itemsLost,
      });
    });
  }

  // Called from React when chain transaction is confirmed
  public onChainConfirmed(): void {
    gameEvents.emit(GAME_EVENTS.DEATH_CHAIN_CONFIRMED, {
      character: this.character,
    });
  }

  // Called from React when player clicks Continue
  public onContinue(): void {
    gameEvents.emit(GAME_EVENTS.DEATH_COMPLETE, {
      character: this.character,
    });
    this.scene.start('MenuScene');
  }
}
