// Game Types for Ashfall

export type CharacterClass = 'Warrior' | 'Rogue' | 'Mage';
export type ItemRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
export type ItemType = 'Weapon' | 'Armor' | 'Accessory' | 'Consumable';

export interface CharacterStats {
  strength: number;
  agility: number;
  intelligence: number;
}

export interface ItemStats {
  damage?: number;
  defense?: number;
  health?: number;
  mana?: number;
}

export interface Enchantment {
  id: number;
  name: string;
  effect: string;
}

export interface ItemOrigin {
  dungeonId: number;
  floor: number;
}

export interface Item {
  id: number;
  name: string;
  rarity: ItemRarity;
  type: ItemType;
  stats: ItemStats;
  enchantments: Enchantment[];
  durability: number;
  killCount: number;
  origin?: ItemOrigin;
  isEquipped?: boolean;
}

export interface Equipment {
  weapon?: Item;
  armor?: Item;
  accessory?: Item;
}

export interface Character {
  id: number;
  owner: string;
  class: CharacterClass;
  level: number;
  experience: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  stats: CharacterStats;
  equipment: Equipment;
  isAlive: boolean;
}

export interface DungeonRun {
  dungeonId: number;
  currentFloor: number;
  roomsCleared: number;
  enemiesKilled: number;
  itemsFound: Item[];
  startedAt: number;
}

export interface Enemy {
  id: number;
  name: string;
  health: number;
  maxHealth: number;
  damage?: number;
  attack?: number;
  defense: number;
  experienceReward?: number;
  xpReward?: number;
  lootTier?: number;
  isBoss?: boolean;
}

// Dungeon Types
export type RoomType = 'combat' | 'treasure' | 'rest' | 'boss' | 'start';

export interface RoomConnection {
  direction: 'north' | 'south' | 'east' | 'west';
  targetRoomId: number;
}

export interface Room {
  id: number;
  type: RoomType;
  x: number;
  y: number;
  width: number;
  height: number;
  enemies: Enemy[];
  loot: Item[];
  cleared: boolean;
  connections: RoomConnection[];
}

export interface FloorLayout {
  floorNumber: number;
  rooms: Room[];
  startRoomId: number;
  exitRoomId: number;
}

export interface DungeonLayout {
  dungeonId: number;
  floors: FloorLayout[];
  seed: number;
}
