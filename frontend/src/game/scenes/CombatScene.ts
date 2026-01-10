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

// Enemy name to type mapping for on-chain combat
const ENEMY_TYPE_MAP: Record<string, number> = {
  skeleton: 0,
  zombie: 1,
  ghoul: 2,
  vampire: 3,
  lich: 4,
  boss: 5,
  'dungeon lord': 5,
  'demon lord': 5,
};

export class CombatScene extends Phaser.Scene {
  private character!: Character;
  private enemy!: Enemy;
  private returnData!: { floor: number; roomId: number; dungeonLayout: DungeonLayout };
  private currentTurn: CombatTurn = 'player';
  private isAnimating = false;
  private isWaitingForTx = false;

  // UI Elements
  private playerSprite!: Phaser.GameObjects.Sprite;
  private enemySprite!: Phaser.GameObjects.Sprite;
  private enemyHasAnimations = false;
  private playerHealthBar!: Phaser.GameObjects.Graphics;
  private playerManaBar!: Phaser.GameObjects.Graphics;
  private enemyHealthBar!: Phaser.GameObjects.Graphics;
  private turnText!: Phaser.GameObjects.Text;
  private txStatusText!: Phaser.GameObjects.Text;
  private actionButtons: Phaser.GameObjects.Container[] = [];
  private combatLog: Phaser.GameObjects.Text[] = [];
  private redFlash!: Phaser.GameObjects.Graphics;
  private particles!: ParticleEffects;
  private screenEffects!: ScreenEffects;

  // Transaction event handlers
  private txSuccessHandler!: (...args: unknown[]) => void;
  private txFailedHandler!: (...args: unknown[]) => void;

  constructor() {
    super({ key: 'CombatScene' });
  }

  init(data: CombatInitData): void {
    this.character = { ...data.character };
    this.enemy = { ...data.enemy };
    this.returnData = data.returnData;
    this.currentTurn = 'player';
    this.isAnimating = false;
    this.isWaitingForTx = false;
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
    this.createTxStatusIndicator();
    this.createCombatLog();

    // Setup transaction event listeners
    this.setupTxEventListeners();

    // Switch to battle music
    soundManager.playMusic('battle');
    soundManager.play('menuOpen');

    // Start combat on-chain
    this.startCombatOnChain();
  }

  private setupTxEventListeners(): void {
    this.txSuccessHandler = (data: unknown) => {
      const { action } = data as { action: string; txHash?: string };
      console.log(`[CombatScene] TX Success: ${action}`);
      this.hideTxStatus();

      switch (action) {
        case 'start_combat':
          this.onCombatStarted();
          break;
        case 'player_attack':
          this.onPlayerAttackConfirmed();
          break;
        case 'enemy_attack':
          this.onEnemyAttackConfirmed();
          break;
        case 'flee':
          this.onFleeConfirmed();
          break;
      }
    };

    this.txFailedHandler = (data: unknown) => {
      const { action, error } = data as { action: string; error: string };
      console.error(`[CombatScene] TX Failed: ${action}`, error);
      this.showTxError(error);
      this.isWaitingForTx = false;
      this.isAnimating = false;
      this.setButtonsEnabled(this.currentTurn === 'player');
    };

    gameEvents.on(GAME_EVENTS.COMBAT_TX_SUCCESS, this.txSuccessHandler);
    gameEvents.on(GAME_EVENTS.COMBAT_TX_FAILED, this.txFailedHandler);
  }

  shutdown(): void {
    gameEvents.off(GAME_EVENTS.COMBAT_TX_SUCCESS, this.txSuccessHandler);
    gameEvents.off(GAME_EVENTS.COMBAT_TX_FAILED, this.txFailedHandler);
  }

  private startCombatOnChain(): void {
    this.isWaitingForTx = true;
    this.setButtonsEnabled(false);
    this.showTxStatus('Starting combat on-chain...');

    const enemyType = this.getEnemyTypeNumber();
    gameEvents.emit(GAME_EVENTS.COMBAT_START_REQUEST, {
      enemyType,
      floor: this.returnData.floor,
    });
  }

