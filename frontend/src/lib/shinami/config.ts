/**
 * Shinami Configuration
 *
 * Two services are used:
 * 1. Gas Station - Sponsors gas for user (Privy) wallet transactions
 * 2. Invisible Wallets - Server-controlled wallets for opponent/NPC actions
 */

// Movement Network Configuration (same as client.ts)
export const MOVEMENT_TESTNET_CONFIG = {
  name: 'Movement Testnet',
  chainId: 177,
  rpcUrl: 'https://testnet.movementnetwork.xyz/v1',
  indexerUrl: 'https://indexer.testnet.movementnetwork.xyz/v1/graphql',
};

// Shinami API Keys - Set these in your .env.local
// SHINAMI_GAS_STATION_KEY - For sponsoring user transactions
// SHINAMI_WALLET_SERVICES_KEY - For Invisible Wallets (server actions)

export function getShinamiGasKey(): string {
  const key = process.env.SHINAMI_GAS_STATION_KEY;
  if (!key) {
    throw new Error('SHINAMI_GAS_STATION_KEY environment variable not set');
  }
  return key;
}

export function getShinamiWalletKey(): string {
  const key = process.env.SHINAMI_WALLET_SERVICES_KEY;
  if (!key) {
    throw new Error('SHINAMI_WALLET_SERVICES_KEY environment variable not set');
  }
  return key;
}

// Server wallet secret generation
// In production, use a secure KMS or HSM
export function getServerWalletSecret(): string {
  const secret = process.env.SHINAMI_SERVER_WALLET_SECRET;
  if (!secret) {
    throw new Error('SHINAMI_SERVER_WALLET_SECRET environment variable not set');
  }
  return secret;
}

// Server wallet ID for game actions (opponent moves, loot drops, etc.)
export const SERVER_WALLET_ID = 'ashfall_game_server';
