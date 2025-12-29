import * as Phaser from 'phaser';
import { gameEvents, GAME_EVENTS } from '../events/GameEvents';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, DUNGEON_CONFIG, BOSS_CONFIG } from '../config';
import { DungeonGenerator } from '../dungeon';
import { ParticleEffects, TransitionManager, RarityEffects, soundManager } from '../effects';
import type { Character, Enemy, Room, DungeonLayout, Item } from '@/types';

interface DungeonEnemy {
  sprite: Phaser.GameObjects.Image;
  data: Enemy;
}

export class DungeonScene extends Phaser.Scene {
  private character!: Character;
  private player!: Phaser.GameObjects.Image;
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
  private floorText!: Phaser.GameObjects.Text;
  private roomText!: Phaser.GameObjects.Text;
  private healthBar!: Phaser.GameObjects.Graphics;
  private minimapGraphics!: Phaser.GameObjects.Graphics;

  // Effects
  private particles!: ParticleEffects;
  private transitions!: TransitionManager;
  private rarityEffects!: RarityEffects;

  constructor() {
    super({ key: 'DungeonScene' });
  }

  init(data: { character: Character; dungeonLayout?: DungeonLayout; floor?: number; roomId?: number }): void {
    this.character = data.character;
    this.currentFloor = data.floor ?? 1;
    this.currentRoomId = data.roomId ?? 0;
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

  create(): void {
    this.particles = new ParticleEffects(this);
    this.transitions = new TransitionManager(this);
    this.rarityEffects = new RarityEffects(this);

    this.loadCurrentRoom();
    this.createPlayer();
    this.setupInput();
    this.setupCamera();
    this.createUI();

    // Fade in from black
    this.transitions.fadeIn(300);

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
        this.add.image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, key);
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
      this.add.image(doorX, doorY, 'tile-door').setDepth(5);

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
      this.add.image(exitX, exitY, 'tile-exit').setDepth(6);
      const exitZone = this.add.zone(exitX, exitY, TILE_SIZE, TILE_SIZE);
      exitZone.setData('isFloorExit', true);
      this.doorZones.push(exitZone);
    }
  }

  private createPlayer(): void {
    const { width, height } = this.currentRoom;
    const startX = Math.floor(width / 2) * TILE_SIZE + TILE_SIZE / 2;
    const startY = Math.floor(height / 2) * TILE_SIZE + TILE_SIZE / 2;
    this.player = this.add.image(startX, startY, 'player').setDepth(10);
  }

  private spawnEnemies(): void {
    if (this.currentRoom.cleared) return;

    // Boss floor spawns the boss instead of regular enemies
    if (this.currentFloor === DUNGEON_CONFIG.BOSS_FLOOR && this.currentRoom.type === 'boss') {
      this.spawnBoss();
      return;
    }

    this.currentRoom.enemies.forEach((enemy, i) => {
      const x = Phaser.Math.Between(3, this.currentRoom.width - 4) * TILE_SIZE + TILE_SIZE / 2;
      const y = Phaser.Math.Between(3, this.currentRoom.height - 4) * TILE_SIZE + TILE_SIZE / 2;
      const key = `enemy-${['goblin', 'skeleton'][i % 2]}`;
      const sprite = this.add.image(x, y, key).setDepth(9);
      this.enemies.push({ sprite, data: { ...enemy, id: i } });
    });
  }

  private spawnBoss(): void {
    const x = Math.floor(this.currentRoom.width / 2) * TILE_SIZE + TILE_SIZE / 2;
    const y = Math.floor(this.currentRoom.height / 3) * TILE_SIZE + TILE_SIZE / 2;
    const sprite = this.add.image(x, y, 'enemy-demon').setDepth(9).setScale(1.5);

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

    this.enemies.push({ sprite, data: bossEnemy });

    gameEvents.emit(GAME_EVENTS.BOSS_SPAWNED, {
      name: BOSS_CONFIG.name,
      health: BOSS_CONFIG.health,
      maxHealth: BOSS_CONFIG.maxHealth,
    });
  }

  private spawnItems(): void {
    if (this.currentRoom.cleared || this.currentRoom.type !== 'treasure') return;
    this.currentRoom.loot.forEach((item, i) => {
      const x = Phaser.Math.Between(3, this.currentRoom.width - 4) * TILE_SIZE + TILE_SIZE / 2;
      const y = Phaser.Math.Between(3, this.currentRoom.height - 4) * TILE_SIZE + TILE_SIZE / 2;
      const key = `item-${['sword', 'shield', 'potion'][i % 3]}`;
      const sprite = this.add.image(x, y, key).setDepth(5).setData('itemData', item);
      this.items.push(sprite);

      // Add sparkle effect for items
      if (item.rarity && item.rarity !== 'Common') {
        this.particles.lootSparkle({ x, y, duration: -1 });
        this.rarityEffects.applyEffect(sprite, item.rarity);
      }
    });
  }

  private createUI(): void {
    this.floorText = this.add.text(10, 10, `Floor ${this.currentFloor}/5`, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
    }).setScrollFactor(0).setDepth(100);

    this.roomText = this.add.text(10, 32, this.getRoomLabel(), {
      fontFamily: 'monospace', fontSize: '14px', color: '#aaaaaa',
    }).setScrollFactor(0).setDepth(100);

    this.healthBar = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.updateHealthBar();

    this.minimapGraphics = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.updateMinimap();

    this.add.text(GAME_WIDTH - 10, GAME_HEIGHT - 10, 'ESC to exit', {
      fontFamily: 'monospace', fontSize: '12px', color: '#666666',
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
    const x = 10, y = 55, w = 150, h = 16;
    this.healthBar.fillStyle(0x222222, 1).fillRect(x, y, w, h);
    const pct = this.character.health / this.character.maxHealth;
    this.healthBar.fillStyle(pct > 0.3 ? 0x44aa44 : 0xaa4444, 1).fillRect(x, y, w * pct, h);
    this.healthBar.lineStyle(2, 0x666666, 1).strokeRect(x, y, w, h);
  }

  private updateMinimap(): void {
    this.minimapGraphics.clear();
    const floor = this.dungeonLayout.floors[this.currentFloor - 1];
    const baseX = GAME_WIDTH - 120, baseY = 10, size = 18, gap = 2;

    floor.rooms.forEach((room) => {
      const rx = baseX + room.x * (size + gap);
      const ry = baseY + (room.y + 2) * (size + gap);
      const color = room.id === this.currentRoomId ? 0xffff00 : room.cleared ? 0x44aa44 : 0x666666;
      this.minimapGraphics.fillStyle(color, 1).fillRect(rx, ry, size, size);
      if (room.id === floor.exitRoomId) {
        this.minimapGraphics.lineStyle(2, 0xff0000, 1).strokeRect(rx, ry, size, size);
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
    this.tweens.add({
      targets: this.player, x: newX, y: newY, duration: 150, ease: 'Linear',
      onComplete: () => { this.isMoving = false; this.checkItemPickup(); },
    });
  }

  private checkDoorCollision(x: number, y: number): void {
    for (const zone of this.doorZones) {
      if (Phaser.Math.Distance.Between(x, y, zone.x, zone.y) < TILE_SIZE) {
        if (zone.getData('isFloorExit')) { this.nextFloor(); return; }
        const targetId = zone.getData('targetRoomId');
        if (typeof targetId === 'number') { this.transitionToRoom(targetId); return; }
      }
    }
  }

  private transitionToRoom(targetRoomId: number): void {
    if (!this.currentRoom.cleared && this.currentRoom.type !== 'start') return;
    this.isTransitioning = true;
    gameEvents.emit(GAME_EVENTS.ROOM_TRANSITION, { from: this.currentRoomId, to: targetRoomId });
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => {
      this.scene.restart({ character: this.character, dungeonLayout: this.dungeonLayout, floor: this.currentFloor, roomId: targetRoomId });
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
        soundManager.play('itemPickup');
        this.particles.itemPickup({ x: item.x, y: item.y });
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
    this.add.image(exitX, exitY, 'tile-exit').setDepth(6);
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
}
