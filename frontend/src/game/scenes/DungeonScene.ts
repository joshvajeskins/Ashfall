import * as Phaser from 'phaser';
import { gameEvents, GAME_EVENTS } from '../events/GameEvents';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, DUNGEON_CONFIG, BOSS_CONFIG } from '../config';
import { DungeonGenerator } from '../dungeon';
import { ParticleEffects, TransitionManager, RarityEffects, soundManager } from '../effects';
import type { Character, Enemy, Room, DungeonLayout, Item } from '@/types';

// Sprite scaling constants - assets are ~900px, need to scale to fit TILE_SIZE (50px)
const TILE_SCALE = 50 / 900; // Tiles: 900px -> 50px (12x12 grid)
const PLAYER_SCALE = 50 / 900; // Player: 900px -> 50px (fills the tile)
const ENEMY_SCALE = 42 / 900; // Enemy: 900px -> 42px
const ITEM_SCALE = 30 / 900; // Items: 900px -> 30px (smaller pickup items)
const BOSS_SCALE = 90 / 900; // Boss: 900px -> 90px (almost 2 tiles)

// Animation sprite scaling - sprites are 64x64, need to scale to fit tile
const ANIM_PLAYER_SCALE = 50 / 64; // Animated player: 64px -> 50px (fills the tile)
const ANIM_ENEMY_SCALE = 42 / 64; // Animated enemy: 64px -> 42px

interface DungeonEnemy {
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  data: Enemy;
  hasAnimations: boolean;
}

