import * as Phaser from 'phaser';
import { gameEvents, GAME_EVENTS } from '../events/GameEvents';
import { GAME_WIDTH, GAME_HEIGHT, GAME_CONSTANTS } from '../config';
import { generateLoot, generateBossLoot } from '../systems/LootGenerator';
import { ParticleEffects, ScreenEffects, soundManager } from '../effects';
import type { Character, Enemy, DungeonLayout, Item } from '@/types';

type CombatTurn = 'player' | 'enemy';

interface CombatResult {
  damage: number;
  isCrit: boolean;
  targetDied: boolean;
}

interface CombatInitData {
  character: Character;
  enemy: Enemy;
  returnData: { floor: number; roomId: number; dungeonLayout: DungeonLayout };
}

export class CombatScene extends Phaser.Scene {
  private character!: Character;
  private enemy!: Enemy;
  private returnData!: { floor: number; roomId: number; dungeonLayout: DungeonLayout };
  private currentTurn: CombatTurn = 'player';
  private isAnimating = false;

  // UI Elements
  private playerSprite!: Phaser.GameObjects.Image;
  private enemySprite!: Phaser.GameObjects.Image;
  private playerHealthBar!: Phaser.GameObjects.Graphics;
  private playerManaBar!: Phaser.GameObjects.Graphics;
  private enemyHealthBar!: Phaser.GameObjects.Graphics;
  private turnText!: Phaser.GameObjects.Text;
  private actionButtons: Phaser.GameObjects.Container[] = [];
  private combatLog: Phaser.GameObjects.Text[] = [];
  private redFlash!: Phaser.GameObjects.Graphics;
  private particles!: ParticleEffects;
  private screenEffects!: ScreenEffects;

  constructor() {
    super({ key: 'CombatScene' });
  }

  init(data: CombatInitData): void {
    this.character = { ...data.character };
    this.enemy = { ...data.enemy };
    this.returnData = data.returnData;
    this.currentTurn = 'player';
    this.isAnimating = false;
  }

  create(): void {
    this.particles = new ParticleEffects(this);
    this.screenEffects = new ScreenEffects(this);
    this.createBackground();
    this.createRedFlash();
    this.createCombatants();
    this.createHealthBars();
    this.createActionButtons();
    this.createTurnIndicator();
    this.createCombatLog();
    this.addLogMessage(`Combat with ${this.enemy.name} begins!`);
    soundManager.play('menuOpen');
    gameEvents.emit(GAME_EVENTS.COMBAT_START, { enemy: this.enemy });
    gameEvents.emit(GAME_EVENTS.SCENE_READY, 'CombatScene');
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0a0a, 0x1a0a0a, 0x2a1a1a, 0x2a1a1a, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.lineStyle(2, 0x444444, 1);
    bg.lineBetween(0, 400, GAME_WIDTH, 400);
  }

  private createRedFlash(): void {
    this.redFlash = this.add.graphics();
    this.redFlash.fillStyle(0xff0000, 0.3);
    this.redFlash.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.redFlash.setAlpha(0);
    this.redFlash.setDepth(100);
  }

