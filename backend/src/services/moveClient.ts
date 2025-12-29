import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Ed25519PrivateKey,
  InputEntryFunctionData,
  AccountAddress,
  InputViewFunctionData,
  MoveValue,
} from '@aptos-labs/ts-sdk';
import { config } from '../config/index.js';
import { movementConfig } from '../config/movement.js';
import { TransactionResult } from '../types/index.js';

let aptosClient: Aptos | null = null;
let serverAccount: Account | null = null;

export function initMoveClient(): void {
  const aptosConfig = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: movementConfig.rpcUrl,
  });

  aptosClient = new Aptos(aptosConfig);

  if (config.serverPrivateKey) {
    try {
      const privateKey = new Ed25519PrivateKey(config.serverPrivateKey);
      serverAccount = Account.fromPrivateKey({ privateKey });
      console.log(`Server account initialized: ${serverAccount.accountAddress.toString()}`);
    } catch (error) {
      console.error('Failed to initialize server account:', error);
    }
  }
}

export function getClient(): Aptos {
  if (!aptosClient) {
    throw new Error('Aptos client not initialized. Call initMoveClient first.');
  }
  return aptosClient;
}

export function getServerAccount(): Account {
  if (!serverAccount) {
    throw new Error('Server account not initialized. Check SERVER_PRIVATE_KEY.');
  }
  return serverAccount;
}

export function isServerConfigured(): boolean {
  return serverAccount !== null;
}

export async function submitTransaction(
  functionId: string,
  typeArguments: string[] = [],
  functionArguments: (string | number | boolean | AccountAddress)[] = []
): Promise<TransactionResult> {
  try {
    const client = getClient();
    const account = getServerAccount();

    const payload: InputEntryFunctionData = {
      function: functionId as `${string}::${string}::${string}`,
      typeArguments,
      functionArguments,
    };

    const transaction = await client.transaction.build.simple({
      sender: account.accountAddress,
      data: payload,
    });

    const signedTx = await client.transaction.sign({
      signer: account,
      transaction,
    });

    const pendingTx = await client.transaction.submit.simple({
      transaction,
      senderAuthenticator: signedTx,
    });

    const result = await client.waitForTransaction({
      transactionHash: pendingTx.hash,
    });

    return {
      success: result.success,
      txHash: pendingTx.hash,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Transaction failed:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function viewFunction(
  functionId: string,
  typeArguments: string[] = [],
  functionArguments: (string | number | boolean)[] = []
): Promise<MoveValue[]> {
  const client = getClient();

  const payload: InputViewFunctionData = {
    function: functionId as `${string}::${string}::${string}`,
    typeArguments,
    functionArguments,
  };

  return client.view({ payload });
}
