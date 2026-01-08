'use client';

import { useCallback, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSignRawHash } from '@privy-io/react-auth/extended-chains';
import { getMovementWallet } from '@/lib/privy-movement';

// API routes are in the same Next.js app, use relative paths by default
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

interface TransactionPayload {
  function: string;
  typeArguments: string[];
  functionArguments: (string | number | boolean)[];
}

interface TransactionResult {
  hash: string;
  success: boolean;
  sponsored?: boolean;
}

/**
 * Hook for submitting Movement transactions using Privy wallet
 * Supports gas sponsorship via Shinami Gas Station
 *
 * Flow:
 * 1. Build transaction + get Shinami sponsorship (if available)
 * 2. Sign with Privy embedded wallet
 * 3. Submit with both sender + fee payer signatures
 */
export function useMovementTransaction() {
  const { user, authenticated } = usePrivy();
  const { signRawHash } = useSignRawHash();
  const [isSponsored, setIsSponsored] = useState<boolean | null>(null);

  const movementWallet = getMovementWallet(user);

  const signAndSubmitTransaction = useCallback(
    async (payload: TransactionPayload): Promise<TransactionResult> => {
      if (!authenticated || !movementWallet) {
        throw new Error('Wallet not connected');
      }

      // Step 1: Build transaction with sponsorship (or fall back to standard)
      const buildResponse = await fetch(`${API_BASE_URL}/api/sponsor-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: movementWallet.address,
          function: payload.function,
          typeArguments: payload.typeArguments,
          functionArguments: payload.functionArguments,
        }),
      });

      if (!buildResponse.ok) {
        // Fall back to legacy endpoint if sponsor endpoint doesn't exist
        return signAndSubmitLegacy(payload);
      }

      const buildResult = await buildResponse.json();
      const { hash, rawTxnHex, sponsored, feePayerAddress, feePayerAuthenticatorHex } = buildResult;

      setIsSponsored(sponsored);

      // Step 2: Sign with Privy embedded wallet
      const { signature } = await signRawHash({
        address: movementWallet.address,
        chainType: 'aptos',
        hash,
      });

      // Step 3: Submit transaction (sponsored or standard)
      const submitResponse = await fetch(`${API_BASE_URL}/api/submit-sponsored`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawTxnHex,
          publicKey: movementWallet.publicKey,
          signature,
          feePayerAddress,
          feePayerAuthenticatorHex,
        }),
      });

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit transaction');
      }

      const result = await submitResponse.json();
      return {
        hash: result.hash,
        success: result.success ?? true,
        sponsored: result.sponsored,
      };
    },
    [authenticated, movementWallet, signRawHash]
  );

  // Legacy flow for backward compatibility
  const signAndSubmitLegacy = useCallback(
    async (payload: TransactionPayload): Promise<TransactionResult> => {
      if (!movementWallet) {
        throw new Error('Wallet not connected');
      }

      const hashResponse = await fetch(`${API_BASE_URL}/api/generate-hash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: movementWallet.address,
          function: payload.function,
          typeArguments: payload.typeArguments,
          functionArguments: payload.functionArguments,
        }),
      });

      if (!hashResponse.ok) {
        throw new Error('Failed to generate transaction hash');
      }

      const { hash, rawTxnHex } = await hashResponse.json();

      const { signature } = await signRawHash({
        address: movementWallet.address,
        chainType: 'aptos',
        hash,
      });

      const submitResponse = await fetch(`${API_BASE_URL}/api/submit-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawTxnHex,
          publicKey: movementWallet.publicKey,
          signature,
        }),
      });

      if (!submitResponse.ok) {
        throw new Error('Failed to submit transaction');
      }

      const result = await submitResponse.json();
      return {
        hash: result.hash,
        success: result.success ?? true,
        sponsored: false,
      };
    },
    [movementWallet, signRawHash]
  );

  return {
    signAndSubmitTransaction,
    walletAddress: movementWallet?.address || null,
    isConnected: authenticated && !!movementWallet,
    isSponsored,
  };
}
