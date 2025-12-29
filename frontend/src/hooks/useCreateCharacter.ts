'use client';

import { useState, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { aptosClient, CONTRACT_ADDRESS } from '@/lib/move/client';
import type { CharacterClass } from '@/types';
import { CLASS_STATS } from './useCharacter';

interface UseCreateCharacterResult {
  createCharacter: (characterClass: CharacterClass) => Promise<boolean>;
  isCreating: boolean;
  error: string | null;
}

// Map class to on-chain enum value
const CLASS_TO_ENUM: Record<CharacterClass, number> = {
  Warrior: 0,
  Rogue: 1,
  Mage: 2,
};

export function useCreateCharacter(): UseCreateCharacterResult {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCharacter = useCallback(
    async (characterClass: CharacterClass): Promise<boolean> => {
      if (!authenticated || wallets.length === 0) {
        setError('Wallet not connected');
        return false;
      }

      setIsCreating(true);
      setError(null);

      try {
        const wallet = wallets[0];
        const address = wallet.address;

        // Build the transaction payload
        const payload = {
          function: `${CONTRACT_ADDRESS}::hero::initialize_player` as `${string}::${string}::${string}`,
          typeArguments: [],
          functionArguments: [CLASS_TO_ENUM[characterClass]],
        };

        // For now, we'll simulate success since actual signing requires wallet adapter
        // In production, this would use the wallet's signAndSubmitTransaction
        console.log('Creating character with payload:', payload);
        console.log('Class stats:', CLASS_STATS[characterClass]);

        // TODO: Replace with actual transaction submission
        // const txResponse = await signAndSubmitTransaction(payload);
        // await aptosClient.waitForTransaction({ transactionHash: txResponse.hash });

        // Simulate transaction for development
        await new Promise((resolve) => setTimeout(resolve, 1500));

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create character';
        setError(errorMessage);
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    [authenticated, wallets]
  );

  return {
    createCharacter,
    isCreating,
    error,
  };
}
