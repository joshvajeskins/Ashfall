import {
  Aptos,
  AptosConfig,
  Network,
  type InputViewFunctionData,
} from '@aptos-labs/ts-sdk';

// Movement Network Configuration
const MOVEMENT_TESTNET_CONFIG = {
  name: 'Movement Testnet',
  chainId: 177,
  rpcUrl: 'https://testnet.movementnetwork.xyz/v1',
  indexerUrl: 'https://indexer.testnet.movementnetwork.xyz/v1/graphql',
};

// Contract address
const CONTRACT_ADDRESS = '0x2b633f672b485166e89bb90903962d5ad26bbf70ce079ed484bae518d89d2dc5';

// Initialize Aptos client for Movement
const config = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: MOVEMENT_TESTNET_CONFIG.rpcUrl,
  indexer: MOVEMENT_TESTNET_CONFIG.indexerUrl,
});

export const aptosClient = new Aptos(config);

// Module names
const MODULES = {
  hero: `${CONTRACT_ADDRESS}::hero`,
  enemies: `${CONTRACT_ADDRESS}::enemies`,
  items: `${CONTRACT_ADDRESS}::items`,
  dungeon: `${CONTRACT_ADDRESS}::dungeon`,
  loot: `${CONTRACT_ADDRESS}::loot`,
  stash: `${CONTRACT_ADDRESS}::stash`,
};

// View function helper
export async function view<T>(
  module: string,
  functionName: string,
  typeArgs: InputViewFunctionData['typeArguments'] = [],
  args: InputViewFunctionData['functionArguments'] = []
): Promise<T> {
  const result = await aptosClient.view({
    payload: {
      function: `${module}::${functionName}` as `${string}::${string}::${string}`,
      typeArguments: typeArgs,
      functionArguments: args,
    },
  });
  return result as T;
}

// Hero module functions
export const heroService = {
  characterExists: async (address: string) => {
    return view<[boolean]>(MODULES.hero, 'character_exists', [], [address]);
  },

  getCharacterStats: async (address: string) => {
    // Returns: (level, exp, health, max_health, mana, max_mana, current_floor, is_alive)
    return view<[number, number, number, number, number, number, number, boolean]>(
      MODULES.hero, 'get_character_stats', [], [address]
    );
  },

  getBaseStats: async (address: string) => {
    // Returns: (strength, agility, intelligence)
    return view<[number, number, number]>(MODULES.hero, 'get_base_stats', [], [address]);
  },

  getCharacterClass: async (address: string) => {
    // Returns: u8 (0=Warrior, 1=Rogue, 2=Mage)
    return view<[number]>(MODULES.hero, 'get_character_class', [], [address]);
  },

  getEquipmentIds: async (address: string) => {
    // Returns: (weapon_id, armor_id, accessory_id)
    return view<[number, number, number]>(MODULES.hero, 'get_equipment_ids', [], [address]);
  },

  hasWeaponEquipped: async (address: string) => {
    return view<[boolean]>(MODULES.hero, 'has_weapon_equipped', [], [address]);
  },

  hasArmorEquipped: async (address: string) => {
    return view<[boolean]>(MODULES.hero, 'has_armor_equipped', [], [address]);
  },

  isCharacterAlive: async (address: string) => {
    return view<[boolean]>(MODULES.hero, 'is_character_alive', [], [address]);
  },

  isPlayerInDungeon: async (address: string) => {
    return view<[boolean]>(MODULES.hero, 'is_player_in_dungeon', [], [address]);
  },
};

// Dungeon module functions
export const dungeonService = {
  isInDungeon: async (address: string) => {
    return view<[boolean]>(MODULES.dungeon, 'is_in_dungeon', [], [address]);
  },

  getCurrentFloor: async (address: string) => {
    return view<[number]>(MODULES.dungeon, 'get_current_floor', [], [address]);
  },

  getRunStats: async (address: string) => {
    // Returns: (dungeon_id, current_floor, enemies_killed, rooms_cleared)
    return view<[number, number, number, number]>(MODULES.dungeon, 'get_run_stats', [], [address]);
  },

  getPendingLootCounts: async (address: string) => {
    // Returns: (weapons, armors, accessories, gold)
    return view<[number, number, number, number]>(MODULES.dungeon, 'get_pending_loot_counts', [], [address]);
  },

  isOnBossFloor: async (address: string) => {
    return view<[boolean]>(MODULES.dungeon, 'is_on_boss_floor', [], [address]);
  },
};

// Stash module functions
export const stashService = {
  stashExists: async (address: string) => {
    return view<[boolean]>(MODULES.stash, 'stash_exists', [], [address]);
  },

  getStashCounts: async (address: string) => {
    // Returns: (weapons, armors, accessories, consumables, gold)
    return view<[number, number, number, number, number]>(MODULES.stash, 'get_stash_counts', [], [address]);
  },

  getTotalStashItems: async (address: string) => {
    return view<[number]>(MODULES.stash, 'get_total_stash_items', [], [address]);
  },

  getStashCapacityRemaining: async (address: string) => {
    return view<[number]>(MODULES.stash, 'get_stash_capacity_remaining', [], [address]);
  },

  getGold: async (address: string) => {
    return view<[number]>(MODULES.stash, 'get_gold', [], [address]);
  },

  hasCapacityFor: async (address: string, count: number) => {
    return view<[boolean]>(MODULES.stash, 'has_capacity_for', [], [address, count]);
  },
};

export { MOVEMENT_TESTNET_CONFIG, CONTRACT_ADDRESS, MODULES };
