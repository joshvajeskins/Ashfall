/**
 * Shinami Configuration (Server-side only)
 *
 * Uses a single SHINAMI_KEY for all services:
 * 1. Gas Station - Sponsors gas for user (Privy) wallet transactions
 * 2. Invisible Wallets - Server-controlled wallets for opponent/NPC actions
 *
 * IMPORTANT: SHINAMI_KEY is server-side only (no NEXT_PUBLIC_ prefix)
 * Only use in /api routes, never in client components
 */

// Movement Network Configuration (same as client.ts)
export const MOVEMENT_TESTNET_CONFIG = {
  name: 'Movement Testnet',
  chainId: 177,
  rpcUrl: 'https://testnet.movementnetwork.xyz/v1',
  indexerUrl: 'https://hasura.testnet.movementnetwork.xyz/v1/graphql',
};

/**
 * Get the Shinami API key (server-side only)
 * Used for both Gas Station and Wallet Services
 */
export function getShinamiKey(): string {
  const key = process.env.SHINAMI_KEY;
  if (!key) {
    throw new Error('SHINAMI_KEY environment variable not set');
  }
  return key;
}

// Server wallet secret for Invisible Wallet
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
