'use client';

import { useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSignRawHash } from '@privy-io/react-auth/extended-chains';
import { getMovementWallet } from '@/lib/privy-movement';
import { aptosClient, MOVEMENT_TESTNET_CONFIG } from '@/lib/move/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface TransactionPayload {
  function: string;
  typeArguments: string[];
  functionArguments: (string | number | boolean)[];
}

interface TransactionResult {
  hash: string;
  success: boolean;
}

/**
 * Hook for submitting Movement transactions using Privy wallet
 * Uses a backend to generate transaction hash and submit signed transactions
 */
export function useMovementTransaction() {
  const { user, authenticated } = usePrivy();
  const { signRawHash } = useSignRawHash();

  const movementWallet = getMovementWallet(user);

  const signAndSubmitTransaction = useCallback(
    async (payload: TransactionPayload): Promise<TransactionResult> => {
      if (!authenticated || !movementWallet) {
        throw new Error('Wallet not connected');
      }

      // If backend API is configured, use the hash-sign-submit flow
      if (API_BASE_URL) {
        // Step 1: Generate transaction hash from backend
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

        // Step 2: Sign with Privy
        const { signature } = await signRawHash({
          address: movementWallet.address,
          chainType: 'aptos',
          hash,
        });

        // Step 3: Submit signed transaction
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
        };
      }

      // Fallback: Use simulation for local development
      console.warn('No API_BASE_URL configured, simulating transaction');

      // Try to simulate the transaction
      try {
        const result = await aptosClient.view({
          payload: {
            function: payload.function as `${string}::${string}::${string}`,
            typeArguments: payload.typeArguments as [],
            functionArguments: payload.functionArguments,
          },
        });
        console.log('Simulation result:', result);
      } catch (e) {
        console.log('Simulation skipped (entry function):', e);
      }

      // Return mock result for development
      return {
        hash: `0x${Date.now().toString(16)}`,
        success: true,
      };
    },
    [authenticated, movementWallet, signRawHash]
  );

  return {
    signAndSubmitTransaction,
    walletAddress: movementWallet?.address || null,
    isConnected: authenticated && !!movementWallet,
  };
}
