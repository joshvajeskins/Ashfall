'use client';

import { useState, useCallback } from 'react';
import { useMovementTransaction } from './useMovementTransaction';
import { useTransactionStore, waitForTransaction } from '@/stores/transactionStore';
import { CONTRACT_ADDRESS } from '@/lib/move/client';
import type { CharacterClass } from '@/types';
import { CLASS_STATS } from './useCharacter';

interface UseCreateCharacterResult {
  createCharacter: (characterClass: CharacterClass) => Promise<boolean>;
  replaceCharacter: (characterClass: CharacterClass) => Promise<boolean>;
  deleteCharacter: () => Promise<boolean>;
  isCreating: boolean;
  isDeleting: boolean;
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
  const { addPendingTransaction, confirmTransaction, failTransaction, removeTransaction } =
    useTransactionStore();
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTransaction = (action: string, txHash: string) => {
    const id = addPendingTransaction(action, txHash);
    waitForTransaction(txHash).then((success) => {
      if (success) {
        confirmTransaction(id);
        setTimeout(() => removeTransaction(id), 4000);
      } else {
        failTransaction(id);
        setTimeout(() => removeTransaction(id), 6000);
      }
    });
    return id;
  };

  const createCharacter = useCallback(
    async (characterClass: CharacterClass): Promise<boolean> => {
      if (!isConnected) {
        setError('Wallet not connected');
        return false;
      }

      setIsCreating(true);
      setError(null);

      try {
        const payload = {
          function: `${CONTRACT_ADDRESS}::hero::create_character`,
          typeArguments: [],
          functionArguments: [CLASS_TO_ENUM[characterClass]],
        };

        console.log('Creating character with payload:', payload);
        console.log('Class stats:', CLASS_STATS[characterClass]);

        const result = await signAndSubmitTransaction(payload);
        console.log('Transaction result:', result);

        if (result.success) {
          addTransaction(`Created ${characterClass}`, result.hash);
        }

        return result.success;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create character';
        setError(errorMessage);
        console.warn('Error creating character:', err);
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    [isConnected, signAndSubmitTransaction, addTransaction]
  );

  const replaceCharacter = useCallback(
    async (characterClass: CharacterClass): Promise<boolean> => {
      if (!isConnected) {
        setError('Wallet not connected');
        return false;
      }

      setIsCreating(true);
      setError(null);

      try {
        const payload = {
          function: `${CONTRACT_ADDRESS}::hero::replace_character`,
          typeArguments: [],
          functionArguments: [CLASS_TO_ENUM[characterClass]],
        };

        console.log('Replacing character with payload:', payload);

        const result = await signAndSubmitTransaction(payload);
        console.log('Replace transaction result:', result);

        if (result.success) {
          addTransaction(`Replaced ${characterClass}`, result.hash);
        }

        return result.success;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to replace character';
        setError(errorMessage);
        console.warn('Error replacing character:', err);
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    [isConnected, signAndSubmitTransaction, addTransaction]
  );

  const deleteCharacter = useCallback(async (): Promise<boolean> => {
    if (!isConnected) {
      setError('Wallet not connected');
      return false;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const payload = {
        function: `${CONTRACT_ADDRESS}::hero::delete_character`,
        typeArguments: [],
        functionArguments: [],
      };

      console.log('Deleting character');
      const result = await signAndSubmitTransaction(payload);
      console.log('Delete transaction result:', result);

      if (result.success) {
        addTransaction('Character Deleted', result.hash);
      }

      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete character';
      setError(errorMessage);
      console.warn('Error deleting character:', err);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [isConnected, signAndSubmitTransaction, addTransaction]);

  return {
    createCharacter,
    replaceCharacter,
    deleteCharacter,
    isCreating,
    isDeleting,
    error,
  };
}
