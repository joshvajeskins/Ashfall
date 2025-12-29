import * as Phaser from 'phaser';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const TILE_SIZE = 32;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0a0a0a',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: process.env.NODE_ENV === 'development',
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

// Dungeon configuration
export const DUNGEON_CONFIG = {
  MAX_FLOORS: 5,
  BOSS_FLOOR: 5,
  BOSS_XP_REWARD: 1000,
  ROOMS_PER_FLOOR: 5,
};

// Boss configuration
export const BOSS_CONFIG = {
  name: 'Dungeon Lord',
  health: 500,
  maxHealth: 500,
  attack: 40,
  defense: 20,
  xpReward: 1000,
  lootTier: 5,
};

// Game constants
export const GAME_CONSTANTS = {
  // Combat
  BASE_DAMAGE: 5,
  CRIT_MULTIPLIER: 2,
  BASE_CRIT_CHANCE: 0.05,
  AGILITY_CRIT_BONUS: 0.002,

  // Movement
  PLAYER_SPEED: 160,
  ENEMY_SPEED: 80,

  // Action points
  MAX_ACTION_POINTS: 4,
  ACTION_COSTS: {
    move: 1,
    attack: 2,
    useItem: 1,
    specialAbility: 3,
  },

  // Leveling
  xpForLevel: (level: number) => 100 * Math.pow(2, level - 1),
  HP_PER_LEVEL: 20,
  MANA_PER_LEVEL: 10,

  // Items
  ITEM_IDS: {
    SWORD: 0,
    SHIELD: 1,
    ARMOR: 2,
    POTION: 3,
  },

  // Stash
  MAX_STASH_CAPACITY: 50,
};