  private createCombatants(): void {
    this.playerSprite = this.add.image(200, 300, 'player').setScale(4);
    const enemyTexture = this.getEnemyTexture();
    this.enemySprite = this.add.image(600, 300, enemyTexture).setScale(4);

    this.add.text(200, 170, this.character.class, {
      fontFamily: 'monospace', fontSize: '18px', color: '#4488ff'
    }).setOrigin(0.5);

    this.add.text(600, 170, this.enemy.name, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ff4444'
    }).setOrigin(0.5);
  }

  private getEnemyTexture(): string {
    const name = this.enemy.name.toLowerCase();
    if (name.includes('goblin')) return 'enemy-goblin';
    if (name.includes('skeleton')) return 'enemy-skeleton';
    if (name.includes('demon')) return 'enemy-demon';
    return 'enemy-goblin';
  }

  private createHealthBars(): void {
    this.playerHealthBar = this.add.graphics();
    this.playerManaBar = this.add.graphics();
    this.enemyHealthBar = this.add.graphics();
    this.updateHealthBars();
  }

  private updateHealthBars(): void {
    const barWidth = 150;
    const barHeight = 16;
    const x = 125;

    // Player HP bar
    this.playerHealthBar.clear();
    this.playerHealthBar.fillStyle(0x222222, 1);
    this.playerHealthBar.fillRect(x, 195, barWidth, barHeight);
    const hpPercent = Math.max(0, this.character.health / this.character.maxHealth);
    this.playerHealthBar.fillStyle(hpPercent > 0.3 ? 0x44aa44 : 0xaa4444, 1);
    this.playerHealthBar.fillRect(x, 195, barWidth * hpPercent, barHeight);
    this.playerHealthBar.lineStyle(2, 0x666666, 1);
    this.playerHealthBar.strokeRect(x, 195, barWidth, barHeight);

    // Player MP bar
    this.playerManaBar.clear();
    this.playerManaBar.fillStyle(0x222222, 1);
    this.playerManaBar.fillRect(x, 215, barWidth, barHeight - 4);
    const mpPercent = Math.max(0, this.character.mana / this.character.maxMana);
    this.playerManaBar.fillStyle(0x4444aa, 1);
    this.playerManaBar.fillRect(x, 215, barWidth * mpPercent, barHeight - 4);
    this.playerManaBar.lineStyle(1, 0x555555, 1);
    this.playerManaBar.strokeRect(x, 215, barWidth, barHeight - 4);

    // Enemy HP bar
    this.enemyHealthBar.clear();
    this.enemyHealthBar.fillStyle(0x222222, 1);
    this.enemyHealthBar.fillRect(525, 195, barWidth, barHeight);
    const enemyPercent = Math.max(0, this.enemy.health / this.enemy.maxHealth);
    this.enemyHealthBar.fillStyle(0xaa4444, 1);
    this.enemyHealthBar.fillRect(525, 195, barWidth * enemyPercent, barHeight);
    this.enemyHealthBar.lineStyle(2, 0x666666, 1);
    this.enemyHealthBar.strokeRect(525, 195, barWidth, barHeight);
  }

  private createActionButtons(): void {
    const buttonY = 520;
    const actions = [
      { label: 'Attack', action: () => this.playerAttack() },
      { label: 'Use Item', action: () => this.playerUseItem() },
      { label: 'Flee', action: () => this.playerFlee() },
    ];
    actions.forEach((btn, i) => {
      const container = this.createButton(200 + i * 200, buttonY, btn.label, btn.action);
      this.actionButtons.push(container);
    });
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const w = 140, h = 45;
    const bg = this.add.graphics();
    this.drawButton(bg, w, h, false);
    const text = this.add.text(0, 0, label, { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    container.add([bg, text]);
    container.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    container.on('pointerover', () => this.drawButton(bg, w, h, true));
    container.on('pointerout', () => this.drawButton(bg, w, h, false));
    container.on('pointerdown', () => {
      soundManager.play('buttonClick');
      onClick();
    });
    return container;
  }

  private drawButton(bg: Phaser.GameObjects.Graphics, w: number, h: number, hover: boolean): void {
    bg.clear();
    bg.fillStyle(hover ? 0x555555 : 0x444444, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(2, hover ? 0xff8833 : 0xff6600, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
  }

  private createTurnIndicator(): void {
    this.turnText = this.add.text(GAME_WIDTH / 2, 50, 'YOUR TURN', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffffff'
    }).setOrigin(0.5);
  }

  private createCombatLog(): void {
    this.add.text(20, 420, 'Combat Log:', { fontFamily: 'monospace', fontSize: '14px', color: '#888888' });
  }

  private addLogMessage(msg: string): void {
    const y = 440 + this.combatLog.length * 16;
    if (this.combatLog.length >= 4) {
      const oldest = this.combatLog.shift();
      oldest?.destroy();
      this.combatLog.forEach((t, i) => t.setY(440 + i * 16));
    }
    const text = this.add.text(20, y, msg, { fontFamily: 'monospace', fontSize: '12px', color: '#cccccc' });
    this.combatLog.push(text);
  }

  private setButtonsEnabled(enabled: boolean): void {
    this.actionButtons.forEach((btn) => {
      enabled ? btn.setInteractive().setAlpha(1) : btn.disableInteractive().setAlpha(0.5);
    });
  }

  private playerAttack(): void {
    if (this.isAnimating || this.currentTurn !== 'player') return;
    this.isAnimating = true;
    this.setButtonsEnabled(false);
    soundManager.play('attack');

    const result = this.calculateDamage(this.character, this.enemy);
    this.enemy.health -= result.damage;

    const critText = result.isCrit ? ' CRITICAL!' : '';
    this.addLogMessage(`You dealt ${result.damage} damage!${critText}`);
    gameEvents.emit(GAME_EVENTS.PLAYER_ATTACK, { damage: result.damage, isCrit: result.isCrit });

    this.playAttackAnimation(this.playerSprite, 600, () => {
      soundManager.play(result.isCrit ? 'critical' : 'hit');
      this.shakeSprite(this.enemySprite);
      if (result.isCrit) {
        this.particles.criticalHit({ x: 600, y: 300 });
        this.screenEffects.zoomPulse(1.03);
      } else {
        this.particles.hitSparks({ x: 600, y: 300 });
      }
      this.showDamageNumber(600, 280, result.damage, result.isCrit, false, () => {
        this.updateHealthBars();
        this.enemy.health <= 0 ? this.enemyDefeated() : this.switchTurn();
      });
    });
  }

  private calculateDamage(attacker: Character | Enemy, target: Character | Enemy): CombatResult {
    const isPlayer = 'stats' in attacker;
    const enemy = attacker as Enemy;
    const baseDamage = isPlayer
      ? GAME_CONSTANTS.BASE_DAMAGE + (attacker as Character).stats.strength * 0.5
      : (enemy.damage ?? enemy.attack ?? 10);
    const weaponDamage = isPlayer && (attacker as Character).equipment.weapon?.stats.damage || 0;
    const defense = 'defense' in target ? (target as Enemy).defense : 0;
    const critChance = isPlayer
      ? GAME_CONSTANTS.BASE_CRIT_CHANCE + (attacker as Character).stats.agility * GAME_CONSTANTS.AGILITY_CRIT_BONUS
      : 0.05;
    const isCrit = Math.random() < critChance;
    const rawDamage = baseDamage + weaponDamage;
    const mitigated = Math.max(1, rawDamage - defense);
    const finalDamage = Math.floor(isCrit ? mitigated * GAME_CONSTANTS.CRIT_MULTIPLIER : mitigated);
    return { damage: finalDamage, isCrit, targetDied: target.health - finalDamage <= 0 };
  }

  private playAttackAnimation(sprite: Phaser.GameObjects.Image, targetX: number, onComplete: () => void): void {
    const startX = sprite.x;
    const direction = targetX > startX ? 1 : -1;
    this.tweens.add({
      targets: sprite,
      x: startX + direction * 50,
      duration: 150,
      ease: 'Power2',
      yoyo: true,
      onComplete
    });
  }

  private shakeSprite(sprite: Phaser.GameObjects.Image): void {
    const startX = sprite.x;
    this.tweens.add({
      targets: sprite,
      x: startX + 10,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Linear',
      onComplete: () => sprite.setX(startX)
    });
  }

  private shakeScreen(): void {
    this.cameras.main.shake(200, 0.01);
  }

  private flashRed(): void {
    this.redFlash.setAlpha(0.4);
    this.tweens.add({ targets: this.redFlash, alpha: 0, duration: 300 });
  }

  private showDamageNumber(x: number, y: number, dmg: number, crit: boolean, isHeal: boolean, onComplete: () => void): void {
    const color = isHeal ? '#44ff44' : (crit ? '#ffaa00' : '#ff4444');
    const size = crit ? '36px' : '28px';
    const text = this.add.text(x, y, crit ? `CRIT! -${dmg}` : (isHeal ? `+${dmg}` : `-${dmg}`), {
      fontFamily: 'monospace', fontSize: size, color, fontStyle: 'bold'
    }).setOrigin(0.5);
    this.tweens.add({ targets: text, y: y - 50, alpha: 0, duration: 900, ease: 'Power2', onComplete: () => { text.destroy(); onComplete(); } });
  }

  private switchTurn(): void {
    this.currentTurn = this.currentTurn === 'player' ? 'enemy' : 'player';
    this.turnText.setText(this.currentTurn === 'player' ? 'YOUR TURN' : 'ENEMY TURN');
    gameEvents.emit(GAME_EVENTS.COMBAT_TURN_CHANGE, this.currentTurn);
    if (this.currentTurn === 'enemy') {
      this.time.delayedCall(800, () => this.enemyAttack());
    } else {
      this.isAnimating = false;
      this.setButtonsEnabled(true);
    }
  }

  private enemyAttack(): void {
    const result = this.calculateDamage(this.enemy, this.character);
    this.character.health -= result.damage;
    this.addLogMessage(`${this.enemy.name} attacks for ${result.damage} damage!`);
    gameEvents.emit(GAME_EVENTS.COMBAT_DAMAGE, { target: 'player', damage: result.damage });

    this.playAttackAnimation(this.enemySprite, 200, () => {
      soundManager.play('hit');
      this.shakeSprite(this.playerSprite);
      this.screenEffects.damageEffect();
      this.particles.hitSparks({ x: 200, y: 300 });
      this.flashRed();
      this.showDamageNumber(200, 280, result.damage, false, false, () => {
        this.updateHealthBars();
        if (this.character.health <= this.character.maxHealth * 0.3) {
          this.screenEffects.lowHealthVignette();
        }
        this.character.health <= 0 ? this.playerDefeated() : this.switchTurn();
      });
    });
  }

  private playerUseItem(): void {
    if (this.isAnimating || this.currentTurn !== 'player') return;
    this.addLogMessage('No consumables available.');
    gameEvents.emit(GAME_EVENTS.PLAYER_USE_ITEM);
  }

  private playerFlee(): void {
    if (this.isAnimating || this.currentTurn !== 'player') return;
    const fleeChance = 0.5 + this.character.stats.agility * 0.01;
    if (Math.random() < fleeChance) {
      soundManager.play('flee');
      this.addLogMessage('You fled successfully!');
      gameEvents.emit(GAME_EVENTS.PLAYER_FLEE, { success: true });
      this.scene.start('DungeonScene', {
        character: this.character, dungeonLayout: this.returnData.dungeonLayout,
        floor: this.returnData.floor, roomId: this.returnData.roomId
      });
    } else {
      soundManager.play('error');
      this.addLogMessage('Failed to flee!');
      gameEvents.emit(GAME_EVENTS.PLAYER_FLEE, { success: false });
      this.switchTurn();
    }
  }

  private enemyDefeated(): void {
    const xp = this.enemy.experienceReward;
    soundManager.play('enemyDeath');
    this.particles.deathSmoke({ x: 600, y: 300 });
    this.addLogMessage(`${this.enemy.name} defeated! +${xp} XP`);
    gameEvents.emit(GAME_EVENTS.ENEMY_KILLED, this.enemy);
    gameEvents.emit(GAME_EVENTS.COMBAT_END, { winner: 'player', enemy: this.enemy, xpGained: xp });

    // Generate loot based on floor and enemy
    const isBoss = this.enemy.name.toLowerCase().includes('boss') ||
                   this.enemy.name.toLowerCase().includes('demon lord');
    const loot: Item[] = isBoss
      ? generateBossLoot(this.returnData.floor)
      : generateLoot(this.returnData.floor, this.enemy);

    this.tweens.add({
      targets: this.enemySprite, alpha: 0, y: this.enemySprite.y + 50, duration: 500,
      onComplete: () => {
        // If loot dropped, emit event to show loot modal
        if (loot.length > 0) {
          gameEvents.emit(GAME_EVENTS.LOOT_DROPPED, { items: loot, enemy: this.enemy });
          gameEvents.emit(GAME_EVENTS.UI_SHOW_LOOT, { items: loot });
          // Wait for loot modal to close before returning to dungeon
          const onResume = () => {
            gameEvents.off(GAME_EVENTS.UI_RESUME_GAME, onResume);
            this.returnToDungeon();
          };
          gameEvents.on(GAME_EVENTS.UI_RESUME_GAME, onResume);
        } else {
          this.time.delayedCall(800, () => this.returnToDungeon());
        }
      }
    });
  }

  private returnToDungeon(): void {
    this.scene.start('DungeonScene', {
      character: this.character,
      dungeonLayout: this.returnData.dungeonLayout,
      floor: this.returnData.floor,
      roomId: this.returnData.roomId,
    });
  }

  private playerDefeated(): void {
    this.character.isAlive = false;
    soundManager.play('playerDeath');
    this.screenEffects.heavyShake();
    this.particles.bloodSplatter({ x: 200, y: 300 });
    this.addLogMessage('You have been defeated...');
    gameEvents.emit(GAME_EVENTS.PLAYER_DIED, this.character);
    gameEvents.emit(GAME_EVENTS.COMBAT_END, { winner: 'enemy', character: this.character });

    this.tweens.add({
      targets: this.playerSprite, alpha: 0, angle: 90, duration: 800,
      onComplete: () => {
        this.time.delayedCall(500, () => {
          // Collect equipped items that will be burned
          const itemsLost = [];
          if (this.character.equipment.weapon) itemsLost.push(this.character.equipment.weapon);
          if (this.character.equipment.armor) itemsLost.push(this.character.equipment.armor);
          if (this.character.equipment.accessory) itemsLost.push(this.character.equipment.accessory);

          this.scene.start('DeathScene', {
            character: this.character,
            floor: this.returnData.floor,
            itemsLost,
          });
        });
      }
    });
  }
}