export class DungeonScene extends Phaser.Scene {
  private character!: Character;
  private player!: Phaser.GameObjects.Sprite;
  private enemies: DungeonEnemy[] = [];
  private items: Phaser.GameObjects.Image[] = [];
  private doorZones: Phaser.GameObjects.Zone[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private isMoving = false;
  private isTransitioning = false;

  private dungeonLayout!: DungeonLayout;
  private currentFloor = 1;
  private currentRoomId = 0;
  private currentRoom!: Room;

  // UI elements
  private avatarFrame!: Phaser.GameObjects.Graphics;
  private avatarSprite!: Phaser.GameObjects.Image;
  private nameText!: Phaser.GameObjects.Text;
  private healthBar!: Phaser.GameObjects.Graphics;
  private healthText!: Phaser.GameObjects.Text;
  private manaBar!: Phaser.GameObjects.Graphics;
  private manaText!: Phaser.GameObjects.Text;
  private floorText!: Phaser.GameObjects.Text;
  private roomText!: Phaser.GameObjects.Text;
  private minimapGraphics!: Phaser.GameObjects.Graphics;

  // Effects
  private particles!: ParticleEffects;
  private transitions!: TransitionManager;
  private rarityEffects!: RarityEffects;

  constructor() {
    super({ key: 'DungeonScene' });
  }

  private levelUpHandler!: () => void;
  private entryDirection: string | null = null;

  init(data: { character: Character; dungeonLayout?: DungeonLayout; floor?: number; roomId?: number; entryDirection?: string }): void {
    this.character = data.character;
    this.currentFloor = data.floor ?? 1;
    this.currentRoomId = data.roomId ?? 0;
    this.entryDirection = data.entryDirection ?? null;
    this.enemies = [];
    this.items = [];
    this.doorZones = [];
    this.isTransitioning = false;

    if (data.dungeonLayout) {
      this.dungeonLayout = data.dungeonLayout;
    } else {
      const generator = new DungeonGenerator(Date.now());
      this.dungeonLayout = generator.generate();
    }
  }

  shutdown(): void {
    if (this.levelUpHandler) {
      gameEvents.off(GAME_EVENTS.LEVEL_UP, this.levelUpHandler);
    }
  }

  create(): void {
    this.particles = new ParticleEffects(this);
    this.transitions = new TransitionManager(this);
    this.rarityEffects = new RarityEffects(this);

    this.loadCurrentRoom();
    this.createPlayer();
    this.setupInput();
    this.setupCamera();
    this.createUI();

    // Start dungeon music (will continue playing through room transitions)
    soundManager.playMusic('mainMenu');

    // Fade in from black
    this.transitions.fadeIn(300);

    // Listen for level up events
    this.levelUpHandler = () => this.showLevelUpEffect();
    gameEvents.on(GAME_EVENTS.LEVEL_UP, this.levelUpHandler);

    gameEvents.emit(GAME_EVENTS.SCENE_READY, 'DungeonScene');
    gameEvents.emit(GAME_EVENTS.ROOM_ENTER, { floor: this.currentFloor, roomId: this.currentRoomId });
  }

  private loadCurrentRoom(): void {
    const floor = this.dungeonLayout.floors[this.currentFloor - 1];
    this.currentRoom = floor.rooms.find((r) => r.id === this.currentRoomId)!;
    this.renderRoom();
    this.spawnEnemies();
    this.spawnItems();
    this.createDoors();
  }

  private renderRoom(): void {
    const { width, height } = this.currentRoom;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const isWall = x === 0 || x === width - 1 || y === 0 || y === height - 1;
        const key = isWall ? 'tile-wall' : 'tile-floor';
        this.add.image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, key)
          .setScale(TILE_SCALE);
      }
    }

    // Room type indicator
    const typeColors: Record<string, number> = {
      combat: 0xff4444, treasure: 0xffdd44, rest: 0x44ff44, boss: 0xff00ff, start: 0x4444ff,
    };
    const indicator = this.add.circle(TILE_SIZE * 1.5, TILE_SIZE * 1.5, 8, typeColors[this.currentRoom.type] ?? 0xffffff);
    indicator.setDepth(50);
  }

  private createDoors(): void {
    const { width, height, connections } = this.currentRoom;
    const doorPositions: Record<string, { x: number; y: number }> = {
      north: { x: Math.floor(width / 2), y: 0 },
      south: { x: Math.floor(width / 2), y: height - 1 },
      east: { x: width - 1, y: Math.floor(height / 2) },
      west: { x: 0, y: Math.floor(height / 2) },
    };

    connections.forEach((conn) => {
      const pos = doorPositions[conn.direction];
      const doorX = pos.x * TILE_SIZE + TILE_SIZE / 2;
      const doorY = pos.y * TILE_SIZE + TILE_SIZE / 2;

      // Door visual
      this.add.image(doorX, doorY, 'tile-door').setScale(TILE_SCALE).setDepth(5);

      // Door zone for collision
      const zone = this.add.zone(doorX, doorY, TILE_SIZE, TILE_SIZE);
      zone.setData('targetRoomId', conn.targetRoomId);
      zone.setData('direction', conn.direction);
      this.doorZones.push(zone);
    });

    // Floor exit (only on exit room)
    const floor = this.dungeonLayout.floors[this.currentFloor - 1];
    if (this.currentRoomId === floor.exitRoomId && this.currentRoom.cleared) {
      const exitX = Math.floor(width / 2) * TILE_SIZE + TILE_SIZE / 2;
      const exitY = Math.floor(height / 2) * TILE_SIZE + TILE_SIZE / 2;
      this.add.image(exitX, exitY, 'tile-exit').setScale(TILE_SCALE).setDepth(6);
      const exitZone = this.add.zone(exitX, exitY, TILE_SIZE, TILE_SIZE);
      exitZone.setData('isFloorExit', true);
      this.doorZones.push(exitZone);
    }
  }

  private createPlayer(): void {
    const { width, height } = this.currentRoom;
    const playerClass = this.character.class.toLowerCase();

    // Calculate spawn position based on entry direction
    // Spawn near the door the player came through
    let startX: number;
    let startY: number;

    switch (this.entryDirection) {
      case 'north':
        // Came through north door -> spawn near north (top)
        startX = Math.floor(width / 2) * TILE_SIZE + TILE_SIZE / 2;
        startY = 2 * TILE_SIZE + TILE_SIZE / 2;
        break;
      case 'south':
        // Came through south door -> spawn near south (bottom)
        startX = Math.floor(width / 2) * TILE_SIZE + TILE_SIZE / 2;
        startY = (height - 2) * TILE_SIZE + TILE_SIZE / 2;
        break;
      case 'east':
        // Came through east door -> spawn near east (right)
        startX = (width - 2) * TILE_SIZE + TILE_SIZE / 2;
        startY = Math.floor(height / 2) * TILE_SIZE + TILE_SIZE / 2;
        break;
      case 'west':
        // Came through west door -> spawn near west (left)
        startX = 2 * TILE_SIZE + TILE_SIZE / 2;
        startY = Math.floor(height / 2) * TILE_SIZE + TILE_SIZE / 2;
        break;
      default:
        // First room or no entry direction - spawn in center
        startX = Math.floor(width / 2) * TILE_SIZE + TILE_SIZE / 2;
        startY = Math.floor(height / 2) * TILE_SIZE + TILE_SIZE / 2;
    }

    // Always use static sprite - force exact tile size
    const playerTexture = `player-${playerClass}`;
    this.player = this.add.sprite(startX, startY, playerTexture)
      .setDisplaySize(TILE_SIZE, TILE_SIZE)
      .setDepth(10);
  }

  private scaleAnimationToTile(): void {
    // Different classes have different animation sprite sizes and positioning
    const playerClass = this.character.class.toLowerCase();
    const classConfig: Record<string, { scale: number; originY: number }> = {
      warrior: { scale: 1.4, originY: 0.7 },  // Larger sprite, move up
      mage: { scale: 1.0, originY: 0.5 },     // Normal size, centered (feet on floor)
      rogue: { scale: 1.0, originY: 0.5 },    // Normal size, centered (feet on floor)
    };
    const config = classConfig[playerClass] ?? { scale: 1.0, originY: 0.5 };
    const animSize = TILE_SIZE * config.scale;
    this.player.setDisplaySize(animSize, animSize);
    this.player.setOrigin(0.5, config.originY);
  }

  private resetPlayerToStatic(): void {
    // Reset to center origin for static sprite
    this.player.setOrigin(0.5, 0.5);
    this.player.setDisplaySize(TILE_SIZE, TILE_SIZE);
  }

  private spawnEnemies(): void {
    if (this.currentRoom.cleared) return;

    // Boss floor spawns the boss instead of regular enemies
    if (this.currentFloor === DUNGEON_CONFIG.BOSS_FLOOR && this.currentRoom.type === 'boss') {
      this.spawnBoss();
      return;
    }

    // Enemy types vary by floor
    const enemyTypes = this.getEnemyTypesForFloor();
    this.currentRoom.enemies.forEach((enemy, i) => {
      const x = Phaser.Math.Between(2, this.currentRoom.width - 3) * TILE_SIZE + TILE_SIZE / 2;
      const y = Phaser.Math.Between(2, this.currentRoom.height - 3) * TILE_SIZE + TILE_SIZE / 2;
      const enemyType = enemyTypes[i % enemyTypes.length];

      // Check if enemy has combat animations (attack, hit, death) - not idle
      const hasAnimations = this.textures.exists(`${enemyType}-attack`);

      // Always use static sprite for idle state
      const key = `enemy-${enemyType}`;
      const sprite = this.add.image(x, y, key).setScale(ENEMY_SCALE).setDepth(9);
      this.enemies.push({ sprite, data: { ...enemy, id: i, name: enemyType }, hasAnimations });
    });
  }

  private getEnemyTypesForFloor(): string[] {
    // Different enemy types appear on different floors
    const floorEnemies: Record<number, string[]> = {
      1: ['goblin', 'skeleton'],
      2: ['skeleton', 'zombie', 'goblin'],
      3: ['zombie', 'ghoul', 'skeleton'],
      4: ['ghoul', 'vampire', 'lich'],
      5: ['vampire', 'lich', 'dragon'],
    };
    return floorEnemies[this.currentFloor] || ['skeleton', 'goblin'];
  }

  private spawnBoss(): void {
    const x = Math.floor(this.currentRoom.width / 2) * TILE_SIZE + TILE_SIZE / 2;
    const y = Math.floor(this.currentRoom.height / 3) * TILE_SIZE + TILE_SIZE / 2;
    const sprite = this.add.image(x, y, 'enemy-boss').setScale(BOSS_SCALE).setDepth(9);

    const bossEnemy: Enemy = {
      id: 999,
      name: BOSS_CONFIG.name,
      health: BOSS_CONFIG.health,
      maxHealth: BOSS_CONFIG.maxHealth,
      attack: BOSS_CONFIG.attack,
      defense: BOSS_CONFIG.defense,
      xpReward: BOSS_CONFIG.xpReward,
      lootTier: BOSS_CONFIG.lootTier,
      isBoss: true,
    };

    this.enemies.push({ sprite, data: bossEnemy, hasAnimations: false });

    gameEvents.emit(GAME_EVENTS.BOSS_SPAWNED, {
      name: BOSS_CONFIG.name,
      health: BOSS_CONFIG.health,
      maxHealth: BOSS_CONFIG.maxHealth,
    });
  }

  private getItemSpriteKey(item: Item): string {
    // Map item type to sprite key
    const typeMap: Record<string, string> = {
      'Weapon': 'item-sword',
      'Armor': 'item-armour',
      'Accessory': 'item-ring',
      'Consumable': 'item-potion',
    };
    // Check for specific item names
    const name = item.name.toLowerCase();
    if (name.includes('shield')) return 'item-shield';
    if (name.includes('gold') || name.includes('coin')) return 'item-gold';
    if (name.includes('potion')) return 'item-potion';
    if (name.includes('ring')) return 'item-ring';
    return typeMap[item.type] || 'item-sword';
  }

  private spawnItems(): void {
    if (this.currentRoom.cleared || this.currentRoom.type !== 'treasure') return;
    this.currentRoom.loot.forEach((item) => {
      const x = Phaser.Math.Between(2, this.currentRoom.width - 3) * TILE_SIZE + TILE_SIZE / 2;
      const y = Phaser.Math.Between(2, this.currentRoom.height - 3) * TILE_SIZE + TILE_SIZE / 2;
      const key = this.getItemSpriteKey(item);
      const sprite = this.add.image(x, y, key).setScale(ITEM_SCALE).setDepth(5).setData('itemData', item);
      this.items.push(sprite);

      // Add sparkle effect for items
      if (item.rarity && item.rarity !== 'Common') {
        this.particles.lootSparkle({ x, y, duration: -1 });
        this.rarityEffects.applyEffect(sprite, item.rarity);
      }
    });
  }

  private createUI(): void {
    // === LEFT SIDE: Character Info ===
    const leftX = 10;
    const avatarSize = 50;

    // Avatar decoration frame
    this.avatarFrame = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.avatarFrame.lineStyle(3, 0xffaa00, 1);
    this.avatarFrame.strokeRoundedRect(leftX - 2, 8, avatarSize + 4, avatarSize + 4, 6);
    this.avatarFrame.fillStyle(0x1a1a1a, 0.9);
    this.avatarFrame.fillRoundedRect(leftX, 10, avatarSize, avatarSize, 4);

    // Character avatar
    const playerClass = this.character.class.toLowerCase();
    this.avatarSprite = this.add.image(leftX + avatarSize / 2, 10 + avatarSize / 2, `player-${playerClass}`)
      .setDisplaySize(avatarSize - 8, avatarSize - 8)
      .setScrollFactor(0)
      .setDepth(101);

    // Character name
    this.nameText = this.add.text(leftX + avatarSize + 10, 12, this.character.class, {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffaa00', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(100);

    // Level text
    this.add.text(leftX + avatarSize + 10, 28, `Lv. ${this.character.level}`, {
      fontFamily: 'monospace', fontSize: '11px', color: '#aaaaaa',
    }).setScrollFactor(0).setDepth(100);

    // Health bar
    this.healthBar = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.healthText = this.add.text(leftX + avatarSize + 10 + 75, 44, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#ffffff',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);
    this.updateHealthBar();

    // Mana bar
    this.manaBar = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.manaText = this.add.text(leftX + avatarSize + 10 + 75, 58, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#ffffff',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);
    this.updateManaBar();

    // === RIGHT SIDE: Floor & Room Info ===
    const rightX = GAME_WIDTH - 10;

    this.floorText = this.add.text(rightX, 10, `Floor ${this.currentFloor}/5`, {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    this.roomText = this.add.text(rightX, 28, this.getRoomLabel(), {
      fontFamily: 'monospace', fontSize: '12px', color: '#aaaaaa',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    // Minimap below floor info
    this.minimapGraphics = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.updateMinimap();

    // ESC hint at bottom right
    this.add.text(GAME_WIDTH - 10, GAME_HEIGHT - 10, 'ESC to exit', {
      fontFamily: 'monospace', fontSize: '10px', color: '#444444',
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(100);
  }

  private getRoomLabel(): string {
    const labels: Record<string, string> = {
      combat: 'Combat Room', treasure: 'Treasure Room', rest: 'Rest Room', boss: 'BOSS ROOM', start: 'Entrance',
    };
    return labels[this.currentRoom.type] ?? 'Room';
  }

  private updateHealthBar(): void {
    this.healthBar.clear();
    const x = 70, y = 44, w = 150, h = 12;
    this.healthBar.fillStyle(0x222222, 1).fillRoundedRect(x, y, w, h, 3);
    const pct = this.character.health / this.character.maxHealth;
    if (pct > 0) {
      this.healthBar.fillStyle(pct > 0.3 ? 0x44aa44 : 0xaa4444, 1).fillRoundedRect(x, y, w * pct, h, 3);
    }
    this.healthBar.lineStyle(1, 0x444444, 1).strokeRoundedRect(x, y, w, h, 3);
    this.healthText.setText(`${this.character.health}/${this.character.maxHealth}`);
  }

  private updateManaBar(): void {
    this.manaBar.clear();
    const x = 70, y = 58, w = 150, h = 12;
    this.manaBar.fillStyle(0x222222, 1).fillRoundedRect(x, y, w, h, 3);
    const pct = this.character.mana / this.character.maxMana;
    if (pct > 0) {
      this.manaBar.fillStyle(0x4466dd, 1).fillRoundedRect(x, y, w * pct, h, 3);
    }
    this.manaBar.lineStyle(1, 0x444444, 1).strokeRoundedRect(x, y, w, h, 3);
    this.manaText.setText(`${this.character.mana}/${this.character.maxMana}`);
  }

  private updateMinimap(): void {
    this.minimapGraphics.clear();
    const floor = this.dungeonLayout.floors[this.currentFloor - 1];
    const size = 16, gap = 2;
    const mapWidth = 5 * (size + gap);
    const baseX = GAME_WIDTH - 10 - mapWidth, baseY = 50;

    floor.rooms.forEach((room) => {
      const rx = baseX + room.x * (size + gap);
      const ry = baseY + room.y * (size + gap);
      const color = room.id === this.currentRoomId ? 0xffff00 : room.cleared ? 0x44aa44 : 0x333333;
      this.minimapGraphics.fillStyle(color, 1).fillRoundedRect(rx, ry, size, size, 2);
      if (room.id === floor.exitRoomId) {
        this.minimapGraphics.lineStyle(2, 0xff4444, 1).strokeRoundedRect(rx, ry, size, size, 2);
      }
    });
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.input.keyboard!.on('keydown-ESC', () => {
      gameEvents.emit(GAME_EVENTS.DUNGEON_EXIT);
      this.scene.start('MenuScene', { character: this.character });
    });
  }

  private setupCamera(): void {
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, this.currentRoom.width * TILE_SIZE, this.currentRoom.height * TILE_SIZE);
  }

  update(): void {
    if (this.isMoving || this.isTransitioning) return;
    this.handleMovement();
  }

  private handleMovement(): void {
    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dx = -1;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) dx = 1;
    else if (this.cursors.up.isDown || this.wasd.W.isDown) dy = -1;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) dy = 1;
    if (dx === 0 && dy === 0) return;

    const newX = this.player.x + dx * TILE_SIZE;
    const newY = this.player.y + dy * TILE_SIZE;
    const tileX = Math.floor(newX / TILE_SIZE);
    const tileY = Math.floor(newY / TILE_SIZE);

    // Wall collision
    if (tileX <= 0 || tileX >= this.currentRoom.width - 1 || tileY <= 0 || tileY >= this.currentRoom.height - 1) {
      this.checkDoorCollision(newX, newY);
      return;
    }

    // Enemy collision
    const enemy = this.enemies.find((e) => Phaser.Math.Distance.Between(newX, newY, e.sprite.x, e.sprite.y) < TILE_SIZE);
    if (enemy) { this.startCombat(enemy); return; }

    this.isMoving = true;

    // Flip sprite based on direction
    if (dx !== 0) {
      this.player.setFlipX(dx < 0);
    }

    // Play move animation if available
    const playerClass = this.character.class.toLowerCase();
    const moveAnimKey = `${playerClass}-move`;

    if (this.anims.exists(moveAnimKey)) {
      this.player.play(moveAnimKey);
      // Scale animation and offset Y (feet at bottom of sprite)
      this.scaleAnimationToTile();
    }

    this.tweens.add({
      targets: this.player, x: newX, y: newY, duration: 150, ease: 'Linear',
      onComplete: () => {
        this.isMoving = false;
        // Stop animation and return to static sprite
        this.player.stop();
        const playerTexture = `player-${playerClass}`;
        this.player.setTexture(playerTexture);
        this.resetPlayerToStatic();
        this.checkItemPickup();
      },
    });
  }

  private checkDoorCollision(x: number, y: number): void {
    for (const zone of this.doorZones) {
      if (Phaser.Math.Distance.Between(x, y, zone.x, zone.y) < TILE_SIZE) {
        if (zone.getData('isFloorExit')) { this.nextFloor(); return; }
        const targetId = zone.getData('targetRoomId');
        const direction = zone.getData('direction') as string;
        if (typeof targetId === 'number') { this.transitionToRoom(targetId, direction); return; }
      }
    }
  }

  private transitionToRoom(targetRoomId: number, exitDirection: string): void {
    if (!this.currentRoom.cleared && this.currentRoom.type !== 'start') return;
    this.isTransitioning = true;
    gameEvents.emit(GAME_EVENTS.ROOM_TRANSITION, { from: this.currentRoomId, to: targetRoomId });
    this.cameras.main.fadeOut(200, 0, 0, 0);

    // Entry direction is opposite of exit direction
    const entryDirectionMap: Record<string, string> = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east',
    };
    const entryDirection = entryDirectionMap[exitDirection] || null;

    this.time.delayedCall(200, () => {
      this.scene.restart({
        character: this.character,
        dungeonLayout: this.dungeonLayout,
        floor: this.currentFloor,
        roomId: targetRoomId,
        entryDirection,
      });
    });
  }

  private nextFloor(): void {
    this.currentFloor++;
    gameEvents.emit(GAME_EVENTS.FLOOR_COMPLETE, { floor: this.currentFloor - 1 });

    if (this.currentFloor > DUNGEON_CONFIG.MAX_FLOORS) {
      this.transitionToVictory();
      return;
    }

    // Check if entering boss floor
    if (this.currentFloor === DUNGEON_CONFIG.BOSS_FLOOR) {
      this.spawnBossEncounter();
      return;
    }

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.restart({ character: this.character, dungeonLayout: this.dungeonLayout, floor: this.currentFloor, roomId: 0 });
    });
  }

  private spawnBossEncounter(): void {
    gameEvents.emit(GAME_EVENTS.BOSS_APPROACHING);
    this.cameras.main.shake(300, 0.01);

    this.time.delayedCall(1500, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.restart({ character: this.character, dungeonLayout: this.dungeonLayout, floor: this.currentFloor, roomId: 0 });
      });
    });
  }

  private transitionToVictory(): void {
    gameEvents.emit(GAME_EVENTS.DUNGEON_COMPLETE);
    gameEvents.emit(GAME_EVENTS.DUNGEON_VICTORY);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.start('VictoryScene', { character: this.character });
    });
  }

  private checkItemPickup(): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y) < TILE_SIZE / 2) {
        const itemData = item.getData('itemData') as Item;

        // Map item type to on-chain type
        const itemTypeMap: Record<string, number> = {
          'Weapon': 0,
          'Armor': 1,
          'Accessory': 2,
          'Consumable': 3
        };
        const itemType = itemTypeMap[itemData.type] ?? 0;

        // Emit pickup request to trigger on-chain transaction
        gameEvents.emit(GAME_EVENTS.ITEM_PICKUP_REQUEST, {
          itemType,
          floor: this.currentFloor,
          enemyTier: 1,
          consumableType: itemData.type === 'Consumable' ? 0 : undefined,
          power: itemData.type === 'Consumable' ? 50 : undefined
        });

        // Visual/audio feedback immediately (transaction in background)
        soundManager.play('itemPickup');
        this.particles.itemPickup({ x: item.x, y: item.y });
        this.playVFXMagic(item.x, item.y, 0xffdd44); // Golden glow for item pickup
        this.rarityEffects.removeEffect(item);
        gameEvents.emit(GAME_EVENTS.ITEM_PICKUP, itemData);
        item.destroy();
        this.items.splice(i, 1);
      }
    }
    if (this.currentRoom.type === 'treasure' && this.items.length === 0) this.markRoomCleared();
  }

  private markRoomCleared(): void {
    if (this.currentRoom.cleared) return;
    this.currentRoom.cleared = true;
    gameEvents.emit(GAME_EVENTS.ROOM_CLEAR, { floor: this.currentFloor, roomId: this.currentRoomId });
    this.roomText.setText(`${this.getRoomLabel()} (Cleared)`);
    this.updateMinimap();
    // Refresh doors to show exit if this was the exit room
    if (this.currentRoomId === this.dungeonLayout.floors[this.currentFloor - 1].exitRoomId) {
      this.createExitDoor();
    }
  }

  private createExitDoor(): void {
    const { width, height } = this.currentRoom;
    const exitX = Math.floor(width / 2) * TILE_SIZE + TILE_SIZE / 2;
    const exitY = Math.floor(height / 2) * TILE_SIZE + TILE_SIZE / 2 + TILE_SIZE;
    this.add.image(exitX, exitY, 'tile-exit').setScale(TILE_SCALE).setDepth(6);
    const exitZone = this.add.zone(exitX, exitY, TILE_SIZE, TILE_SIZE);
    exitZone.setData('isFloorExit', true);
    this.doorZones.push(exitZone);
  }

  private startCombat(enemy: DungeonEnemy): void {
    gameEvents.emit(GAME_EVENTS.ENEMY_ENCOUNTERED, enemy.data);
    this.scene.start('CombatScene', {
      character: this.character, enemy: enemy.data,
      returnData: { floor: this.currentFloor, roomId: this.currentRoomId, dungeonLayout: this.dungeonLayout },
    });
  }

  removeEnemy(enemyId: number): void {
    const idx = this.enemies.findIndex((e) => e.data.id === enemyId);
    if (idx !== -1) {
      const enemy = this.enemies[idx];

      // Check if boss was defeated
      if (enemy.data.isBoss) {
        this.onBossDefeated(enemy.data);
      }

      enemy.sprite.destroy();
      this.enemies.splice(idx, 1);
      if (this.enemies.length === 0 && this.currentRoom.type !== 'start') this.markRoomCleared();
    }
  }

  private onBossDefeated(boss: Enemy): void {
    this.cameras.main.shake(500, 0.02);

    gameEvents.emit(GAME_EVENTS.BOSS_DEFEATED, {
      name: boss.name,
      xpEarned: boss.xpReward,
    });

    // Request boss loot generation
    gameEvents.emit(GAME_EVENTS.REQUEST_BOSS_LOOT, {
      dungeonId: 1,
      floor: DUNGEON_CONFIG.BOSS_FLOOR,
    });

    // Transition to victory after short delay
    this.time.delayedCall(2000, () => {
      this.transitionToVictory();
    });
  }

  private playVFXMagic(x: number, y: number, tint: number = 0xffffff): void {
    if (!this.textures.exists('vfx-magic')) return;

    const vfx = this.add.image(x, y, 'vfx-magic')
      .setDisplaySize(80, 80)
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

  // Called from React when player levels up
  showLevelUpEffect(): void {
    soundManager.play('levelUp');
    this.playVFXMagic(this.player.x, this.player.y, 0x44ff88);
    this.cameras.main.flash(300, 255, 255, 200, true);
  }
}
