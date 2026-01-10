'use client';

import { useCallback, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSignRawHash } from '@privy-io/react-auth/extended-chains';
import { getMovementWallet } from '@/lib/privy-movement';
import { MODULES } from '@/lib/contract';
import { useTransactionStore } from '@/stores/transactionStore';
import {
  exitDungeonSuccess,
  completeBossFloor,
  completeFloor,
  reportPlayerDeath,
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
  const addTransaction = useTransactionStore((state) => state.addTransaction);

  const movementWallet = getMovementWallet(user);

  /**
   * Enter dungeon - User wallet signs (gas sponsored)
   */
  const enterDungeon = useCallback(
    async (dungeonId: number): Promise<DungeonResult> => {
      if (!authenticated || !movementWallet) {
        return { success: false, error: 'Wallet not connected' };
      }

      setIsPending(true);
      setLastError(null);

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
        addTransaction('Entered Dungeon', result.hash);
        return { success: true, txHash: result.hash };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to enter dungeon';
        setLastError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsPending(false);
      }
    },
    [authenticated, movementWallet, signRawHash, addTransaction]
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

      try {
        const result = await completeFloor(movementWallet.address, enemiesKilled, xpEarned);
        if (result.success && result.txHash) {
          addTransaction('Floor Completed', result.txHash);
        }
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to complete floor';
        setLastError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsPending(false);
      }
    },
    [movementWallet, addTransaction]
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

      try {
        const result = await completeBossFloor(movementWallet.address, xpEarned);
        if (result.success && result.txHash) {
          addTransaction('Boss Defeated', result.txHash);
        }
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to complete boss';
        setLastError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsPending(false);
      }
    },
    [movementWallet, addTransaction]
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

    try {
      const result = await reportPlayerDeath(movementWallet.address);
      if (result.success && result.txHash) {
        addTransaction('Player Died', result.txHash);
      }
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to process death';
      setLastError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [movementWallet, addTransaction]);

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

    try {
      const result = await exitDungeonSuccess(movementWallet.address);
      if (result.success && result.txHash) {
        addTransaction('Exited Dungeon', result.txHash);
      }
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to exit dungeon';
      setLastError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [movementWallet, addTransaction]);

  /**
   * Initialize stash - User wallet signs (gas sponsored)
   */
  const initializeStash = useCallback(async (): Promise<DungeonResult> => {
    if (!authenticated || !movementWallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setLastError(null);

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
      addTransaction('Stash Initialized', result.hash);
      return { success: true, txHash: result.hash };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to init stash';
      setLastError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [authenticated, movementWallet, signRawHash, addTransaction]);

  return {
    enterDungeon,
    triggerCompleteFloor,
    triggerCompleteBoss,
    triggerPlayerDeath,
    triggerExitDungeon,
    initializeStash,
    isPending,
    lastError,
    walletAddress: movementWallet?.address || null,
    isConnected: authenticated && !!movementWallet,
  };
}
