import { NextRequest, NextResponse } from 'next/server';
import {
  Aptos,
  AptosConfig,
  Network,
  RawTransaction,
  Ed25519PublicKey,
  Ed25519Signature,
  Deserializer,
  AccountAuthenticatorEd25519,
  SimpleTransaction,
} from '@aptos-labs/ts-sdk';

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
    const { rawTxnHex, publicKey, signature } = body;

    if (!rawTxnHex || !publicKey || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: rawTxnHex, publicKey, signature' },
        { status: 400 }
      );
    }

    // Deserialize the raw transaction
    const rawTxnBytes = Buffer.from(rawTxnHex, 'hex');
    const rawTxn = RawTransaction.deserialize(new Deserializer(rawTxnBytes));

    // Create a SimpleTransaction from the RawTransaction
    const transaction = new SimpleTransaction(rawTxn);

    // Clean up signature and public key - remove 0x prefix if present
    const cleanSignature = signature.startsWith('0x') ? signature.slice(2) : signature;
    const cleanPublicKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;

    // Create Ed25519 public key and signature
    const pubKey = new Ed25519PublicKey(cleanPublicKey);
    const sig = new Ed25519Signature(cleanSignature);

    // Create the authenticator
    const senderAuthenticator = new AccountAuthenticatorEd25519(pubKey, sig);

    // Submit the transaction
    const response = await aptosClient.transaction.submit.simple({
      transaction,
      senderAuthenticator,
    });

    // Wait for transaction confirmation
    const result = await aptosClient.waitForTransaction({
      transactionHash: response.hash,
    });

    return NextResponse.json({
      hash: response.hash,
      success: result.success,
      vmStatus: result.vm_status,
    });
  } catch (error) {
    console.error('Error submitting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to submit transaction', details: String(error) },
      { status: 500 }
    );
  }
}
