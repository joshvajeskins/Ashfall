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

// Contract address - update after deployment
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x1';

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
  getPlayer: async (address: string) => {
    return view(MODULES.hero, 'get_player', [], [address]);
  },

  getInventory: async (address: string) => {
    return view(MODULES.hero, 'get_inventory', [], [address]);
  },

  getEquipment: async (address: string) => {
    return view(MODULES.hero, 'get_equipment', [], [address]);
  },
};

// Dungeon module functions
export const dungeonService = {
  getCurrentRun: async (address: string) => {
    return view(MODULES.dungeon, 'get_current_run', [], [address]);
  },

  isInDungeon: async (address: string) => {
    return view<[boolean]>(MODULES.dungeon, 'is_in_dungeon', [], [address]);
  },
};

// Stash module functions
export const stashService = {
  getStash: async (address: string) => {
    return view(MODULES.stash, 'get_stash', [], [address]);
  },

  getStashCapacity: async (address: string) => {
    return view<[number]>(MODULES.stash, 'get_capacity', [], [address]);
  },
};

export { MOVEMENT_TESTNET_CONFIG, CONTRACT_ADDRESS, MODULES };
