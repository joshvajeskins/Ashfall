/**
 * Dungeon Generator - Creates procedural dungeon layouts
 * Each floor has 3-8 rooms connected by corridors
 * Every room (except start) has at least enemies OR loot
 * Difficulty and loot rarity scale with floor level
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

// Floor scaling configuration
const FLOOR_CONFIG = {
  // Enemy scaling per floor
  enemy: {
    minCount: (floor: number) => 1 + Math.floor(floor / 2),
    maxCount: (floor: number) => 2 + floor,
    healthMultiplier: (floor: number) => 1 + (floor - 1) * 0.3,
    damageMultiplier: (floor: number) => 1 + (floor - 1) * 0.25,
    defenseMultiplier: (floor: number) => 1 + (floor - 1) * 0.2,
    xpMultiplier: (floor: number) => 1 + (floor - 1) * 0.5,
  },
  // Loot scaling per floor
  loot: {
    minCount: (floor: number) => 1,
    maxCount: (floor: number) => 1 + Math.floor(floor / 2),
    // Rarity weights by floor (higher floors = better loot)
    rarityWeights: (floor: number) => {
      const base = [50, 30, 15, 4, 1]; // Common, Uncommon, Rare, Epic, Legendary
      const shift = Math.min(floor - 1, 3) * 8;
      return [
        Math.max(base[0] - shift * 2, 10),
        base[1] + shift / 2,
        base[2] + shift,
        base[3] + shift / 2,
        base[4] + Math.floor(floor / 2),
      ];
    },
  },
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
    // Start rooms are always empty and cleared
    if (type === 'start') {
      return {
        id, type, x, y, width: 12, height: 12,
        enemies: [], loot: [], cleared: true, connections: [],
      };
    }

    // Boss rooms have boss + guaranteed loot
    if (type === 'boss') {
      return {
        id, type, x, y, width: 12, height: 12,
        enemies: this.generateEnemies(floor, type),
        loot: this.generateLoot(floor, true), // Guaranteed better loot
        cleared: false, connections: [],
      };
    }

    // All other rooms: guaranteed to have enemies OR loot (or both)
    // Combat rooms: always enemies, chance for loot
    // Treasure rooms: always loot, chance for enemies (guarding treasure)
    // Rest rooms: converted to have content (no truly empty rooms)
    let enemies: Enemy[] = [];
    let loot: Item[] = [];

    if (type === 'combat') {
      enemies = this.generateEnemies(floor, type);
      // 40% chance to also have loot
      if (this.rng.next() < 0.4) {
        loot = this.generateLoot(floor, false);
      }
    } else if (type === 'treasure') {
      loot = this.generateLoot(floor, false);
      // 50% chance to have enemies guarding the treasure
      if (this.rng.next() < 0.5) {
        enemies = this.generateEnemies(floor, 'combat');
      }
    } else {
      // "Rest" rooms - randomly assign enemies or loot (no empty rooms)
      if (this.rng.next() < 0.6) {
        enemies = this.generateEnemies(floor, 'combat');
        if (this.rng.next() < 0.3) loot = this.generateLoot(floor, false);
      } else {
        loot = this.generateLoot(floor, false);
        if (this.rng.next() < 0.3) enemies = this.generateEnemies(floor, 'combat');
      }
    }

    return {
      id, type, x, y, width: 12, height: 12,
      enemies, loot, cleared: false, connections: [],
    };
  }

  private generateEnemies(floor: number, roomType: RoomType): Enemy[] {
    const cfg = FLOOR_CONFIG.enemy;
    const isBoss = roomType === 'boss';
    const count = isBoss ? 1 : this.rng.between(cfg.minCount(floor), cfg.maxCount(floor));
    const enemies: Enemy[] = [];

    // Enemy types unlock as floors increase
    const enemyTypes = [
      { name: 'Goblin', baseHp: 25, baseDmg: 8, baseDef: 2, baseXp: 15 },
      { name: 'Skeleton', baseHp: 35, baseDmg: 12, baseDef: 4, baseXp: 25 },
      { name: 'Orc', baseHp: 50, baseDmg: 15, baseDef: 6, baseXp: 40 },
      { name: 'Demon', baseHp: 70, baseDmg: 20, baseDef: 8, baseXp: 60 },
      { name: 'Dragon', baseHp: 100, baseDmg: 25, baseDef: 12, baseXp: 100 },
    ];

    // Higher floors unlock stronger enemy types
    const maxTypeIdx = isBoss ? enemyTypes.length - 1 : Math.min(floor - 1, enemyTypes.length - 2);
    const minTypeIdx = Math.max(0, floor - 2);

    for (let i = 0; i < count; i++) {
      const typeIdx = isBoss
        ? Math.min(floor, enemyTypes.length - 1)
        : this.rng.between(minTypeIdx, maxTypeIdx);
      const type = enemyTypes[typeIdx];
      const bossMultiplier = isBoss ? 2.5 : 1;

      const health = Math.round(type.baseHp * cfg.healthMultiplier(floor) * bossMultiplier);
      const damage = Math.round(type.baseDmg * cfg.damageMultiplier(floor) * bossMultiplier);
      const defense = Math.round(type.baseDef * cfg.defenseMultiplier(floor) * bossMultiplier);
      const xp = Math.round(type.baseXp * cfg.xpMultiplier(floor) * bossMultiplier);

      enemies.push({
        id: i,
        name: isBoss ? `${type.name} Lord` : type.name,
        health,
        maxHealth: health,
        damage,
        defense,
        experienceReward: xp,
      });
    }
    return enemies;
  }

  private generateLoot(floor: number, isBossLoot: boolean = false): Item[] {
    const cfg = FLOOR_CONFIG.loot;
    const count = isBossLoot
      ? this.rng.between(2, 3) // Boss always drops 2-3 items
      : this.rng.between(cfg.minCount(floor), cfg.maxCount(floor));
    const items: Item[] = [];
    const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'] as const;

    // Item templates with stat scaling
    const itemTemplates = {
      Weapon: [
        { name: 'Rusty Sword', baseDmg: 5 },
        { name: 'Iron Blade', baseDmg: 10 },
        { name: 'Steel Sword', baseDmg: 15 },
        { name: 'Enchanted Blade', baseDmg: 22 },
        { name: 'Dragon Slayer', baseDmg: 30 },
      ],
      Armor: [
        { name: 'Leather Armor', baseDef: 3 },
        { name: 'Chain Mail', baseDef: 6 },
        { name: 'Plate Armor', baseDef: 10 },
        { name: 'Enchanted Plate', baseDef: 15 },
        { name: 'Dragon Scale', baseDef: 22 },
      ],
      Accessory: [
        { name: 'Copper Ring', bonus: 2 },
        { name: 'Silver Amulet', bonus: 5 },
        { name: 'Gold Pendant', bonus: 8 },
        { name: 'Ruby Ring', bonus: 12 },
        { name: 'Dragon Heart', bonus: 18 },
      ],
      Consumable: [
        { name: 'Minor Potion', power: 20 },
        { name: 'Health Potion', power: 40 },
        { name: 'Greater Potion', power: 60 },
        { name: 'Superior Potion', power: 80 },
        { name: 'Elixir', power: 100 },
      ],
    };

    const itemTypes = ['Weapon', 'Armor', 'Accessory', 'Consumable'] as const;

    for (let i = 0; i < count; i++) {
      // Determine rarity using weighted random based on floor
      const weights = cfg.rarityWeights(floor);
      // Boss loot shifts weights toward rarer items
      if (isBossLoot) {
        weights[0] = Math.max(weights[0] - 20, 5);
        weights[2] += 10;
        weights[3] += 8;
        weights[4] += 5;
      }
      const rarityIdx = this.weightedRandom(weights);
      const rarity = rarities[rarityIdx];

      // Pick item type
      const type = this.rng.pick(itemTypes);
      const templates = itemTemplates[type];

      // Higher rarity = better base item
      const templateIdx = Math.min(rarityIdx, templates.length - 1);
      const template = templates[templateIdx];

      // Scale stats with floor
      const floorMultiplier = 1 + (floor - 1) * 0.15;
      const rarityMultiplier = 1 + rarityIdx * 0.2;

      const stats: Record<string, number> = {};
      if ('baseDmg' in template) {
        stats.damage = Math.round(template.baseDmg * floorMultiplier * rarityMultiplier);
      }
      if ('baseDef' in template) {
        stats.defense = Math.round(template.baseDef * floorMultiplier * rarityMultiplier);
      }
      if ('bonus' in template) {
        stats.bonus = Math.round(template.bonus * floorMultiplier * rarityMultiplier);
      }
      if ('power' in template) {
        stats.power = Math.round(template.power * floorMultiplier);
      }

      items.push({
        id: Date.now() + i + this.rng.between(0, 10000),
        name: template.name,
        rarity,
        type,
        stats,
        enchantments: [],
        durability: 100,
        killCount: 0,
        origin: { dungeonId: this.dungeonId, floor },
      });
    }
    return items;
  }

  private weightedRandom(weights: number[]): number {
    const total = weights.reduce((a, b) => a + b, 0);
    let random = this.rng.next() * total;
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) return i;
    }
    return weights.length - 1;
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
