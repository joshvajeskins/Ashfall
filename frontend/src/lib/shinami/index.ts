/**
 * Shinami Integration Module (Server-side only)
 *
 * Uses single SHINAMI_KEY env var for all services:
 * 1. Gas Station - For sponsoring user (Privy) wallet transactions
 * 2. Invisible Wallet - For server-controlled game actions
 *
 * IMPORTANT: Only import this in /api routes, not client components
 */

// Gas Station exports - for user transactions
export {
  buildSponsoredTransaction,
  submitSponsoredTransaction,
  getGasStationBalance,
  aptosClient,
  type SponsoredTransaction,
} from './gasStation';

// Invisible Wallet exports - for server/opponent transactions
export {
  getServerWallet,
  executeServerTransaction,
  executeAuthorizedDungeonAction,
  isServerAuthorized,
  getServerWalletAddress,
} from './invisibleWallet';

// Config exports
export {
  MOVEMENT_TESTNET_CONFIG,
  SERVER_WALLET_ID,
  getShinamiKey,
} from './config';
