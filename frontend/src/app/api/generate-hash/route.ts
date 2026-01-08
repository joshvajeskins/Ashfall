import { NextRequest, NextResponse } from 'next/server';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { sha3_256 } from '@noble/hashes/sha3';

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

    // Build the transaction using the Aptos client
    const transaction = await aptosClient.transaction.build.simple({
      sender,
      data: {
        function: fnName as `${string}::${string}::${string}`,
        typeArguments: typeArguments || [],
        functionArguments: functionArguments || [],
      },
    });

    // Get the raw transaction
    const rawTxn = transaction.rawTransaction;
    const rawTxnBytes = rawTxn.bcsToBytes();
    const rawTxnHex = Buffer.from(rawTxnBytes).toString('hex');

    // Generate signing hash using Aptos signing scheme
    // The hash is SHA3-256 of: sha3_256("APTOS::RawTransaction") || bcs(rawTxn)
    const prefixBytes = Buffer.from('APTOS::RawTransaction', 'utf8');
    const prefixHash = sha3_256(prefixBytes);

    const messageToSign = new Uint8Array(prefixHash.length + rawTxnBytes.length);
    messageToSign.set(prefixHash);
    messageToSign.set(rawTxnBytes, prefixHash.length);

    const signingHash = sha3_256(messageToSign);
    const hashHex = Buffer.from(signingHash).toString('hex');

    return NextResponse.json({
      hash: hashHex,
      rawTxnHex,
      sender,
    });
  } catch (error) {
    console.error('Error generating transaction hash:', error);
    return NextResponse.json(
      { error: 'Failed to generate transaction hash', details: String(error) },
      { status: 500 }
    );
  }
}
