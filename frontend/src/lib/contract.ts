/**
 * Ashfall Contract Configuration
 *
 * Single source of truth for the deployed contract address.
 * Update this value when deploying to a new address.
 */

export const CONTRACT_ADDRESS = '0x2b633f672b485166e89bb90903962d5ad26bbf70ce079ed484bae518d89d2dc5';

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
