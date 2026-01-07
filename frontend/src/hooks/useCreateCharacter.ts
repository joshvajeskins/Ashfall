'use client';

import { useState, useCallback } from 'react';
import { useMovementTransaction } from './useMovementTransaction';
import { CONTRACT_ADDRESS } from '@/lib/move/client';
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
  const { signAndSubmitTransaction, isConnected } = useMovementTransaction();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCharacter = useCallback(
    async (characterClass: CharacterClass): Promise<boolean> => {
      if (!isConnected) {
        setError('Wallet not connected');
        return false;
      }

      setIsCreating(true);
      setError(null);

      try {
        // Build the transaction payload
        const payload = {
          function: `${CONTRACT_ADDRESS}::hero::initialize_player`,
          typeArguments: [],
          functionArguments: [CLASS_TO_ENUM[characterClass]],
        };

        console.log('Creating character with payload:', payload);
        console.log('Class stats:', CLASS_STATS[characterClass]);

        // Submit the transaction using Privy wallet
        const result = await signAndSubmitTransaction(payload);

        console.log('Transaction result:', result);

        return result.success;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create character';
        setError(errorMessage);
        console.error('Error creating character:', err);
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    [isConnected, signAndSubmitTransaction]
  );

  return {
    createCharacter,
    isCreating,
    error,
  };
}
