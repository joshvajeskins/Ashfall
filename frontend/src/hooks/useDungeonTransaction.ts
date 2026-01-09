'use client';

import { useCallback, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSignRawHash } from '@privy-io/react-auth/extended-chains';
import { getMovementWallet } from '@/lib/privy-movement';
import { MODULES } from '@/lib/contract';
import { useTransactionStore, waitForTransaction } from '@/stores/transactionStore';
import { useGameStore } from '@/stores/gameStore';
import {
  exitDungeonSuccess,
  completeBossFloor,
  completeFloor,
  reportPlayerDeath,
  transferFloorLoot,
} from '@/lib/move/dungeonService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface DungeonResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Hook for handling on-chain dungeon transactions
 *
 * Flow:
 * - enterDungeon: User wallet signs (gas sponsored)
 * - completeFloor/completeBoss/playerDied/exitSuccess: Server wallet (invisible)
 */
export function useDungeonTransaction() {
  const { user, authenticated } = usePrivy();
  const { signRawHash } = useSignRawHash();
  const [isPending, setIsPending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const {
    addSubmittingTransaction,
    updateTransactionHash,
    confirmTransaction,
    failTransaction,
    removeTransaction,
  } = useTransactionStore();
  const { updateCharacter } = useGameStore();

  // Show notification immediately, then update with txHash when available
  const startTransaction = (action: string) => {
    return addSubmittingTransaction(action);
  };

  // Update notification with txHash and start polling for confirmation
  const completeTransaction = (id: string, txHash: string) => {
    updateTransactionHash(id, txHash);
    waitForTransaction(txHash).then((success) => {
      if (success) {
        confirmTransaction(id);
        setTimeout(() => removeTransaction(id), 4000);
      } else {
        failTransaction(id);
        setTimeout(() => removeTransaction(id), 6000);
      }
    });
  };

  const movementWallet = getMovementWallet(user);

  /**
   * Sync character state from chain before entering dungeon
   * This ensures local state matches on-chain state for health, mana, level, etc.
   */
  const syncCharacterFromChain = useCallback(async (): Promise<boolean> => {
    if (!movementWallet) return false;

    try {
      console.log('[useDungeonTransaction] Syncing character from chain...');
      const response = await fetch(`${API_BASE_URL}/api/character/sync?address=${movementWallet.address}`);

      if (!response.ok) {
        console.warn('[useDungeonTransaction] Failed to sync character');
        return false;
      }

      const data = await response.json();
      if (!data.success || !data.character) {
        console.warn('[useDungeonTransaction] Invalid sync response:', data);
        return false;
      }

      // Update game store with on-chain character state
      const { character } = data;
      updateCharacter({
        level: character.level,
        experience: character.experience,
        health: character.health,
        maxHealth: character.maxHealth,
        mana: character.mana,
        maxMana: character.maxMana,
        isAlive: character.isAlive,
        stats: character.stats,
      });

      console.log('[useDungeonTransaction] Character synced from chain:', {
        level: character.level,
        health: character.health,
        maxHealth: character.maxHealth,
        mana: character.mana,
        maxMana: character.maxMana,
      });

      return true;
    } catch (error) {
      console.warn('[useDungeonTransaction] Error syncing character:', error);
      return false;
    }
  }, [movementWallet, updateCharacter]);

  /**
   * Enter dungeon - User wallet signs (gas sponsored)
   * First resets any stale dungeon state, then syncs character and enters
   */
  const enterDungeon = useCallback(
    async (dungeonId: number): Promise<DungeonResult> => {
      if (!authenticated || !movementWallet) {
        return { success: false, error: 'Wallet not connected' };
      }

      setIsPending(true);
      setLastError(null);

      // First, try to reset any stale dungeon state by calling exit
      // This handles cases where user closed browser mid-dungeon
      try {
        console.log('[useDungeonTransaction] Resetting stale dungeon state...');
        await exitDungeonSuccess(movementWallet.address);
      } catch {
        // Ignore errors - player might not be in dungeon
        console.log('[useDungeonTransaction] No stale dungeon state to reset');
      }

      // Sync character state from chain BEFORE entering dungeon
      await syncCharacterFromChain();

      // Show notification immediately
      const txId = startTransaction('Entered Dungeon');

      try {
        const buildResponse = await fetch(`${API_BASE_URL}/api/sponsor-transaction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: movementWallet.address,
            function: `${MODULES.dungeon}::enter_dungeon`,
            typeArguments: [],
            functionArguments: [dungeonId],
          }),
        });

        if (!buildResponse.ok) {
          throw new Error('Failed to build enter dungeon transaction');
        }

        const { hash, rawTxnHex, feePayerAddress, feePayerAuthenticatorHex } =
          await buildResponse.json();

        const { signature } = await signRawHash({
          address: movementWallet.address,
          chainType: 'aptos',
          hash,
        });

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
          throw new Error('Failed to submit enter dungeon transaction');
        }

        const result = await submitResponse.json();
        completeTransaction(txId, result.hash);
        return { success: true, txHash: result.hash };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to enter dungeon';
        setLastError(errorMsg);
        failTransaction(txId);
        setTimeout(() => removeTransaction(txId), 4000);
        return { success: false, error: errorMsg };
      } finally {
        setIsPending(false);
      }
    },
    [authenticated, movementWallet, signRawHash, startTransaction, completeTransaction, failTransaction, removeTransaction, syncCharacterFromChain]
  );

  /**
   * Complete floor - Server-side (invisible wallet)
   */
  const triggerCompleteFloor = useCallback(
    async (enemiesKilled: number, xpEarned: number): Promise<DungeonResult> => {
      if (!movementWallet) {
        return { success: false, error: 'Wallet not connected' };
      }

      setIsPending(true);
      setLastError(null);

      // Show notification immediately
      const txId = startTransaction('Floor Completed');

      try {
        const result = await completeFloor(movementWallet.address, enemiesKilled, xpEarned);
        if (result.success && result.txHash) {
          completeTransaction(txId, result.txHash);
        } else {
          failTransaction(txId);
          setTimeout(() => removeTransaction(txId), 4000);
        }
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to complete floor';
        setLastError(errorMsg);
        failTransaction(txId);
        setTimeout(() => removeTransaction(txId), 4000);
        return { success: false, error: errorMsg };
      } finally {
        setIsPending(false);
      }
    },
    [movementWallet, startTransaction, completeTransaction, failTransaction, removeTransaction]
  );

  /**
   * Complete boss floor - Server-side (invisible wallet)
   */
  const triggerCompleteBoss = useCallback(
    async (xpEarned: number): Promise<DungeonResult> => {
      if (!movementWallet) {
        return { success: false, error: 'Wallet not connected' };
      }

      setIsPending(true);
      setLastError(null);

      // Show notification immediately
      const txId = startTransaction('Boss Defeated');

      try {
        const result = await completeBossFloor(movementWallet.address, xpEarned);
        if (result.success && result.txHash) {
          completeTransaction(txId, result.txHash);
        } else {
          failTransaction(txId);
          setTimeout(() => removeTransaction(txId), 4000);
        }
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to complete boss';
        setLastError(errorMsg);
        failTransaction(txId);
        setTimeout(() => removeTransaction(txId), 4000);
        return { success: false, error: errorMsg };
      } finally {
        setIsPending(false);
      }
    },
    [movementWallet, startTransaction, completeTransaction, failTransaction, removeTransaction]
  );

  /**
   * Player died - Server-side (invisible wallet)
   * Burns all equipped items and pending loot
   */
  const triggerPlayerDeath = useCallback(async (): Promise<DungeonResult> => {
    if (!movementWallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setLastError(null);

    // Show notification immediately
    const txId = startTransaction('Player Died');

    try {
      const result = await reportPlayerDeath(movementWallet.address);
      if (result.success && result.txHash) {
        completeTransaction(txId, result.txHash);
      } else {
        failTransaction(txId);
        setTimeout(() => removeTransaction(txId), 4000);
      }
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to process death';
      setLastError(errorMsg);
      failTransaction(txId);
      setTimeout(() => removeTransaction(txId), 4000);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [movementWallet, startTransaction, completeTransaction, failTransaction, removeTransaction]);

  /**
   * Exit dungeon successfully - Server-side (invisible wallet)
   * Transfers pending loot to stash
   */
  const triggerExitDungeon = useCallback(async (): Promise<DungeonResult> => {
    if (!movementWallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setLastError(null);

    // Show notification immediately
    const txId = startTransaction('Exited Dungeon');

    try {
      const result = await exitDungeonSuccess(movementWallet.address);
      if (result.success && result.txHash) {
        completeTransaction(txId, result.txHash);
      } else {
        failTransaction(txId);
        setTimeout(() => removeTransaction(txId), 4000);
      }
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to exit dungeon';
      setLastError(errorMsg);
      failTransaction(txId);
      setTimeout(() => removeTransaction(txId), 4000);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [movementWallet, startTransaction, completeTransaction, failTransaction, removeTransaction]);

  /**
   * Transfer floor loot to stash - Server-side (invisible wallet)
   * Allows players to "bank" their loot mid-dungeon for safety
   */
  const triggerTransferFloorLoot = useCallback(async (): Promise<DungeonResult> => {
    if (!movementWallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setLastError(null);

    // Show notification immediately
    const txId = startTransaction('Loot Saved to Stash');

    try {
      const result = await transferFloorLoot(movementWallet.address);
      if (result.success && result.txHash) {
        completeTransaction(txId, result.txHash);
      } else {
        failTransaction(txId);
        setTimeout(() => removeTransaction(txId), 4000);
      }
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to transfer floor loot';
      setLastError(errorMsg);
      failTransaction(txId);
      setTimeout(() => removeTransaction(txId), 4000);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [movementWallet, startTransaction, completeTransaction, failTransaction, removeTransaction]);

  /**
   * Initialize stash - User wallet signs (gas sponsored)
   */
  const initializeStash = useCallback(async (): Promise<DungeonResult> => {
    if (!authenticated || !movementWallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setLastError(null);

    // Show notification immediately
    const txId = startTransaction('Stash Initialized');

    try {
      const buildResponse = await fetch(`${API_BASE_URL}/api/sponsor-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: movementWallet.address,
          function: `${MODULES.stash}::init_stash`,
          typeArguments: [],
          functionArguments: [],
        }),
      });

      if (!buildResponse.ok) {
        throw new Error('Failed to build init stash transaction');
      }

      const { hash, rawTxnHex, feePayerAddress, feePayerAuthenticatorHex } =
        await buildResponse.json();

      const { signature } = await signRawHash({
        address: movementWallet.address,
        chainType: 'aptos',
        hash,
      });

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
        throw new Error('Failed to submit init stash transaction');
      }

      const result = await submitResponse.json();
      completeTransaction(txId, result.hash);
      return { success: true, txHash: result.hash };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to init stash';
      setLastError(errorMsg);
      failTransaction(txId);
      setTimeout(() => removeTransaction(txId), 4000);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [authenticated, movementWallet, signRawHash, startTransaction, completeTransaction, failTransaction, removeTransaction]);

  return {
    enterDungeon,
    triggerCompleteFloor,
    triggerCompleteBoss,
    triggerPlayerDeath,
    triggerExitDungeon,
    triggerTransferFloorLoot,
    initializeStash,
    syncCharacterFromChain,
    isPending,
    lastError,
    walletAddress: movementWallet?.address || null,
    isConnected: authenticated && !!movementWallet,
  };
}
