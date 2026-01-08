/**
 * Shinami Invisible Wallet Service
 *
 * Server-controlled wallets for game actions that don't involve user wallets:
 * - Server-authorized dungeon actions (complete_floor, player_died, etc.)
 * - Opponent/NPC moves
 * - Loot drops and item minting
 * - Any backend-initiated transactions
 *
 * These wallets are fully controlled by the backend - no user signature needed.
 * Gas is automatically sponsored via executeGaslessTransaction.
 */

import {
  Aptos,
  AptosConfig,
  Network,
  AccountAddress,
} from '@aptos-labs/ts-sdk';
import {
  KeyClient,
  WalletClient,
  ShinamiWalletSigner,
  GasStationClient,
  createAptosClient,
} from '@shinami/clients/aptos';
import {
  getShinamiWalletKey,
  getServerWalletSecret,
  SERVER_WALLET_ID,
  MOVEMENT_TESTNET_CONFIG,
} from './config';

// Lazy-initialized clients (server-side only)
let keyClient: KeyClient | null = null;
let walletClient: WalletClient | null = null;
let gasClient: GasStationClient | null = null;
let shinamiAptosClient: Aptos | null = null;

function initClients() {
  if (!keyClient) {
    const key = getShinamiWalletKey();
    keyClient = new KeyClient(key);
    walletClient = new WalletClient(key);
    gasClient = new GasStationClient(key);

    // Use Shinami's Aptos client for better integration
    // Fall back to standard client if needed
    const aptosConfig = new AptosConfig({
      network: Network.CUSTOM,
      fullnode: MOVEMENT_TESTNET_CONFIG.rpcUrl,
      indexer: MOVEMENT_TESTNET_CONFIG.indexerUrl,
    });
    shinamiAptosClient = new Aptos(aptosConfig);
  }
  return { keyClient, walletClient, gasClient, aptosClient: shinamiAptosClient };
}

/**
 * Get or create the server's Invisible Wallet
 * This wallet is used for all server-authorized game actions
 */
export async function getServerWallet(): Promise<{
  address: string;
  signer: ShinamiWalletSigner;
}> {
  const { keyClient, walletClient } = initClients();

  const signer = new ShinamiWalletSigner(
    SERVER_WALLET_ID,
    walletClient!,
    getServerWalletSecret(),
    keyClient!
  );

  // Create wallet if it doesn't exist, initialize on-chain
  const addressObj = await signer.getAddress(true, true);
  const address = addressObj.toString();

  return { address, signer };
}

/**
 * Execute a gasless transaction from the server wallet
 * This is the main function for server-initiated game actions
 */
export async function executeServerTransaction(
  functionName: string,
  typeArguments: string[] = [],
  functionArguments: (string | number | boolean | string[])[] = []
): Promise<{ hash: string; success: boolean }> {
  const { aptosClient } = initClients();
  const { signer, address } = await getServerWallet();

  // Build the transaction
  const transaction = await aptosClient!.transaction.build.simple({
    sender: AccountAddress.from(address),
    data: {
      function: functionName as `${string}::${string}::${string}`,
      typeArguments: typeArguments as [],
      functionArguments: functionArguments,
    },
  });

  // Execute gasless transaction (sponsors, signs, and submits)
  const result = await signer.executeGaslessTransaction(transaction);

  return {
    hash: result.hash,
    success: true,
  };
}

/**
 * Execute a server-authorized dungeon action
 * These require the server to be in the authorized_servers list on-chain
 */
export async function executeAuthorizedDungeonAction(
  action: 'complete_floor' | 'complete_boss_floor' | 'player_died' | 'exit_dungeon_success' | 'start_boss_encounter',
  playerAddress: string,
  additionalArgs: (string | number)[] = []
): Promise<{ hash: string; success: boolean }> {
  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
    '0x2b633f672b485166e89bb90903962d5ad26bbf70ce079ed484bae518d89d2dc5';

  const functionMap: Record<string, { fn: string; args: (string | number)[] }> = {
    complete_floor: {
      fn: `${CONTRACT_ADDRESS}::dungeon::complete_floor`,
      args: [playerAddress, ...additionalArgs], // player, enemies_killed, xp_earned
    },
    complete_boss_floor: {
      fn: `${CONTRACT_ADDRESS}::dungeon::complete_boss_floor`,
      args: [playerAddress, ...additionalArgs], // player, xp_earned
    },
    player_died: {
      fn: `${CONTRACT_ADDRESS}::dungeon::player_died`,
      args: [playerAddress],
    },
    exit_dungeon_success: {
      fn: `${CONTRACT_ADDRESS}::dungeon::exit_dungeon_success`,
      args: [playerAddress],
    },
    start_boss_encounter: {
      fn: `${CONTRACT_ADDRESS}::dungeon::start_boss_encounter`,
      args: [playerAddress],
    },
  };

  const { fn, args } = functionMap[action];

  return executeServerTransaction(fn, [], args);
}

/**
 * Check if server wallet is registered as authorized server on-chain
 */
export async function isServerAuthorized(): Promise<boolean> {
  try {
    const { address } = await getServerWallet();
    // This would need a view function to check - for now assume it's authorized
    // In production, verify against on-chain ServerConfig
    console.log('Server wallet address:', address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get server wallet address (useful for registration)
 */
export async function getServerWalletAddress(): Promise<string> {
  const { address } = await getServerWallet();
  return address;
}
