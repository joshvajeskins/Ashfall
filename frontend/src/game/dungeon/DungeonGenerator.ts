/**
 * Dungeon Generator - Creates procedural dungeon layouts
 * Each floor has 3-8 rooms connected by corridors
 */

import type { Room, RoomType, FloorLayout, DungeonLayout, Enemy, Item } from '@/types';

const ROOM_TYPES: RoomType[] = ['combat', 'treasure', 'rest'];
type Direction = 'north' | 'south' | 'east' | 'west';
const DIRECTIONS: Direction[] = ['north', 'south', 'east', 'west'];
const OPPOSITE: Record<Direction, Direction> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

// Seeded random for reproducible dungeons
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  between(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: readonly T[] | T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

export class DungeonGenerator {
  private rng: SeededRandom;
  private dungeonId: number;
  private seed: number;

  constructor(dungeonId: number, seed?: number) {
    this.dungeonId = dungeonId;
    this.seed = seed ?? Date.now();
    this.rng = new SeededRandom(this.seed);
  }

  generate(): DungeonLayout {
    const floors: FloorLayout[] = [];
    for (let i = 1; i <= 5; i++) {
      floors.push(this.generateFloor(i));
    }
    return { dungeonId: this.dungeonId, floors, seed: this.seed };
  }

  private generateFloor(floorNumber: number): FloorLayout {
    const roomCount = this.rng.between(3, 8);
    const rooms: Room[] = [];
    const grid: Map<string, number> = new Map();

    // Place start room at origin
    const startRoom = this.createRoom(0, 'start', 0, 0, floorNumber);
    rooms.push(startRoom);
    grid.set('0,0', 0);

    // Generate connected rooms
    let roomId = 1;
    let attempts = 0;
    while (rooms.length < roomCount && attempts < 100) {
      attempts++;
      const parentIdx = this.rng.between(0, rooms.length - 1);
      const parent = rooms[parentIdx];
      const dir = this.rng.pick(DIRECTIONS);
      const [dx, dy] = this.dirOffset(dir);
      const nx = parent.x + dx;
      const ny = parent.y + dy;
      const key = `${nx},${ny}`;

      if (grid.has(key)) continue;

      const isBoss = floorNumber === 5 && rooms.length === roomCount - 1;
      const type: RoomType = isBoss ? 'boss' : this.rng.pick(ROOM_TYPES);
      const newRoom = this.createRoom(roomId, type, nx, ny, floorNumber);

      // Connect rooms
      parent.connections.push({ direction: dir, targetRoomId: roomId });
      newRoom.connections.push({ direction: OPPOSITE[dir], targetRoomId: parentIdx });

      rooms.push(newRoom);
      grid.set(key, roomId);
      roomId++;
    }

    // Find exit room (furthest from start or boss room)
    let exitRoomId = rooms.length - 1;
    if (floorNumber === 5) {
      const bossRoom = rooms.find((r) => r.type === 'boss');
      if (bossRoom) exitRoomId = bossRoom.id;
    }

    return { floorNumber, rooms, startRoomId: 0, exitRoomId };
  }

  private createRoom(
    id: number,
    type: RoomType,
    x: number,
    y: number,
    floor: number
  ): Room {
    return {
      id,
      type,
      x,
      y,
      width: 15,
      height: 11,
      enemies: type === 'combat' || type === 'boss' ? this.generateEnemies(floor, type) : [],
      loot: type === 'treasure' ? this.generateLoot(floor) : [],
      cleared: type === 'start' || type === 'rest',
      connections: [],
    };
  }

  private generateEnemies(floor: number, roomType: RoomType): Enemy[] {
    const count = roomType === 'boss' ? 1 : this.rng.between(2, 3 + floor);
    const enemies: Enemy[] = [];

    const types = [
      { name: 'Goblin', baseHp: 20, baseDmg: 5 },
      { name: 'Skeleton', baseHp: 30, baseDmg: 8 },
      { name: 'Demon', baseHp: 50, baseDmg: 12 },
    ];

    for (let i = 0; i < count; i++) {
      const typeIdx = roomType === 'boss' ? 2 : Math.min(Math.floor(floor / 2), 2);
      const type = types[this.rng.between(0, typeIdx)];
      const multiplier = roomType === 'boss' ? 3 : 1;

      enemies.push({
        id: i,
        name: roomType === 'boss' ? `${type.name} Lord` : type.name,
        health: (type.baseHp + floor * 5) * multiplier,
        maxHealth: (type.baseHp + floor * 5) * multiplier,
        damage: (type.baseDmg + floor * 2) * multiplier,
        defense: floor * multiplier,
        experienceReward: (10 + floor * 5) * multiplier,
      });
    }
    return enemies;
  }

  private generateLoot(floor: number): Item[] {
    const count = this.rng.between(1, 2 + Math.floor(floor / 2));
    const items: Item[] = [];
    const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'] as const;

    for (let i = 0; i < count; i++) {
      const rarityIdx = Math.min(this.rng.between(0, floor), 4);
      items.push({
        id: Date.now() + i,
        name: this.rng.pick(['Sword', 'Shield', 'Potion', 'Ring']),
        rarity: rarities[rarityIdx],
        type: this.rng.pick(['Weapon', 'Armor', 'Consumable', 'Accessory']),
        stats: { damage: 5 + floor * 2 },
        enchantments: [],
        durability: 100,
        killCount: 0,
        origin: { dungeonId: this.dungeonId, floor },
      });
    }
    return items;
  }

  private dirOffset(dir: string): [number, number] {
    switch (dir) {
      case 'north': return [0, -1];
      case 'south': return [0, 1];
      case 'east': return [1, 0];
      case 'west': return [-1, 0];
      default: return [0, 0];
    }
  }
}
