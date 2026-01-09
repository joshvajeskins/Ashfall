import { NextRequest, NextResponse } from 'next/server';
import {
  Aptos,
  AptosConfig,
  Network,
  AccountAddress,
  Serializer,
  generateSigningMessageForTransaction,
} from '@aptos-labs/ts-sdk';
import { GasStationClient } from '@shinami/clients/aptos';

const MOVEMENT_TESTNET_CONFIG = {
  rpcUrl: 'https://testnet.movementnetwork.xyz/v1',
  indexerUrl: 'https://indexer.testnet.movementnetwork.xyz/v1/graphql',
};

const config = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: MOVEMENT_TESTNET_CONFIG.rpcUrl,
  indexer: MOVEMENT_TESTNET_CONFIG.indexerUrl,
});

const aptosClient = new Aptos(config);

/**
 * POST /api/sponsor-transaction
 *
 * Builds a transaction with fee payer sponsorship from Shinami Gas Station.
 * Returns the transaction data and signing hash for the user (Privy) wallet.
 *
 * Flow:
 * 1. Build transaction with withFeePayer=true
 * 2. Send to Shinami for sponsorship
 * 3. Return sponsored transaction + signing hash
 * 4. Frontend signs with Privy, then calls /api/submit-sponsored
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sender, function: fnName, typeArguments, functionArguments } = body;

    if (!sender || !fnName) {
      return NextResponse.json(
        { error: 'Missing required fields: sender, function' },
        { status: 400 }
      );
    }

    // Get Shinami key (server-side only)
    const shinamiKey = process.env.SHINAMI_KEY;
    if (!shinamiKey) {
      // Fall back to non-sponsored transaction if no key
      console.warn('SHINAMI_KEY not set, falling back to standard tx');
      return buildStandardTransaction(sender, fnName, typeArguments, functionArguments);
    }

    const gasClient = new GasStationClient(shinamiKey);

    // Build the transaction with fee payer enabled
    const transaction = await aptosClient.transaction.build.simple({
      sender: AccountAddress.from(sender),
      withFeePayer: true,
      data: {
        function: fnName as `${string}::${string}::${string}`,
        typeArguments: typeArguments || [],
        functionArguments: functionArguments || [],
      },
    });

    // Get sponsorship from Shinami Gas Station
    // This returns the feePayerAuthenticator and updates transaction.feePayerAddress in-place
    const feePayerAuthenticator = await gasClient.sponsorTransaction(transaction);

    // Get the fee payer address (set in-place by sponsorTransaction)
    const feePayerAddress = transaction.feePayerAddress?.toString();
    if (!feePayerAddress) {
      throw new Error('Fee payer address not set after sponsorship');
    }

    // Serialize the transaction for signing
    const rawTxn = transaction.rawTransaction;
    const rawTxnBytes = rawTxn.bcsToBytes();
    const rawTxnHex = Buffer.from(rawTxnBytes).toString('hex');

    // Generate signing message using SDK's built-in function
    // This properly handles fee payer transactions with correct domain separator
    const signingMessage = generateSigningMessageForTransaction(transaction);

    // Pass the signing message directly to Privy (hex-encoded, no hashing)
    // Privy signs the raw message bytes, Ed25519 handles internal hashing
    const hashHex = Buffer.from(signingMessage).toString('hex');

    // Serialize fee payer authenticator for later submission
    const feePayerAuthSerializer = new Serializer();
    feePayerAuthenticator.serialize(feePayerAuthSerializer);
    const feePayerAuthHex = Buffer.from(feePayerAuthSerializer.toUint8Array()).toString('hex');

    return NextResponse.json({
      hash: `0x${hashHex}`,
      rawTxnHex,
      sender,
      sponsored: true,
      feePayerAddress,
      feePayerAuthenticatorHex: feePayerAuthHex,
    });
  } catch (error) {
    console.error('Error building sponsored transaction:', error);
    return NextResponse.json(
      { error: 'Failed to build sponsored transaction', details: String(error) },
      { status: 500 }
    );
  }
}

// Fallback to standard transaction if Shinami is not configured
async function buildStandardTransaction(
  sender: string,
  fnName: string,
  typeArguments: string[] | undefined,
  functionArguments: (string | number | boolean)[] | undefined
) {
  const transaction = await aptosClient.transaction.build.simple({
    sender: AccountAddress.from(sender),
    data: {
      function: fnName as `${string}::${string}::${string}`,
      typeArguments: typeArguments || [],
      functionArguments: functionArguments || [],
    },
  });

  const rawTxn = transaction.rawTransaction;
  const rawTxnBytes = rawTxn.bcsToBytes();
  const rawTxnHex = Buffer.from(rawTxnBytes).toString('hex');

  // Use SDK's built-in function for consistent signing message generation
  // Pass the signing message directly to Privy (hex-encoded, no hashing)
  const signingMessage = generateSigningMessageForTransaction(transaction);
  const hashHex = Buffer.from(signingMessage).toString('hex');

  return NextResponse.json({
    hash: `0x${hashHex}`,
    rawTxnHex,
    sender,
    sponsored: false,
  });
}
