import * as Phaser from 'phaser';
import { gameEvents, GAME_EVENTS } from '../events/GameEvents';
import { GAME_WIDTH, GAME_HEIGHT, GAME_CONSTANTS } from '../config';
import { generateLoot, generateBossLoot } from '../systems/LootGenerator';
import { ParticleEffects, ScreenEffects, soundManager } from '../effects';
import type { Character, Enemy, DungeonLayout, Item } from '@/types';

type CombatTurn = 'player' | 'enemy';

// Enemy intent types matching contract
const ENEMY_INTENT = {
  ATTACK: 0,
  HEAVY_ATTACK: 1,
  DEFEND: 2,
} as const;

// Mana costs matching contract
const MANA_COSTS = {
  HEAVY_ATTACK: 20,
  HEAL: 30,
} as const;

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

  // Enemy intent display
  private enemyIntent: number = ENEMY_INTENT.ATTACK;
  private enemyIntentText!: Phaser.GameObjects.Text;
  private isPlayerDefending = false;

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
    this.createEnemyIntentDisplay();
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
        case 'player_heavy_attack':
          this.onPlayerHeavyAttackConfirmed();
          break;
        case 'player_defend':
          this.onPlayerDefendConfirmed();
          break;
        case 'player_heal':
          this.onPlayerHealConfirmed();
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

  // Combat positions based on canvas size
  private get PLAYER_X() { return GAME_WIDTH * 0.25; }
  private get ENEMY_X() { return GAME_WIDTH * 0.75; }
  private get COMBATANT_Y() { return GAME_HEIGHT * 0.5; }
  private get LABEL_Y() { return GAME_HEIGHT * 0.28; }

  private createCombatants(): void {
    const playerClass = this.character.class.toLowerCase();
    const STATIC_SCALE = 0.22;
    const BOSS_STATIC_SCALE = 0.32;

    // Always use static sprite for idle state
    const playerTexture = `player-${playerClass}`;
    this.playerSprite = this.add.sprite(this.PLAYER_X, this.COMBATANT_Y, playerTexture).setScale(STATIC_SCALE).setDepth(10);

    const enemyType = this.getEnemyType();
    // Check if enemy has combat animations (attack, hit, death) - not idle
    this.enemyHasAnimations = this.textures.exists(`${enemyType}-attack`);

    // Always use static sprite for idle state
    const enemyTexture = this.getEnemyTexture();
    const scale = this.enemy.isBoss ? BOSS_STATIC_SCALE : STATIC_SCALE;
    this.enemySprite = this.add.sprite(this.ENEMY_X, this.COMBATANT_Y, enemyTexture).setScale(scale).setDepth(10);

    this.add.text(this.PLAYER_X, this.LABEL_Y, this.character.class, {
      fontFamily: 'monospace', fontSize: '18px', color: '#4488ff'
    }).setOrigin(0.5);

    this.add.text(this.ENEMY_X, this.LABEL_Y, this.enemy.name, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ff4444'
    }).setOrigin(0.5);
  }

  private getEnemyType(): string {
    const name = this.enemy.name.toLowerCase();
    if (name.includes('boss') || name.includes('demon') || name.includes('lord')) return 'boss';
    if (name.includes('ghoul')) return 'ghoul';
    if (name.includes('goblin')) return 'goblin';
    if (name.includes('lich')) return 'lich';
    if (name.includes('skeleton')) return 'skeleton';
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
    const barWidth = 120;
    const barHeight = 16;
    const barY = GAME_HEIGHT * 0.32;
    const manaY = barY + 20;
    const playerBarX = this.PLAYER_X - barWidth / 2;
    const enemyBarX = this.ENEMY_X - barWidth / 2;

    this.playerHealthBar.clear();
    this.playerHealthBar.fillStyle(0x222222, 1);
    this.playerHealthBar.fillRect(playerBarX, barY, barWidth, barHeight);
    const hpPercent = Math.max(0, this.character.health / this.character.maxHealth);
    this.playerHealthBar.fillStyle(hpPercent > 0.3 ? 0x44aa44 : 0xaa4444, 1);
    this.playerHealthBar.fillRect(playerBarX, barY, barWidth * hpPercent, barHeight);
    this.playerHealthBar.lineStyle(2, 0x666666, 1);
    this.playerHealthBar.strokeRect(playerBarX, barY, barWidth, barHeight);

    this.playerManaBar.clear();
    this.playerManaBar.fillStyle(0x222222, 1);
    this.playerManaBar.fillRect(playerBarX, manaY, barWidth, barHeight - 4);
    const mpPercent = Math.max(0, this.character.mana / this.character.maxMana);
    this.playerManaBar.fillStyle(0x4444aa, 1);
    this.playerManaBar.fillRect(playerBarX, manaY, barWidth * mpPercent, barHeight - 4);
    this.playerManaBar.lineStyle(1, 0x555555, 1);
    this.playerManaBar.strokeRect(playerBarX, manaY, barWidth, barHeight - 4);

    this.enemyHealthBar.clear();
    this.enemyHealthBar.fillStyle(0x222222, 1);
    this.enemyHealthBar.fillRect(enemyBarX, barY, barWidth, barHeight);
    const enemyPercent = Math.max(0, this.enemy.health / this.enemy.maxHealth);
    this.enemyHealthBar.fillStyle(0xaa4444, 1);
    this.enemyHealthBar.fillRect(enemyBarX, barY, barWidth * enemyPercent, barHeight);
    this.enemyHealthBar.lineStyle(2, 0x666666, 1);
    this.enemyHealthBar.strokeRect(enemyBarX, barY, barWidth, barHeight);
  }

  private createEnemyIntentDisplay(): void {
    // Show what enemy will do next turn
    const intentY = GAME_HEIGHT * 0.38;
    this.add.text(this.ENEMY_X, intentY, 'Next Action:', {
      fontFamily: 'monospace', fontSize: '12px', color: '#888888'
    }).setOrigin(0.5);

    this.enemyIntentText = this.add.text(this.ENEMY_X, intentY + 18, this.getIntentLabel(this.enemyIntent), {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffaa00', fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  private getIntentLabel(intent: number): string {
    switch (intent) {
      case ENEMY_INTENT.ATTACK:
        return 'Attack';
      case ENEMY_INTENT.HEAVY_ATTACK:
        return 'HEAVY ATTACK!';
      case ENEMY_INTENT.DEFEND:
        return 'Defend';
      default:
        return '???';
    }
  }

  private updateEnemyIntent(newIntent: number): void {
    this.enemyIntent = newIntent;
    this.enemyIntentText.setText(this.getIntentLabel(newIntent));

    // Color based on threat level
    if (newIntent === ENEMY_INTENT.HEAVY_ATTACK) {
      this.enemyIntentText.setColor('#ff4444'); // Red for heavy attack
    } else if (newIntent === ENEMY_INTENT.DEFEND) {
      this.enemyIntentText.setColor('#4488ff'); // Blue for defend
    } else {
      this.enemyIntentText.setColor('#ffaa00'); // Orange for normal attack
    }
  }

  private createActionButtons(): void {
    // Buttons aligned to the left in a 2x3 grid
    const startX = 55;
    const startY = GAME_HEIGHT * 0.72;
    const buttonSize = 50;
    const gap = 8;

    // Action definitions with icons
    const actions = [
      { label: 'Attack', icon: 'item-sword', action: () => this.playerAttack(), mana: 0, color: 0xff6644 },
      { label: 'Heavy', icon: 'item-sword', action: () => this.playerHeavyAttack(), mana: MANA_COSTS.HEAVY_ATTACK, color: 0xff4444 },
      { label: 'Defend', icon: 'item-shield', action: () => this.playerDefend(), mana: 0, color: 0x4488ff },
      { label: 'Heal', icon: 'item-potion', action: () => this.playerHeal(), mana: MANA_COSTS.HEAL, color: 0x44ff44 },
      { label: 'Flee', icon: 'item-ring', action: () => this.playerFlee(), mana: 0, color: 0xaaaaaa },
    ];

    actions.forEach((btn, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = startX + col * (buttonSize + gap);
      const y = startY + row * (buttonSize + gap + 16);
      const container = this.createIconButton(x, y, btn.label, btn.icon, btn.action, btn.mana, btn.color, buttonSize);
      this.actionButtons.push(container);
    });
  }

  private createIconButton(
    x: number, y: number, label: string, iconKey: string,
    onClick: () => void, mana: number, color: number, size: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Button background
    const bg = this.add.graphics();
    this.drawIconButton(bg, size, color, false);

    // Icon image
    const icon = this.add.image(0, -4, iconKey).setDisplaySize(size - 16, size - 16);

    // Label below button
    const labelText = mana > 0 ? `${label} (${mana})` : label;
    const text = this.add.text(0, size / 2 + 6, labelText, {
      fontFamily: 'monospace', fontSize: '9px', color: '#cccccc'
    }).setOrigin(0.5);

    container.add([bg, icon, text]);
    container.setData('bg', bg);
    container.setData('color', color);

    container.setInteractive(new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size), Phaser.Geom.Rectangle.Contains);
    container.on('pointerover', () => this.drawIconButton(bg, size, color, true));
    container.on('pointerout', () => this.drawIconButton(bg, size, color, false));
    container.on('pointerdown', () => {
      soundManager.play('buttonClick');
      onClick();
    });

    return container;
  }

  private drawIconButton(bg: Phaser.GameObjects.Graphics, size: number, color: number, hover: boolean): void {
    bg.clear();
    bg.fillStyle(hover ? 0x3a3a3a : 0x2a2a2a, 1);
    bg.fillRoundedRect(-size / 2, -size / 2, size, size, 8);
    bg.lineStyle(2, hover ? 0xffffff : color, 1);
    bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 8);
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
    // Combat log aligned to the right
    const logX = GAME_WIDTH - 15;
    const logY = GAME_HEIGHT * 0.72;

    // Log header with background
    const logBg = this.add.graphics();
    logBg.fillStyle(0x1a1a1a, 0.8);
    logBg.fillRoundedRect(logX - 180, logY - 20, 190, 120, 6);
    logBg.lineStyle(1, 0x444444, 1);
    logBg.strokeRoundedRect(logX - 180, logY - 20, 190, 120, 6);

    this.add.text(logX, logY - 8, 'Combat Log', {
      fontFamily: 'monospace', fontSize: '12px', color: '#888888'
    }).setOrigin(1, 0);
  }

  private addLogMessage(msg: string): void {
    const logX = GAME_WIDTH - 20;
    const baseY = GAME_HEIGHT * 0.72 + 12;
    const y = baseY + this.combatLog.length * 18;

    if (this.combatLog.length >= 5) {
      const oldest = this.combatLog.shift();
      oldest?.destroy();
      this.combatLog.forEach((t, i) => t.setY(baseY + i * 18));
    }

    const text = this.add.text(logX, y, msg, {
      fontFamily: 'monospace', fontSize: '10px', color: '#cccccc'
    }).setOrigin(1, 0);
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
      this.enemySprite.once('animationcomplete', () => this.enemySprite.setTexture(this.getEnemyTexture()));
    } else {
      this.shakeSprite(this.enemySprite);
    }

    if (result.isCrit) {
      this.particles.criticalHit({ x: this.ENEMY_X, y: this.COMBATANT_Y });
      this.screenEffects.zoomPulse(1.03);
    } else {
      this.particles.hitSparks({ x: this.ENEMY_X, y: this.COMBATANT_Y });
    }

    this.showDamageNumber(600, 280, result.damage, result.isCrit, false, () => {
      const playerClass = this.character.class.toLowerCase();
      // Reset to static texture after attack animation
      this.playerSprite.setTexture(`player-${playerClass}`);
      this.updateHealthBars();
      this.enemy.health <= 0 ? this.enemyDefeated() : this.switchTurn();
    });
  }

  // ==================== PLAYER HEAVY ATTACK ====================

  private playerHeavyAttack(): void {
    if (this.isAnimating || this.isWaitingForTx || this.currentTurn !== 'player') return;

    // Check mana
    if (this.character.mana < MANA_COSTS.HEAVY_ATTACK) {
      this.addLogMessage('Not enough mana for Heavy Attack!');
      soundManager.play('error');
      return;
    }

    this.isWaitingForTx = true;
    this.isAnimating = true;
    this.setButtonsEnabled(false);
    this.showTxStatus('Signing heavy attack...');

    gameEvents.emit(GAME_EVENTS.PLAYER_HEAVY_ATTACK_REQUEST);
  }

  private onPlayerHeavyAttackConfirmed(): void {
    this.isWaitingForTx = false;
    soundManager.play('attack');

    // Deduct mana locally
    this.character.mana -= MANA_COSTS.HEAVY_ATTACK;

    // Calculate heavy damage (1.5x)
    const result = this.calculateDamage(this.character, this.enemy);
    const heavyDamage = Math.floor(result.damage * 1.5);
    this.enemy.health -= heavyDamage;

    this.addLogMessage(`HEAVY ATTACK! Dealt ${heavyDamage} damage! (-${MANA_COSTS.HEAVY_ATTACK} mana)`);

    const playerClass = this.character.class.toLowerCase();
    const attackAnim = `${playerClass}-attack`;

    if (this.anims.exists(attackAnim)) {
      this.playerSprite.play(attackAnim);
      this.playerSprite.once('animationcomplete', () => this.onHeavyAttackHit(heavyDamage, result.isCrit));
    } else {
      this.playAttackAnimation(this.playerSprite, 600, () => this.onHeavyAttackHit(heavyDamage, result.isCrit));
    }
  }

  private onHeavyAttackHit(damage: number, isCrit: boolean): void {
    soundManager.play('critical'); // Always use critical sound for heavy attack
    this.particles.criticalHit({ x: this.ENEMY_X, y: this.COMBATANT_Y });
    this.screenEffects.zoomPulse(1.05);

    this.showDamageNumber(600, 280, damage, true, false, () => {
      const playerClass = this.character.class.toLowerCase();
      // Reset to static texture after attack animation
      this.playerSprite.setTexture(`player-${playerClass}`);
      this.updateHealthBars();
      this.enemy.health <= 0 ? this.enemyDefeated() : this.switchTurn();
    });
  }

  // ==================== PLAYER DEFEND ====================

  private playerDefend(): void {
    if (this.isAnimating || this.isWaitingForTx || this.currentTurn !== 'player') return;

    this.isWaitingForTx = true;
    this.isAnimating = true;
    this.setButtonsEnabled(false);
    this.showTxStatus('Signing defend...');

    gameEvents.emit(GAME_EVENTS.PLAYER_DEFEND_REQUEST);
  }

  private onPlayerDefendConfirmed(): void {
    this.isWaitingForTx = false;
    this.isPlayerDefending = true;
    soundManager.play('buttonClick');

    this.addLogMessage('You brace for impact! (50% damage reduction)');

    // Visual feedback - VFX magic effect
    this.playVFXMagic(this.PLAYER_X, this.COMBATANT_Y, 0x4488ff);

    this.isAnimating = false;
    this.switchTurn();
  }

  // ==================== PLAYER HEAL ====================

  private playerHeal(): void {
    if (this.isAnimating || this.isWaitingForTx || this.currentTurn !== 'player') return;

    // Check mana
    if (this.character.mana < MANA_COSTS.HEAL) {
      this.addLogMessage('Not enough mana to Heal!');
      soundManager.play('error');
      return;
    }

    // Check if already at full health
    if (this.character.health >= this.character.maxHealth) {
      this.addLogMessage('Already at full health!');
      soundManager.play('error');
      return;
    }

    this.isWaitingForTx = true;
    this.isAnimating = true;
    this.setButtonsEnabled(false);
    this.showTxStatus('Signing heal...');

    gameEvents.emit(GAME_EVENTS.PLAYER_HEAL_REQUEST);
  }

  private onPlayerHealConfirmed(): void {
    this.isWaitingForTx = false;
    soundManager.play('levelUp'); // Use level up sound for heal

    // Deduct mana and heal locally
    this.character.mana -= MANA_COSTS.HEAL;
    const healAmount = Math.floor(this.character.maxHealth * 0.3);
    const oldHealth = this.character.health;
    this.character.health = Math.min(this.character.health + healAmount, this.character.maxHealth);
    const actualHeal = this.character.health - oldHealth;

    this.addLogMessage(`Healed for ${actualHeal} HP! (-${MANA_COSTS.HEAL} mana)`);

    // Visual feedback - VFX magic effect with green tint
    this.playVFXMagic(this.PLAYER_X, this.COMBATANT_Y, 0x44ff44);

    // Show heal number
    this.showDamageNumber(200, 280, actualHeal, false, true, () => {
      this.updateHealthBars();
      this.isAnimating = false;
      this.switchTurn();
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
    const intent = this.enemyIntent;

    // Handle enemy defend - no attack
    if (intent === ENEMY_INTENT.DEFEND) {
      this.addLogMessage(`${this.enemy.name} braces for your next attack!`);
      // Generate new intent for next turn
      this.updateEnemyIntent(Math.floor(Math.random() * 3));
      this.isAnimating = false;
      this.switchTurn();
      return;
    }

    // Calculate base damage
    const result = this.calculateDamage(this.enemy, this.character);
    let finalDamage = result.damage;

    // Heavy attack: 1.5x damage
    if (intent === ENEMY_INTENT.HEAVY_ATTACK) {
      finalDamage = Math.floor(result.damage * 1.5);
    }

    // Apply player defend reduction (50%)
    if (this.isPlayerDefending) {
      finalDamage = Math.floor(finalDamage / 2);
      this.isPlayerDefending = false;
      this.addLogMessage(`Your defense reduced the damage!`);
    }

    this.character.health -= finalDamage;

    const attackType = intent === ENEMY_INTENT.HEAVY_ATTACK ? 'HEAVY ATTACKS' : 'attacks';
    this.addLogMessage(`${this.enemy.name} ${attackType} for ${finalDamage} damage!`);
    gameEvents.emit(GAME_EVENTS.COMBAT_DAMAGE, { target: 'player', damage: finalDamage });

    // Generate new intent for next turn
    this.updateEnemyIntent(Math.floor(Math.random() * 3));

    const enemyType = this.getEnemyType();
    const enemyAttackAnim = `${enemyType}-attack`;

    if (this.enemyHasAnimations && this.anims.exists(enemyAttackAnim)) {
      this.enemySprite.play(enemyAttackAnim);
      this.enemySprite.once('animationcomplete', () => this.onEnemyAttackHit({ ...result, damage: finalDamage }));
    } else {
      this.playAttackAnimation(this.enemySprite, 200, () => this.onEnemyAttackHit({ ...result, damage: finalDamage }));
    }
  }

  private onEnemyAttackHit(result: CombatResult): void {
    soundManager.play('hit');

    const playerClass = this.character.class.toLowerCase();
    const playerHitAnim = `${playerClass}-hit`;
    if (this.anims.exists(playerHitAnim)) {
      this.playerSprite.play(playerHitAnim);
      this.playerSprite.once('animationcomplete', () => {
        if (this.character.health > 0) this.playerSprite.setTexture(`player-${playerClass}`);
      });
    } else {
      this.shakeSprite(this.playerSprite);
    }

    this.screenEffects.damageEffect();
    this.particles.hitSparks({ x: this.PLAYER_X, y: this.COMBATANT_Y });
    this.flashRed();

    this.showDamageNumber(200, 280, result.damage, false, false, () => {
      // Reset enemy to static texture after attack animation
      this.enemySprite.setTexture(this.getEnemyTexture());
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
    this.particles.deathSmoke({ x: this.ENEMY_X, y: this.COMBATANT_Y });
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
    this.particles.bloodSplatter({ x: this.PLAYER_X, y: this.COMBATANT_Y });
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

  private playVFXMagic(x: number, y: number, tint: number = 0xffffff): void {
    if (!this.textures.exists('vfx-magic')) return;

    const vfx = this.add.image(x, y, 'vfx-magic')
      .setDisplaySize(120, 120)
      .setTint(tint)
      .setAlpha(0.8)
      .setDepth(50);

    // Animate: scale up and fade out with rotation
    this.tweens.add({
      targets: vfx,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      angle: 180,
      duration: 600,
      ease: 'Power2',
      onComplete: () => vfx.destroy()
    });
  }
}
