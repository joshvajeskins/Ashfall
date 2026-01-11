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

// Mana restore on defend (matching contract)
const DEFEND_MANA_RESTORE = 10;

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

  // Sprite size constants
  private readonly STATIC_SIZE = 140;
  private readonly BOSS_STATIC_SIZE = 180;

  // Transaction event handlers
  private txSuccessHandler!: (...args: unknown[]) => void;
  private txFailedHandler!: (...args: unknown[]) => void;

  // On-chain combat state (updated after each attack)
  private onChainCombatState?: { enemyHealth: number; enemyMaxHealth: number; isActive: boolean; enemyKilled: boolean };

  // Flag to prevent any actions after combat ends
  private combatEnded = false;

  // Counter to track processed enemy attacks (prevents duplicate processing)
  private lastProcessedEnemyAttackTx: string | null = null;

  constructor() {
    super({ key: 'CombatScene' });
  }

  init(data: CombatInitData): void {
    // CRITICAL: Clean up event listeners from previous combat FIRST
    // This prevents duplicate handlers when scene is restarted
    if (this.txSuccessHandler) {
      gameEvents.off(GAME_EVENTS.COMBAT_TX_SUCCESS, this.txSuccessHandler);
    }
    if (this.txFailedHandler) {
      gameEvents.off(GAME_EVENTS.COMBAT_TX_FAILED, this.txFailedHandler);
    }

    // Cancel any pending timers from previous combat
    if (this.time) {
      this.time.removeAllEvents();
    }

    this.character = { ...data.character };
    this.enemy = { ...data.enemy };
    this.returnData = data.returnData;
    this.currentTurn = 'player';
    this.isAnimating = false;
    this.isWaitingForTx = false;
    this.combatEnded = false;
    this.isPlayerDefending = false;
    this.pendingNextIntent = undefined;
    this.onChainCombatState = undefined;
    this.enemyIntent = ENEMY_INTENT.ATTACK;
    this.lastProcessedEnemyAttackTx = null;
    // Reset arrays to clear references from previous combat
    this.actionButtons = [];
    this.combatLog = [];
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
      const { action, combatState, enemyIntent, txHash, resumed, playerStats } = data as {
        action: string;
        txHash?: string;
        combatState?: { enemyHealth: number; enemyMaxHealth: number; isActive: boolean; enemyKilled: boolean };
        enemyIntent?: number;
        resumed?: boolean;
        playerStats?: { health?: number; maxHealth?: number; mana?: number; maxMana?: number };
      };
      console.log(`[CombatScene] TX Success: ${action}`, txHash ? `tx: ${txHash.slice(0, 10)}...` : '', combatState ? `enemyKilled: ${combatState.enemyKilled}` : '', enemyIntent !== undefined ? `intent: ${enemyIntent}` : '', resumed ? '(resumed)' : '');

      // Ignore events if combat already ended (except start_combat)
      if (this.combatEnded && action !== 'start_combat') {
        console.log(`[CombatScene] Combat ended, ignoring ${action} success`);
        return;
      }

      // For enemy_attack, prevent processing the same TX twice (duplicate event handler issue)
      if (action === 'enemy_attack' && txHash) {
        if (this.lastProcessedEnemyAttackTx === txHash) {
          console.log(`[CombatScene] Already processed enemy attack TX ${txHash.slice(0, 10)}..., ignoring duplicate`);
          return;
        }
        this.lastProcessedEnemyAttackTx = txHash;
      }

      this.hideTxStatus();

      switch (action) {
        case 'start_combat':
          this.onCombatStarted(enemyIntent, combatState, resumed, playerStats);
          break;
        case 'player_attack':
          this.onPlayerAttackConfirmed(combatState);
          break;
        case 'player_heavy_attack':
          this.onPlayerHeavyAttackConfirmed(combatState);
          break;
        case 'player_defend':
          this.onPlayerDefendConfirmed();
          break;
        case 'player_heal':
          this.onPlayerHealConfirmed();
          break;
        case 'enemy_attack':
          this.onEnemyAttackConfirmed(enemyIntent);
          break;
        case 'flee':
          this.onFleeConfirmed();
          break;
      }
    };

    this.txFailedHandler = (data: unknown) => {
      const { action, error } = data as { action: string; error: string };
      console.warn(`[CombatScene] TX Failed: ${action}`, error);

      // Ignore events if combat already ended
      if (this.combatEnded) {
        console.log(`[CombatScene] Combat ended, ignoring ${action} failure`);
        return;
      }

      // Handle enemy_attack failures specially
      if (action === 'enemy_attack') {
        this.isWaitingForTx = false;
        this.hideTxStatus();

        // E_COMBAT_ENDED means enemy was already killed
        if (error.includes('COMBAT_ENDED')) {
          console.log('[CombatScene] Combat already ended on-chain - enemy was killed');
          this.enemyDefeated();
          return;
        }

        // E_NOT_ENEMY_TURN means on-chain it's player's turn - sync state
        if (error.includes('NOT_ENEMY_TURN') || error.includes('NOT_PLAYER_TURN')) {
          console.log('[CombatScene] Turn mismatch - syncing to player turn');
          this.currentTurn = 'player';
          this.turnText.setText('YOUR TURN');
          this.isAnimating = false;
          this.setButtonsEnabled(true);
          return;
        }

        // Other enemy attack errors - switch to player turn to allow retry
        console.log('[CombatScene] Enemy attack failed, switching to player turn');
        this.currentTurn = 'player';
        this.turnText.setText('YOUR TURN');
        this.isAnimating = false;
        this.setButtonsEnabled(true);
        this.showTxError(error);
        return;
      }

      // Handle mana-related errors
      if (error.includes('NOT_ENOUGH_MANA')) {
        console.log('[CombatScene] Not enough mana on-chain - syncing local state');
        // Set local mana to 0 to prevent further mana-consuming attempts
        // The actual on-chain mana might be > 0 but < required, but this prevents retries
        this.character.mana = 0;
        this.updateHealthBars();
        this.addLogMessage('Not enough mana! (On-chain state synced)');
        soundManager.play('error');
        this.isWaitingForTx = false;
        this.isAnimating = false;
        this.setButtonsEnabled(true);
        return;
      }

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
      roomId: this.returnData.roomId,
    });
  }

  private onCombatStarted(
    enemyIntent?: number,
    combatState?: { enemyHealth: number; enemyMaxHealth: number; isActive: boolean; enemyKilled: boolean },
    resumed?: boolean,
    playerStats?: { health?: number; maxHealth?: number; mana?: number; maxMana?: number }
  ): void {
    this.isWaitingForTx = false;
    this.turnText.setText('YOUR TURN');

    // Sync enemy health from on-chain state (for fled enemy persistence or resumed combat)
    if (combatState && combatState.enemyHealth !== undefined) {
      this.enemy.health = combatState.enemyHealth;
      if (combatState.enemyMaxHealth) {
        this.enemy.maxHealth = combatState.enemyMaxHealth;
      }
      this.updateHealthBars();
    }

    // Sync player stats from on-chain state (especially mana for heavy attack/heal)
    if (playerStats) {
      if (playerStats.health !== undefined && playerStats.health > 0) {
        this.character.health = playerStats.health;
      }
      if (playerStats.maxHealth !== undefined && playerStats.maxHealth > 0) {
        this.character.maxHealth = playerStats.maxHealth;
      }
      if (playerStats.mana !== undefined) {
        this.character.mana = playerStats.mana;
      }
      if (playerStats.maxMana !== undefined && playerStats.maxMana > 0) {
        this.character.maxMana = playerStats.maxMana;
      }
      this.updateHealthBars();
      console.log(`[CombatScene] Synced player stats from chain - HP: ${this.character.health}/${this.character.maxHealth}, Mana: ${this.character.mana}/${this.character.maxMana}`);
    }

    // Set initial enemy intent from on-chain state
    if (enemyIntent !== undefined) {
      this.updateEnemyIntent(enemyIntent);
    }

    // Show appropriate message
    if (resumed) {
      this.addLogMessage(`Resumed combat with ${this.enemy.name}!`);
    } else {
      this.addLogMessage(`Combat with ${this.enemy.name} begins!`);
    }

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
  private get PLAYER_X() { return GAME_WIDTH * 0.35; }
  private get ENEMY_X() { return GAME_WIDTH * 0.65; }
  private get COMBATANT_Y() { return GAME_HEIGHT * 0.5; }
  private get LABEL_Y() { return GAME_HEIGHT * 0.28; }

  private createCombatants(): void {
    const playerClass = this.character.class.toLowerCase();

    // Always use static sprite for idle state
    const playerTexture = `player-${playerClass}`;
    this.playerSprite = this.add.sprite(this.PLAYER_X, this.COMBATANT_Y, playerTexture)
      .setDisplaySize(this.STATIC_SIZE, this.STATIC_SIZE)
      .setDepth(10);

    const enemyType = this.getEnemyType();
    // Check if enemy has combat animations (attack, hit, death) - not idle
    this.enemyHasAnimations = this.textures.exists(`${enemyType}-attack`);

    // Always use static sprite for idle state
    const enemyTexture = this.getEnemyTexture();
    const size = this.enemy.isBoss ? this.BOSS_STATIC_SIZE : this.STATIC_SIZE;
    this.enemySprite = this.add.sprite(this.ENEMY_X, this.COMBATANT_Y, enemyTexture)
      .setDisplaySize(size, size)
      .setDepth(10);

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

  // Animation scale adjustments (animation spritesheets have different frame sizes)
  private scalePlayerForAnimation(): void {
    const playerClass = this.character.class.toLowerCase();
    const classConfig: Record<string, { scale: number; originY: number }> = {
      warrior: { scale: 6.0, originY: 0.6 },
      mage: { scale: 6.0, originY: 0.5 },
      rogue: { scale: 6.0, originY: 0.5 },
    };
    const config = classConfig[playerClass] ?? { scale: 6.0, originY: 0.5 };
    const animSize = this.STATIC_SIZE * config.scale;
    this.playerSprite.setDisplaySize(animSize, animSize);
    this.playerSprite.setOrigin(0.5, config.originY);
  }

  private resetPlayerToStatic(): void {
    this.playerSprite.setOrigin(0.5, 0.5);
    this.playerSprite.setDisplaySize(this.STATIC_SIZE, this.STATIC_SIZE);
  }

  private scaleEnemyForAnimation(): void {
    const enemyType = this.getEnemyType();
    const enemyConfig: Record<string, { scale: number; originY: number }> = {
      skeleton: { scale: 6.0, originY: 0.5 },
      zombie: { scale: 6.0, originY: 0.5 },
      ghoul: { scale: 6.0, originY: 0.5 },
      vampire: { scale: 6.0, originY: 0.5 },
      lich: { scale: 6.0, originY: 0.5 },
      goblin: { scale: 6.0, originY: 0.5 },
      boss: { scale: 6.0, originY: 0.55 },
    };
    const config = enemyConfig[enemyType] ?? { scale: 6.0, originY: 0.5 };
    const baseSize = this.enemy.isBoss ? this.BOSS_STATIC_SIZE : this.STATIC_SIZE;
    const animSize = baseSize * config.scale;
    this.enemySprite.setDisplaySize(animSize, animSize);
    this.enemySprite.setOrigin(0.5, config.originY);
  }

  private resetEnemyToStatic(): void {
    const size = this.enemy.isBoss ? this.BOSS_STATIC_SIZE : this.STATIC_SIZE;
    this.enemySprite.setOrigin(0.5, 0.5);
    this.enemySprite.setDisplaySize(size, size);
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

  // Store the seed used for current attack (for synced calculations)
  private currentAttackSeed: number = 0;

  private playerAttack(): void {
    if (this.isAnimating || this.isWaitingForTx || this.currentTurn !== 'player') return;

    this.isWaitingForTx = true;
    this.isAnimating = true;
    this.setButtonsEnabled(false);
    this.showTxStatus('Signing attack transaction...');

    // Generate seed ONCE and use for both local calculation and contract
    this.currentAttackSeed = this.generateSeed();

    // Emit request to CombatBridge (React) with the seed
    gameEvents.emit(GAME_EVENTS.PLAYER_ATTACK_REQUEST, { seed: this.currentAttackSeed });
  }

  private onPlayerAttackConfirmed(combatState?: { enemyHealth: number; enemyMaxHealth: number; isActive: boolean; enemyKilled: boolean }): void {
    this.isWaitingForTx = false;
    this.onChainCombatState = combatState; // Store on-chain state for later use
    soundManager.play('attack');

    // Calculate damage using the SAME seed sent to contract (synced calculation)
    const result = this.calculateDamage(this.character, this.enemy, this.currentAttackSeed);

    // Use on-chain enemy health if available, otherwise use local calculation
    if (combatState) {
      this.enemy.health = combatState.enemyHealth;
    } else {
      this.enemy.health -= result.damage;
    }

    const critText = result.isCrit ? ' CRITICAL!' : '';
    this.addLogMessage(`You dealt ${result.damage} damage!${critText}`);
    gameEvents.emit(GAME_EVENTS.PLAYER_ATTACK, { damage: result.damage, isCrit: result.isCrit });

    const playerClass = this.character.class.toLowerCase();
    const attackAnim = result.isCrit ? `${playerClass}-critical` : `${playerClass}-attack`;

    if (this.anims.exists(attackAnim)) {
      this.scalePlayerForAnimation();
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
      this.scaleEnemyForAnimation();
      this.enemySprite.play(enemyHitAnim);
      this.enemySprite.once('animationcomplete', () => {
        this.enemySprite.setTexture(this.getEnemyTexture());
        this.resetEnemyToStatic();
      });
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
      this.resetPlayerToStatic();
      this.updateHealthBars();
      // Use on-chain state to determine if enemy was killed (authoritative)
      const enemyKilled = this.onChainCombatState?.enemyKilled ?? this.enemy.health <= 0;
      enemyKilled ? this.enemyDefeated() : this.switchTurn();
    });
  }

  // ==================== PLAYER HEAVY ATTACK ====================

  // Store the seed used for current heavy attack
  private currentHeavyAttackSeed: number = 0;

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

    // Generate seed ONCE and use for both local calculation and contract
    this.currentHeavyAttackSeed = this.generateSeed();

    gameEvents.emit(GAME_EVENTS.PLAYER_HEAVY_ATTACK_REQUEST, { seed: this.currentHeavyAttackSeed });
  }

  private onPlayerHeavyAttackConfirmed(combatState?: { enemyHealth: number; enemyMaxHealth: number; isActive: boolean; enemyKilled: boolean }): void {
    this.isWaitingForTx = false;
    this.onChainCombatState = combatState; // Store on-chain state for later use
    soundManager.play('attack');

    // Deduct mana locally
    this.character.mana -= MANA_COSTS.HEAVY_ATTACK;

    // Calculate heavy damage using dedicated function that matches contract EXACTLY
    // Contract: (base + weapon + str/2 + int/2) * 1.5, THEN crit doubles
    const result = this.calculateHeavyAttackDamage(this.currentHeavyAttackSeed);

    // Use on-chain enemy health if available, otherwise use local calculation
    if (combatState) {
      this.enemy.health = combatState.enemyHealth;
    } else {
      this.enemy.health -= result.damage;
    }

    this.addLogMessage(`HEAVY ATTACK! Dealt ${result.damage} damage${result.isCrit ? ' (CRIT!)' : ''} (-${MANA_COSTS.HEAVY_ATTACK} mana)`);

    const playerClass = this.character.class.toLowerCase();
    const attackAnim = `${playerClass}-attack`;

    if (this.anims.exists(attackAnim)) {
      this.scalePlayerForAnimation();
      this.playerSprite.play(attackAnim);
      this.playerSprite.once('animationcomplete', () => this.onHeavyAttackHit(result.damage, result.isCrit));
    } else {
      this.playAttackAnimation(this.playerSprite, 600, () => this.onHeavyAttackHit(result.damage, result.isCrit));
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
      this.resetPlayerToStatic();
      this.updateHealthBars();
      // Use on-chain state to determine if enemy was killed (authoritative)
      const enemyKilled = this.onChainCombatState?.enemyKilled ?? this.enemy.health <= 0;
      enemyKilled ? this.enemyDefeated() : this.switchTurn();
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

    // Restore mana (matching contract: DEFEND_MANA_RESTORE = 10)
    const manaRestored = Math.min(DEFEND_MANA_RESTORE, this.character.maxMana - this.character.mana);
    this.character.mana = Math.min(this.character.mana + DEFEND_MANA_RESTORE, this.character.maxMana);

    this.addLogMessage(`You brace for impact! (50% dmg reduction, +${manaRestored} mana)`);

    // Visual feedback - VFX magic effect
    this.playVFXMagic(this.PLAYER_X, this.COMBATANT_Y, 0x4488ff);

    // Update UI to show mana restoration
    this.updateHealthBars();

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

    // Deduct mana and heal locally - INT contributes to heal amount
    // Heal = 30% + INT% of max HP (Mage: 45%, Warrior: 35%)
    this.character.mana -= MANA_COSTS.HEAL;
    const healPercent = 30 + this.character.stats.intelligence;
    const healAmount = Math.floor(this.character.maxHealth * (healPercent / 100));
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
    // Prevent any actions after combat ends
    if (this.combatEnded) {
      console.log('[CombatScene] Combat ended, skipping enemy attack request');
      return;
    }

    // Prevent duplicate requests
    if (this.isWaitingForTx) {
      console.log('[CombatScene] Already waiting for tx, skipping enemy attack request');
      return;
    }

    this.isWaitingForTx = true;
    this.showTxStatus('Enemy attacking on-chain...');

    // Emit request to CombatBridge (React) - server wallet executes
    gameEvents.emit(GAME_EVENTS.ENEMY_ATTACK_REQUEST);
  }

  private onEnemyAttackConfirmed(nextIntent?: number): void {
    // Prevent processing if combat already ended
    if (this.combatEnded) {
      console.log('[CombatScene] Combat ended, ignoring enemy attack confirmation');
      return;
    }
    this.isWaitingForTx = false;
    // Store next intent from on-chain for use after attack animation
    this.pendingNextIntent = nextIntent;
    this.enemyAttack();
  }

  // Store pending intent from on-chain to apply after attack animation
  private pendingNextIntent?: number;

  private enemyAttack(): void {
    const intent = this.enemyIntent;

    // Handle enemy defend - no attack
    if (intent === ENEMY_INTENT.DEFEND) {
      this.addLogMessage(`${this.enemy.name} braces for your next attack!`);
      // Use on-chain intent for next turn (already fetched)
      if (this.pendingNextIntent !== undefined) {
        this.updateEnemyIntent(this.pendingNextIntent);
        this.pendingNextIntent = undefined;
      }
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

    // Use on-chain intent for next turn (already fetched)
    if (this.pendingNextIntent !== undefined) {
      this.updateEnemyIntent(this.pendingNextIntent);
      this.pendingNextIntent = undefined;
    }

    const enemyType = this.getEnemyType();
    // Use critical animation for heavy attacks, normal attack animation otherwise
    const enemyAttackAnim = intent === ENEMY_INTENT.HEAVY_ATTACK
      ? `${enemyType}-critical`
      : `${enemyType}-attack`;

    if (this.enemyHasAnimations && this.anims.exists(enemyAttackAnim)) {
      this.scaleEnemyForAnimation();
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
      this.scalePlayerForAnimation();
      this.playerSprite.play(playerHitAnim);
      this.playerSprite.once('animationcomplete', () => {
        if (this.character.health > 0) {
          this.playerSprite.setTexture(`player-${playerClass}`);
          this.resetPlayerToStatic();
        }
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
      this.resetEnemyToStatic();
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
    // Mark combat as ended to prevent any further actions
    this.combatEnded = true;
    this.isWaitingForTx = false;
    this.setButtonsEnabled(false);

    // CRITICAL: Remove the killed enemy from the dungeon layout
    // This prevents the enemy from respawning when returning to the dungeon
    this.removeEnemyFromLayout();

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
      this.scaleEnemyForAnimation();
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

  /**
   * Remove the killed enemy from the dungeon layout.
   * This prevents enemies from respawning when returning to the dungeon.
   */
  private removeEnemyFromLayout(): void {
    const { floor, roomId, dungeonLayout } = this.returnData;

    // Find the current floor
    const floorData = dungeonLayout.floors[floor - 1];
    if (!floorData) {
      console.warn('[CombatScene] Could not find floor data:', floor);
      return;
    }

    // Find the current room
    const room = floorData.rooms.find(r => r.id === roomId);
    if (!room) {
      console.warn('[CombatScene] Could not find room:', roomId);
      return;
    }

    // Remove the enemy by id (or by name if id doesn't match)
    const enemyIndex = room.enemies.findIndex(e => e.id === this.enemy.id);
    if (enemyIndex !== -1) {
      room.enemies.splice(enemyIndex, 1);
      console.log(`[CombatScene] Removed enemy ${this.enemy.name} (id: ${this.enemy.id}) from room ${roomId}`);
    } else {
      // Try to find by name if id doesn't match (fallback)
      const byNameIndex = room.enemies.findIndex(e => e.name === this.enemy.name);
      if (byNameIndex !== -1) {
        room.enemies.splice(byNameIndex, 1);
        console.log(`[CombatScene] Removed enemy ${this.enemy.name} by name from room ${roomId}`);
      } else {
        console.warn(`[CombatScene] Could not find enemy to remove:`, this.enemy);
      }
    }

    // Mark room as cleared if no enemies left
    if (room.enemies.length === 0 && room.type !== 'start') {
      room.cleared = true;
      console.log(`[CombatScene] Room ${roomId} marked as cleared`);
    }
  }

  private playerDefeated(): void {
    // Mark combat as ended to prevent any further actions
    this.combatEnded = true;
    this.isWaitingForTx = false;
    this.setButtonsEnabled(false);

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
      this.scalePlayerForAnimation();
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

  // Generate seed for deterministic randomness (synced with contract)
  private generateSeed(): number {
    return Date.now() + Math.floor(Math.random() * 1000000);
  }

  // Calculate crit using same formula as contract: seed % 1000 < (50 + agility * 2)
  private calculateCrit(agility: number, seed: number): boolean {
    const critThreshold = 50 + (agility * 2); // out of 1000
    const critRoll = seed % 1000;
    return critRoll < critThreshold;
  }

  /**
   * Calculate damage - MUST match contract exactly!
   *
   * Contract formula (combat.move:339-351):
   *   weapon_damage = 15 if weapon equipped, 5 if unarmed
   *   base_damage = 5
   *   strength_bonus = strength / 2 (integer division)
   *   total_damage = base_damage + weapon_damage + strength_bonus
   *   crit_threshold = 50 + (agility * 2) out of 1000
   *   final_damage = total_damage * 2 if crit, else total_damage
   *   NO defense subtraction for player attacks!
   */
  private calculateDamage(attacker: Character | Enemy, target: Character | Enemy, seed?: number): CombatResult {
    const isPlayer = 'stats' in attacker;
    const actualSeed = seed ?? this.generateSeed();

    if (isPlayer) {
      const char = attacker as Character;
      // Contract uses HARDCODED weapon damage: 15 if equipped, 5 if not
      const hasWeapon = !!char.equipment.weapon;
      const weaponDamage = hasWeapon ? 15 : 5;
      const baseDamage = 5;
      const strengthBonus = Math.floor(char.stats.strength / 2); // Integer division like contract
      const totalDamage = baseDamage + weaponDamage + strengthBonus;

      // Crit check: same formula as contract
      const isCrit = this.calculateCrit(char.stats.agility, actualSeed);
      const finalDamage = isCrit ? totalDamage * 2 : totalDamage;
      // Contract does NOT subtract enemy defense for player attacks

      return { damage: finalDamage, isCrit, targetDied: target.health - finalDamage <= 0 };
    } else {
      // Enemy attacking player - different formula
      const enemyAttacker = attacker as Enemy;
      const damage = enemyAttacker.damage ?? enemyAttacker.attack ?? 10;
      // Enemy attacks don't crit in current contract implementation
      return { damage, isCrit: false, targetDied: target.health - damage <= 0 };
    }
  }

  /**
   * Calculate HEAVY ATTACK damage - MUST match contract exactly!
   *
   * Contract formula (combat.move:609-626):
   *   weapon_damage = 15 if weapon equipped, 5 if unarmed
   *   base_damage = 5
   *   strength_bonus = strength / 2 (integer division)
   *   int_bonus = intelligence / 2 (integer division) - INT contributes to heavy attack!
   *   total_damage = base_damage + weapon_damage + strength_bonus + int_bonus
   *   heavy_damage = (total_damage * 3) / 2  (1.5x multiplier applied FIRST)
   *   crit_threshold = 50 + (agility * 2) out of 1000
   *   final_damage = heavy_damage * 2 if crit, else heavy_damage (crit applied to heavy damage)
   */
  private calculateHeavyAttackDamage(seed: number): CombatResult {
    const char = this.character;
    // Contract uses HARDCODED weapon damage: 15 if equipped, 5 if not
    const hasWeapon = !!char.equipment.weapon;
    const weaponDamage = hasWeapon ? 15 : 5;
    const baseDamage = 5;
    const strengthBonus = Math.floor(char.stats.strength / 2); // Integer division
    const intBonus = Math.floor(char.stats.intelligence / 2); // INT contributes to heavy attack
    const totalDamage = baseDamage + weaponDamage + strengthBonus + intBonus;

    // Apply 1.5x heavy attack multiplier FIRST (before crit)
    const heavyDamage = Math.floor((totalDamage * 3) / 2);

    // Crit check: same formula as contract (applied to heavy damage)
    const isCrit = this.calculateCrit(char.stats.agility, seed);
    const finalDamage = isCrit ? heavyDamage * 2 : heavyDamage;

    return { damage: finalDamage, isCrit, targetDied: this.enemy.health - finalDamage <= 0 };
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
    if (!this.textures.exists('vfx-magic') || !this.anims.exists('vfx-magic')) return;

    const vfx = this.add.sprite(x, y, 'vfx-magic')
      .setDisplaySize(180, 180)
      .setTint(tint)
      .setDepth(50);

    vfx.play('vfx-magic');
    vfx.once('animationcomplete', () => vfx.destroy());
  }
}
