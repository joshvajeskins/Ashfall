/**
 * Ashfall Contract Configuration
 *
 * Single source of truth for the deployed contract address.
 * Update this value when deploying to a new address.
 */

export const CONTRACT_ADDRESS = '0xf913a8d36a166d9a048b11eeaf902f71bdfba8c8931c351800b145f365f36c8e';

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
