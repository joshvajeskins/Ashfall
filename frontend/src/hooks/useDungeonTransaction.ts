'use client';

import { useCallback, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSignRawHash } from '@privy-io/react-auth/extended-chains';
import { getMovementWallet } from '@/lib/privy-movement';
import {
  exitDungeonSuccess,
  completeBossFloor,
  completeFloor,
  reportPlayerDeath,
} from '@/lib/move/dungeonService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  '0x2b633f672b485166e89bb90903962d5ad26bbf70ce079ed484bae518d89d2dc5';

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
            function: `${CONTRACT_ADDRESS}::dungeon::enter_dungeon`,
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
        return { success: true, txHash: result.hash };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to enter dungeon';
        setLastError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsPending(false);
      }
    },
    [authenticated, movementWallet, signRawHash]
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
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to complete floor';
        setLastError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsPending(false);
      }
    },
    [movementWallet]
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
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to complete boss';
        setLastError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsPending(false);
      }
    },
    [movementWallet]
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
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to process death';
      setLastError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [movementWallet]);

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
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to exit dungeon';
      setLastError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [movementWallet]);

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
          function: `${CONTRACT_ADDRESS}::stash::init_stash`,
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
      return { success: true, txHash: result.hash };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to init stash';
      setLastError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [authenticated, movementWallet, signRawHash]);

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
