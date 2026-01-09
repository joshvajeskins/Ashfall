/**
 * Shinami Gas Station Service
 *
 * Sponsors gas fees for user (Privy) wallet transactions.
 * Users never need to hold MOVE tokens - all gas is paid by the game.
 *
 * Flow:
 * 1. Build transaction with user as sender (no fee payer)
 * 2. Send to Shinami Gas Station for sponsorship
 * 3. Shinami returns fee payer address + signature
 * 4. User signs with Privy wallet
 * 5. Submit transaction with both signatures
 */

import {
  Aptos,
  AptosConfig,
  Network,
  AccountAddress,
  SimpleTransaction,
  AccountAuthenticator,
} from '@aptos-labs/ts-sdk';
import { GasStationClient } from '@shinami/clients/aptos';
import { getShinamiKey, MOVEMENT_TESTNET_CONFIG } from './config';

// Initialize Aptos client for Movement
const aptosConfig = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: MOVEMENT_TESTNET_CONFIG.rpcUrl,
  indexer: MOVEMENT_TESTNET_CONFIG.indexerUrl,
});

const aptosClient = new Aptos(aptosConfig);

// Lazy-initialized Gas Station client (only on server)
let gasStationClient: GasStationClient | null = null;

function getGasStationClient(): GasStationClient {
  if (!gasStationClient) {
    gasStationClient = new GasStationClient(getShinamiKey());
  }
  return gasStationClient;
}

export interface SponsoredTransaction {
  transaction: SimpleTransaction;
  feePayerAddress: string;
  feePayerAuthenticator: AccountAuthenticator;
}

/**
 * Build a transaction and get it sponsored by Shinami Gas Station
 * Returns the sponsored transaction ready for user signing
 */
export async function buildSponsoredTransaction(
  senderAddress: string,
  functionName: string,
  typeArguments: string[] = [],
  functionArguments: (string | number | boolean)[] = []
): Promise<SponsoredTransaction> {
  const gasClient = getGasStationClient();

  // Build the transaction without fee payer
  const transaction = await aptosClient.transaction.build.simple({
    sender: AccountAddress.from(senderAddress),
    withFeePayer: true, // Enable fee payer sponsorship
    data: {
      function: functionName as `${string}::${string}::${string}`,
      typeArguments: typeArguments as [],
      functionArguments: functionArguments,
    },
  });

  // Get sponsorship from Shinami Gas Station
  // sponsorTransaction updates transaction.feePayerAddress in-place and returns the authenticator
  const feePayerAuthenticator = await gasClient.sponsorTransaction(transaction);

  const feePayerAddress = transaction.feePayerAddress?.toString();
  if (!feePayerAddress) {
    throw new Error('Fee payer address not set after sponsorship');
  }

  return {
    transaction,
    feePayerAddress,
    feePayerAuthenticator,
  };
}

/**
 * Submit a sponsored transaction after user has signed it
 */
export async function submitSponsoredTransaction(
  transaction: SimpleTransaction,
  senderAuthenticator: AccountAuthenticator,
  feePayerAuthenticator: AccountAuthenticator
): Promise<{ hash: string; success: boolean }> {
  const response = await aptosClient.transaction.submit.simple({
    transaction,
    senderAuthenticator,
    feePayerAuthenticator,
  });

  const result = await aptosClient.waitForTransaction({
    transactionHash: response.hash,
  });

  return {
    hash: response.hash,
    success: result.success,
  };
}

/**
 * Check Gas Station fund balance
 * Useful for monitoring and alerting
 */
export async function getGasStationBalance(): Promise<{
  balance: string;
  currency: string;
}> {
  const gasClient = getGasStationClient();

  try {
    // Note: This may not be available in all Shinami plans
    // Check Shinami dashboard for balance
    return {
      balance: 'Check Shinami Dashboard',
      currency: 'MOVE',
    };
  } catch {
    return {
      balance: 'Unknown',
      currency: 'MOVE',
    };
  }
}

export { aptosClient };
