/**
 * Ashfall Contract Configuration
 *
 * Single source of truth for the deployed contract address.
 * Update this value when deploying to a new address.
 */

export const CONTRACT_ADDRESS = '0xaf6509a4df30480896f87d0b2b75bb7f698bbd95d3e22609edf158bf0b1e0f58';

// Module names for building function identifiers
export const MODULES = {
  hero: `${CONTRACT_ADDRESS}::hero`,
  combat: `${CONTRACT_ADDRESS}::combat`,
  dungeon: `${CONTRACT_ADDRESS}::dungeon`,
  loot: `${CONTRACT_ADDRESS}::loot`,
  stash: `${CONTRACT_ADDRESS}::stash`,
  items: `${CONTRACT_ADDRESS}::items`,
  enemies: `${CONTRACT_ADDRESS}::enemies`,
} as const;
