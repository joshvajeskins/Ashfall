/**
 * Ashfall Contract Configuration
 *
 * Single source of truth for the deployed contract address.
 * Update this value when deploying to a new address.
 */

export const CONTRACT_ADDRESS = '0x7e776761849d04762cd5c9a0edf1a27ca8516374580688d29e178cd321eeb152';

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