  private onCombatStarted(): void {
    this.isWaitingForTx = false;
    this.addLogMessage(`Combat with ${this.enemy.name} begins!`);
    this.setButtonsEnabled(true);
    gameEvents.emit(GAME_EVENTS.COMBAT_START, { enemy: this.enemy });
    gameEvents.emit(GAME_EVENTS.SCENE_READY, 'CombatScene');
  }

  private getEnemyTypeNumber(): number {
    const name = this.enemy.name.toLowerCase();
    for (const [key, value] of Object.entries(ENEMY_TYPE_MAP)) {
      if (name.includes(key)) return value;
    }
    return 0; // Default to skeleton
  }

  private createBackground(): void {
    if (this.textures.exists('battle-bg')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'battle-bg')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
        .setDepth(0);
    } else {
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x1a0a0a, 0x1a0a0a, 0x2a1a1a, 0x2a1a1a, 1);
      bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
  }

  private createRedFlash(): void {
    this.redFlash = this.add.graphics();
    this.redFlash.fillStyle(0xff0000, 0.3);
    this.redFlash.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.redFlash.setAlpha(0);
    this.redFlash.setDepth(100);
  }

  private createCombatants(): void {
    const playerClass = this.character.class.toLowerCase();
    const playerIdleKey = `${playerClass}-idle`;
    const ANIM_SCALE = 3;
    const STATIC_SCALE = 0.22;
    const BOSS_ANIM_SCALE = 4.5;
    const BOSS_STATIC_SCALE = 0.32;

    if (this.textures.exists(playerIdleKey)) {
      this.playerSprite = this.add.sprite(200, 300, playerIdleKey).setScale(ANIM_SCALE).setDepth(10);
      this.playerSprite.play(playerIdleKey);
    } else {
      const playerTexture = `player-${playerClass}`;
      this.playerSprite = this.add.sprite(200, 300, playerTexture).setScale(STATIC_SCALE).setDepth(10);
    }

    const enemyType = this.getEnemyType();
    const enemyIdleKey = `${enemyType}-idle`;
    this.enemyHasAnimations = this.textures.exists(enemyIdleKey);

    if (this.enemyHasAnimations) {
      const scale = this.enemy.isBoss ? BOSS_ANIM_SCALE : ANIM_SCALE;
      this.enemySprite = this.add.sprite(600, 300, enemyIdleKey).setScale(scale).setDepth(10);
      this.enemySprite.play(enemyIdleKey);
    } else {
      const enemyTexture = this.getEnemyTexture();
      const scale = this.enemy.isBoss ? BOSS_STATIC_SCALE : STATIC_SCALE;
      this.enemySprite = this.add.sprite(600, 300, enemyTexture).setScale(scale).setDepth(10);
    }

    this.add.text(200, 170, this.character.class, {
      fontFamily: 'monospace', fontSize: '18px', color: '#4488ff'
    }).setOrigin(0.5);

    this.add.text(600, 170, this.enemy.name, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ff4444'
    }).setOrigin(0.5);
  }

  private getEnemyType(): string {
    const name = this.enemy.name.toLowerCase();
    if (name.includes('vampire')) return 'vampire';
    if (name.includes('zombie')) return 'zombie';
    return '';
  }

  private getEnemyTexture(): string {
    const name = this.enemy.name.toLowerCase();
    if (name.includes('dragon')) return 'enemy-dragon';
    if (name.includes('boss') || name.includes('demon') || name.includes('lord')) return 'enemy-boss';
    if (name.includes('lich')) return 'enemy-lich';
    if (name.includes('vampire')) return 'enemy-vampire';
    if (name.includes('ghoul')) return 'enemy-ghoul';
    if (name.includes('zombie')) return 'enemy-zombie';
    if (name.includes('skeleton')) return 'enemy-skeleton';
    if (name.includes('goblin')) return 'enemy-goblin';
    return 'enemy-skeleton';
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

    this.playerHealthBar.clear();
    this.playerHealthBar.fillStyle(0x222222, 1);
    this.playerHealthBar.fillRect(x, 195, barWidth, barHeight);
    const hpPercent = Math.max(0, this.character.health / this.character.maxHealth);
    this.playerHealthBar.fillStyle(hpPercent > 0.3 ? 0x44aa44 : 0xaa4444, 1);
    this.playerHealthBar.fillRect(x, 195, barWidth * hpPercent, barHeight);
    this.playerHealthBar.lineStyle(2, 0x666666, 1);
    this.playerHealthBar.strokeRect(x, 195, barWidth, barHeight);

    this.playerManaBar.clear();
    this.playerManaBar.fillStyle(0x222222, 1);
    this.playerManaBar.fillRect(x, 215, barWidth, barHeight - 4);
    const mpPercent = Math.max(0, this.character.mana / this.character.maxMana);
    this.playerManaBar.fillStyle(0x4444aa, 1);
    this.playerManaBar.fillRect(x, 215, barWidth * mpPercent, barHeight - 4);
    this.playerManaBar.lineStyle(1, 0x555555, 1);
    this.playerManaBar.strokeRect(x, 215, barWidth, barHeight - 4);

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
    this.turnText = this.add.text(GAME_WIDTH / 2, 50, 'CONNECTING...', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffffff'
    }).setOrigin(0.5);
  }

  private createTxStatusIndicator(): void {
    this.txStatusText = this.add.text(GAME_WIDTH / 2, 80, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffaa00'
    }).setOrigin(0.5).setDepth(100);
  }

  private showTxStatus(msg: string): void {
    this.txStatusText.setText(msg);
    this.txStatusText.setColor('#ffaa00');
  }

  private showTxError(msg: string): void {
    this.txStatusText.setText(`Error: ${msg}`);
    this.txStatusText.setColor('#ff4444');
    this.time.delayedCall(3000, () => this.hideTxStatus());
  }

  private hideTxStatus(): void {
    this.txStatusText.setText('');
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

  // ==================== PLAYER ATTACK ====================

  private playerAttack(): void {
    if (this.isAnimating || this.isWaitingForTx || this.currentTurn !== 'player') return;

    this.isWaitingForTx = true;
    this.isAnimating = true;
    this.setButtonsEnabled(false);
    this.showTxStatus('Signing attack transaction...');

    // Emit request to CombatBridge (React)
    gameEvents.emit(GAME_EVENTS.PLAYER_ATTACK_REQUEST);
  }

  private onPlayerAttackConfirmed(): void {
    this.isWaitingForTx = false;
    soundManager.play('attack');

    // Calculate damage locally for animation (on-chain has authoritative state)
    const result = this.calculateDamage(this.character, this.enemy);
    this.enemy.health -= result.damage;

    const critText = result.isCrit ? ' CRITICAL!' : '';
    this.addLogMessage(`You dealt ${result.damage} damage!${critText}`);
    gameEvents.emit(GAME_EVENTS.PLAYER_ATTACK, { damage: result.damage, isCrit: result.isCrit });

    const playerClass = this.character.class.toLowerCase();
    const attackAnim = result.isCrit ? `${playerClass}-critical` : `${playerClass}-attack`;

    if (this.anims.exists(attackAnim)) {
      this.playerSprite.play(attackAnim);
      this.playerSprite.once('animationcomplete', () => this.onPlayerAttackHit(result));
    } else {
      this.playAttackAnimation(this.playerSprite, 600, () => this.onPlayerAttackHit(result));
    }
  }

  private onPlayerAttackHit(result: CombatResult): void {
    soundManager.play(result.isCrit ? 'critical' : 'hit');

    const enemyType = this.getEnemyType();
    const enemyHitAnim = `${enemyType}-hit`;
    if (this.enemyHasAnimations && this.anims.exists(enemyHitAnim)) {
      this.enemySprite.play(enemyHitAnim);
      this.enemySprite.once('animationcomplete', () => this.enemySprite.play(`${enemyType}-idle`));
    } else {
      this.shakeSprite(this.enemySprite);
    }

    if (result.isCrit) {
      this.particles.criticalHit({ x: 600, y: 300 });
      this.screenEffects.zoomPulse(1.03);
    } else {
      this.particles.hitSparks({ x: 600, y: 300 });
    }

    this.showDamageNumber(600, 280, result.damage, result.isCrit, false, () => {
      const playerClass = this.character.class.toLowerCase();
      if (this.anims.exists(`${playerClass}-idle`)) {
        this.playerSprite.play(`${playerClass}-idle`);
      }
      this.updateHealthBars();
      this.enemy.health <= 0 ? this.enemyDefeated() : this.switchTurn();
    });
  }

  // ==================== ENEMY ATTACK ====================

  private switchTurn(): void {
    this.currentTurn = this.currentTurn === 'player' ? 'enemy' : 'player';
    this.turnText.setText(this.currentTurn === 'player' ? 'YOUR TURN' : 'ENEMY TURN');
    gameEvents.emit(GAME_EVENTS.COMBAT_TURN_CHANGE, this.currentTurn);

    if (this.currentTurn === 'enemy') {
      this.time.delayedCall(800, () => this.requestEnemyAttack());
    } else {
      this.isAnimating = false;
      this.setButtonsEnabled(true);
    }
  }

  private requestEnemyAttack(): void {
    this.isWaitingForTx = true;
    this.showTxStatus('Enemy attacking on-chain...');

    // Emit request to CombatBridge (React) - server wallet executes
    gameEvents.emit(GAME_EVENTS.ENEMY_ATTACK_REQUEST);
  }

  private onEnemyAttackConfirmed(): void {
    this.isWaitingForTx = false;
    this.enemyAttack();
  }

  private enemyAttack(): void {
    const result = this.calculateDamage(this.enemy, this.character);
    this.character.health -= result.damage;
    this.addLogMessage(`${this.enemy.name} attacks for ${result.damage} damage!`);
    gameEvents.emit(GAME_EVENTS.COMBAT_DAMAGE, { target: 'player', damage: result.damage });

    const enemyType = this.getEnemyType();
    const enemyAttackAnim = `${enemyType}-attack`;

    if (this.enemyHasAnimations && this.anims.exists(enemyAttackAnim)) {
      this.enemySprite.play(enemyAttackAnim);
      this.enemySprite.once('animationcomplete', () => this.onEnemyAttackHit(result));
    } else {
      this.playAttackAnimation(this.enemySprite, 200, () => this.onEnemyAttackHit(result));
    }
  }

  private onEnemyAttackHit(result: CombatResult): void {
    soundManager.play('hit');

    const playerClass = this.character.class.toLowerCase();
    const playerHitAnim = `${playerClass}-hit`;
    if (this.anims.exists(playerHitAnim)) {
      this.playerSprite.play(playerHitAnim);
      this.playerSprite.once('animationcomplete', () => {
        if (this.character.health > 0) this.playerSprite.play(`${playerClass}-idle`);
      });
    } else {
      this.shakeSprite(this.playerSprite);
    }

    this.screenEffects.damageEffect();
    this.particles.hitSparks({ x: 200, y: 300 });
    this.flashRed();

    this.showDamageNumber(200, 280, result.damage, false, false, () => {
      const enemyType = this.getEnemyType();
      if (this.enemyHasAnimations && this.anims.exists(`${enemyType}-idle`)) {
        this.enemySprite.play(`${enemyType}-idle`);
      }
      this.updateHealthBars();
      if (this.character.health <= this.character.maxHealth * 0.3) {
        this.screenEffects.lowHealthVignette();
      }
      this.character.health <= 0 ? this.playerDefeated() : this.switchTurn();
    });
  }

  // ==================== FLEE ====================

  private playerFlee(): void {
    if (this.isAnimating || this.isWaitingForTx || this.currentTurn !== 'player') return;

    this.isWaitingForTx = true;
    this.setButtonsEnabled(false);
    this.showTxStatus('Attempting to flee...');

    gameEvents.emit(GAME_EVENTS.PLAYER_FLEE_REQUEST);
  }

  private onFleeConfirmed(): void {
    this.isWaitingForTx = false;
    // For now, use local flee logic - on-chain would emit success/fail event
    const fleeChance = 0.5 + this.character.stats.agility * 0.01;
    if (Math.random() < fleeChance) {
      soundManager.play('flee');
      this.addLogMessage('You fled successfully!');
      gameEvents.emit(GAME_EVENTS.PLAYER_FLEE, { success: true });
      this.scene.start('DungeonScene', {
        character: this.character,
        dungeonLayout: this.returnData.dungeonLayout,
        floor: this.returnData.floor,
        roomId: this.returnData.roomId,
      });
    } else {
      soundManager.play('error');
      this.addLogMessage('Failed to flee!');
      gameEvents.emit(GAME_EVENTS.PLAYER_FLEE, { success: false });
      this.switchTurn();
    }
  }

  // ==================== ITEM USE ====================

  private playerUseItem(): void {
    if (this.isAnimating || this.isWaitingForTx || this.currentTurn !== 'player') return;
    this.addLogMessage('No consumables available.');
    gameEvents.emit(GAME_EVENTS.PLAYER_USE_ITEM);
  }

  // ==================== COMBAT END ====================

  private enemyDefeated(): void {
    const xp = this.enemy.experienceReward;
    soundManager.play('enemyDeath');
    this.particles.deathSmoke({ x: 600, y: 300 });
    this.addLogMessage(`${this.enemy.name} defeated! +${xp} XP`);
    gameEvents.emit(GAME_EVENTS.ENEMY_KILLED, this.enemy);
    gameEvents.emit(GAME_EVENTS.COMBAT_END, { winner: 'player', enemy: this.enemy, xpGained: xp });

    const isBoss = this.enemy.name.toLowerCase().includes('boss') ||
                   this.enemy.name.toLowerCase().includes('demon lord');
    const loot: Item[] = isBoss
      ? generateBossLoot(this.returnData.floor)
      : generateLoot(this.returnData.floor, this.enemy);

    const enemyType = this.getEnemyType();
    const deathAnim = `${enemyType}-death`;

    const onDeathComplete = () => {
      this.tweens.add({
        targets: this.enemySprite, alpha: 0, duration: 300,
        onComplete: () => {
          if (loot.length > 0) {
            gameEvents.emit(GAME_EVENTS.LOOT_DROPPED, { items: loot, enemy: this.enemy });
            gameEvents.emit(GAME_EVENTS.UI_SHOW_LOOT, { items: loot });
            const onResume = () => {
              gameEvents.off(GAME_EVENTS.UI_RESUME_GAME, onResume);
              this.returnToDungeon();
            };
            gameEvents.on(GAME_EVENTS.UI_RESUME_GAME, onResume);
          } else {
            this.time.delayedCall(500, () => this.returnToDungeon());
          }
        }
      });
    };

    if (this.enemyHasAnimations && this.anims.exists(deathAnim)) {
      this.enemySprite.play(deathAnim);
      this.enemySprite.once('animationcomplete', onDeathComplete);
    } else {
      this.tweens.add({
        targets: this.enemySprite, alpha: 0, y: this.enemySprite.y + 50, duration: 500,
        onComplete: onDeathComplete
      });
    }
  }

  private returnToDungeon(): void {
    soundManager.playMusic('mainMenu');
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

    const playerClass = this.character.class.toLowerCase();
    const deathAnim = `${playerClass}-death`;

    const onDeathComplete = () => {
      this.tweens.add({
        targets: this.playerSprite, alpha: 0, duration: 500,
        onComplete: () => {
          const itemsLost = [];
          if (this.character.equipment.weapon) itemsLost.push(this.character.equipment.weapon);
          if (this.character.equipment.armor) itemsLost.push(this.character.equipment.armor);
          if (this.character.equipment.accessory) itemsLost.push(this.character.equipment.accessory);

          this.scene.start('DeathScene', {
            character: this.character,
            floor: this.returnData.floor,
            itemsLost,
          });
        }
      });
    };

    if (this.anims.exists(deathAnim)) {
      this.playerSprite.play(deathAnim);
      this.playerSprite.once('animationcomplete', onDeathComplete);
    } else {
      this.tweens.add({
        targets: this.playerSprite, alpha: 0, angle: 90, duration: 800,
        onComplete: onDeathComplete
      });
    }
  }

  // ==================== HELPERS ====================

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

  private playAttackAnimation(sprite: Phaser.GameObjects.Sprite, targetX: number, onComplete: () => void): void {
    const startX = sprite.x;
    const direction = targetX > startX ? 1 : -1;
    this.tweens.add({
      targets: sprite, x: startX + direction * 50, duration: 150, ease: 'Power2', yoyo: true, onComplete
    });
  }

  private shakeSprite(sprite: Phaser.GameObjects.Sprite): void {
    const startX = sprite.x;
    this.tweens.add({
      targets: sprite, x: startX + 10, duration: 50, yoyo: true, repeat: 3, ease: 'Linear',
      onComplete: () => sprite.setX(startX)
    });
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
}
