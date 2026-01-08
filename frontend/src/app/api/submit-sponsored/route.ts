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
  AccountAuthenticator,
  SimpleTransaction,
  AccountAddress,
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

/**
 * POST /api/submit-sponsored
 *
 * Submits a sponsored transaction with both sender and fee payer signatures.
 * Called after user signs with Privy wallet.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      rawTxnHex,
      publicKey,
      signature,
      feePayerAddress,
      feePayerAuthenticatorHex,
    } = body;

    // Validate required fields
    if (!rawTxnHex || !publicKey || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: rawTxnHex, publicKey, signature' },
        { status: 400 }
      );
    }

    // If not sponsored, fall back to standard submission
    if (!feePayerAddress || !feePayerAuthenticatorHex) {
      return submitStandardTransaction(rawTxnHex, publicKey, signature);
    }

    // Deserialize the raw transaction
    const rawTxnBytes = Buffer.from(rawTxnHex, 'hex');
    const rawTxn = RawTransaction.deserialize(new Deserializer(rawTxnBytes));

    // Create SimpleTransaction with fee payer
    const transaction = new SimpleTransaction(rawTxn, AccountAddress.from(feePayerAddress));

    // Clean up signature and public key
    let cleanSignature = signature.startsWith('0x') ? signature.slice(2) : signature;
    let cleanPublicKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;

    // Handle Ed25519 scheme prefix if present
    if (cleanPublicKey.length === 66) {
      cleanPublicKey = cleanPublicKey.slice(2);
    }
    if (cleanSignature.length === 130) {
      cleanSignature = cleanSignature.slice(2);
    }

    // Create sender authenticator
    const pubKey = new Ed25519PublicKey(cleanPublicKey);
    const sig = new Ed25519Signature(cleanSignature);
    const senderAuthenticator = new AccountAuthenticatorEd25519(pubKey, sig);

    // Deserialize fee payer authenticator
    const feePayerAuthBytes = Buffer.from(feePayerAuthenticatorHex, 'hex');
    const feePayerAuthenticator = AccountAuthenticator.deserialize(
      new Deserializer(feePayerAuthBytes)
    );

    // Submit the sponsored transaction
    const response = await aptosClient.transaction.submit.simple({
      transaction,
      senderAuthenticator,
      feePayerAuthenticator,
    });

    // Wait for confirmation
    const result = await aptosClient.waitForTransaction({
      transactionHash: response.hash,
    });

    return NextResponse.json({
      hash: response.hash,
      success: result.success,
      vmStatus: result.vm_status,
      sponsored: true,
    });
  } catch (error) {
    console.error('Error submitting sponsored transaction:', error);
    return NextResponse.json(
      { error: 'Failed to submit sponsored transaction', details: String(error) },
      { status: 500 }
    );
  }
}

// Standard transaction submission (no sponsorship)
async function submitStandardTransaction(
  rawTxnHex: string,
  publicKey: string,
  signature: string
) {
  const rawTxnBytes = Buffer.from(rawTxnHex, 'hex');
  const rawTxn = RawTransaction.deserialize(new Deserializer(rawTxnBytes));
  const transaction = new SimpleTransaction(rawTxn);

  let cleanSignature = signature.startsWith('0x') ? signature.slice(2) : signature;
  let cleanPublicKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;

  if (cleanPublicKey.length === 66) {
    cleanPublicKey = cleanPublicKey.slice(2);
  }
  if (cleanSignature.length === 130) {
    cleanSignature = cleanSignature.slice(2);
  }

  const pubKey = new Ed25519PublicKey(cleanPublicKey);
  const sig = new Ed25519Signature(cleanSignature);
  const senderAuthenticator = new AccountAuthenticatorEd25519(pubKey, sig);

  const response = await aptosClient.transaction.submit.simple({
    transaction,
    senderAuthenticator,
  });

  const result = await aptosClient.waitForTransaction({
    transactionHash: response.hash,
  });

  return NextResponse.json({
    hash: response.hash,
    success: result.success,
    vmStatus: result.vm_status,
    sponsored: false,
  });
}
