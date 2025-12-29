import { config } from './index.js';

export const movementConfig = {
  network: 'testnet' as const,
  rpcUrl: config.movementRpcUrl,
  chainId: 177, // Movement testnet chain ID
  explorerUrl: 'https://explorer.movementnetwork.xyz',
};

export const moduleAddress = config.contractAddress;

export const modules = {
  hero: `${moduleAddress}::hero`,
  dungeon: `${moduleAddress}::dungeon`,
  items: `${moduleAddress}::items`,
  loot: `${moduleAddress}::loot`,
  stash: `${moduleAddress}::stash`,
  enemies: `${moduleAddress}::enemies`,
};
