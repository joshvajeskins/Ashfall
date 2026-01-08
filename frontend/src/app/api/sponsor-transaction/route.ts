import { NextRequest, NextResponse } from 'next/server';
import {
  Aptos,
  AptosConfig,
  Network,
  AccountAddress,
  Serializer,
} from '@aptos-labs/ts-sdk';
import { GasStationClient } from '@shinami/clients/aptos';
import { sha3_256 } from '@noble/hashes/sha3.js';

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

    // Get Shinami Gas Station key
    const gasKey = process.env.SHINAMI_GAS_STATION_KEY;
    if (!gasKey) {
      // Fall back to non-sponsored transaction if no key
      console.warn('SHINAMI_GAS_STATION_KEY not set, falling back to standard tx');
      return buildStandardTransaction(sender, fnName, typeArguments, functionArguments);
    }

    const gasClient = new GasStationClient(gasKey);

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

    // Generate signing hash for the sender
    // For fee payer transactions: sha3_256(sha3_256("APTOS::RawTransactionWithData") || bcs(RawTransactionWithData))
    const prefixBytes = Buffer.from('APTOS::RawTransactionWithData', 'utf8');
    const prefixHash = sha3_256(prefixBytes);

    // Serialize RawTransactionWithData (includes fee payer info)
    const serializer = new Serializer();
    transaction.rawTransaction.serialize(serializer);
    // Add fee payer variant (1 = with fee payer)
    serializer.serializeU8(1);
    // Add fee payer address
    AccountAddress.from(feePayerAddress).serialize(serializer);

    const rawTxnWithDataBytes = serializer.toUint8Array();

    const messageToSign = new Uint8Array(prefixHash.length + rawTxnWithDataBytes.length);
    messageToSign.set(prefixHash);
    messageToSign.set(rawTxnWithDataBytes, prefixHash.length);

    const signingHash = sha3_256(messageToSign);
    const hashHex = Buffer.from(signingHash).toString('hex');

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

  const prefixBytes = Buffer.from('APTOS::RawTransaction', 'utf8');
  const prefixHash = sha3_256(prefixBytes);

  const messageToSign = new Uint8Array(prefixHash.length + rawTxnBytes.length);
  messageToSign.set(prefixHash);
  messageToSign.set(rawTxnBytes, prefixHash.length);

  const signingHash = sha3_256(messageToSign);
  const hashHex = Buffer.from(signingHash).toString('hex');

  return NextResponse.json({
    hash: `0x${hashHex}`,
    rawTxnHex,
    sender,
    sponsored: false,
  });
}
