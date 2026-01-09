'use client';

import { useCallback, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSignRawHash } from '@privy-io/react-auth/extended-chains';
import { getMovementWallet } from '@/lib/privy-movement';
import { MODULES } from '@/lib/contract';
import { useTransactionStore, waitForTransaction } from '@/stores/transactionStore';
import {
  startCombat,
  executeEnemyAttack,
  ENEMY_TYPES,
} from '@/lib/move/combatService';
import { combatService } from '@/lib/move/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface CombatAction {
  type: 'player_attack' | 'flee';
  seed: number;
}

export interface CombatResult {
  success: boolean;
  txHash?: string;
  error?: string;
  // Combat state from chain (populated after attacks)
  combatState?: {
    enemyHealth: number;
    enemyMaxHealth: number;
    isActive: boolean;
    enemyKilled: boolean;
  };
  // Enemy intent for next turn (from on-chain state)
  enemyIntent?: number;
  // Already in combat - need to resume
  alreadyInCombat?: boolean;
  // Player stats from on-chain (for combat start sync)
  playerHealth?: number;
  playerMaxHealth?: number;
  playerMana?: number;
  playerMaxMana?: number;
}

/**
 * Hook for handling on-chain combat transactions
 *
 * Flow:
 * - startCombat: Server wallet initiates combat (no user signing)
 * - playerAttack/flee: User wallet signs + gas sponsored
 * - enemyAttack: Server wallet executes (no user signing)
 */
export function useCombatTransaction() {
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
   * Start combat - Server-side (invisible wallet)
   * Returns initial enemy intent and health from on-chain state
   */
  const initiateCombat = useCallback(
    async (
      enemyType: keyof typeof ENEMY_TYPES | number,
      floor: number,
      roomId: number = 0
    ): Promise<CombatResult> => {
      if (!movementWallet) {
        return { success: false, error: 'Wallet not connected' };
      }

      setIsPending(true);
      setLastError(null);

      // Show notification immediately
      const txId = startTransaction('Combat Started');

      try {
        const result = await startCombat(movementWallet.address, enemyType, floor, roomId);

        // Handle already in combat FIRST - this is a resume, not a failure
        if (result.alreadyInCombat && result.combatState) {
          console.log('[useCombatTransaction] Already in combat, preparing resume state:', result.combatState);

          // Update notification to show "Combat Resumed" instead of failed
          updateTransactionHash(txId, 'resumed');
          confirmTransaction(txId);
          setTimeout(() => removeTransaction(txId), 3000);

          // Fetch enemy intent for the existing combat
          let enemyIntent = 0;
          try {
            const [intent] = await combatService.getEnemyIntent(movementWallet.address);
            enemyIntent = Number(intent) || 0;
          } catch (e) {
            console.log('[useCombatTransaction] Could not fetch enemy intent:', e);
          }

          // Parse values as numbers (chain returns strings for u64)
          const enemyHealth = Number(result.combatState.enemyHealth) || 0;
          const enemyMaxHealth = Number(result.combatState.enemyMaxHealth) || 0;
          const isActive = result.combatState.isActive === true || result.combatState.isActive === 'true';

          console.log('[useCombatTransaction] Resume combat state:', { enemyHealth, enemyMaxHealth, isActive, enemyIntent });

          return {
            success: false,
            error: result.error,
            alreadyInCombat: true,
            enemyIntent,
            combatState: {
              enemyHealth,
              enemyMaxHealth,
              isActive,
              enemyKilled: false,
            },
          };
        }

        // Normal success/failure handling
        if (result.success && result.txHash) {
          completeTransaction(txId, result.txHash);
        } else {
          // Failed - update notification
          failTransaction(txId);
          setTimeout(() => removeTransaction(txId), 4000);
        }

        // Return with on-chain enemy intent, enemy health, and player stats
        return {
          success: result.success,
          txHash: result.txHash,
          error: result.error,
          enemyIntent: result.enemyIntent,
          combatState: result.enemyHealth !== undefined ? {
            enemyHealth: result.enemyHealth,
            enemyMaxHealth: result.enemyMaxHealth ?? 0,
            isActive: true,
            enemyKilled: false,
          } : undefined,
          // Pass player stats from chain for combat sync
          playerHealth: result.playerHealth,
          playerMaxHealth: result.playerMaxHealth,
          playerMana: result.playerMana,
          playerMaxMana: result.playerMaxMana,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to start combat';
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
   * Player attack - User wallet signs (gas sponsored)
   * @param seed - Random seed for crit calculation (passed from CombatScene for synced calculations)
   */
  const playerAttack = useCallback(async (seed?: number): Promise<CombatResult> => {
    if (!authenticated || !movementWallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setLastError(null);

    // Show notification immediately
    const txId = startTransaction('Player Attack');

    try {
      // Use passed seed or generate new one (passed seed ensures frontend/contract sync)
      const attackSeed = seed ?? Math.floor(Math.random() * 1000000);

      // Build sponsored transaction
      const buildResponse = await fetch(`${API_BASE_URL}/api/sponsor-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: movementWallet.address,
          function: `${MODULES.combat}::player_attack`,
          typeArguments: [],
          functionArguments: [attackSeed],
        }),
      });

      if (!buildResponse.ok) {
        const errorData = await buildResponse.json().catch(() => ({}));
        const errorMsg = errorData.details || errorData.error || 'Failed to build attack transaction';
        throw new Error(errorMsg);
      }

      const { hash, rawTxnHex, feePayerAddress, feePayerAuthenticatorHex } =
        await buildResponse.json();

      // Sign with Privy
      const { signature } = await signRawHash({
        address: movementWallet.address,
        chainType: 'aptos',
        hash,
      });

      // Submit sponsored transaction
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
        const errorMsg = errorData.details || errorData.error || 'Failed to submit attack transaction';
        throw new Error(errorMsg);
      }

      const result = await submitResponse.json();
      completeTransaction(txId, result.hash);

      // Fetch combat state from chain to get actual enemy health
      try {
        const [enemyHealth, enemyMaxHealth, , isActive] = await combatService.getCombatState(movementWallet.address);
        const enemyKilled = !isActive || enemyHealth === 0;
        return {
          success: true,
          txHash: result.hash,
          combatState: { enemyHealth, enemyMaxHealth, isActive, enemyKilled },
        };
      } catch {
        // If we can't fetch state, return without it
        return { success: true, txHash: result.hash };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Attack failed';
      setLastError(errorMsg);
      failTransaction(txId);
      setTimeout(() => removeTransaction(txId), 4000);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [authenticated, movementWallet, signRawHash, startTransaction, completeTransaction, failTransaction, removeTransaction]);

  /**
   * Player flee - User wallet signs (gas sponsored)
   */
  const playerFlee = useCallback(async (): Promise<CombatResult> => {
    if (!authenticated || !movementWallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setLastError(null);

    // Show notification immediately
    const txId = startTransaction('Player Fled');

    try {
      const seed = Math.floor(Math.random() * 1000000);

      const buildResponse = await fetch(`${API_BASE_URL}/api/sponsor-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: movementWallet.address,
          function: `${MODULES.combat}::flee_combat`,
          typeArguments: [],
          functionArguments: [seed],
        }),
      });

      if (!buildResponse.ok) {
        const errorData = await buildResponse.json().catch(() => ({}));
        const errorMsg = errorData.details || errorData.error || 'Failed to build flee transaction';
        throw new Error(errorMsg);
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
        const errorData = await submitResponse.json().catch(() => ({}));
        const errorMsg = errorData.details || errorData.error || 'Failed to submit flee transaction';
        throw new Error(errorMsg);
      }

      const result = await submitResponse.json();
      completeTransaction(txId, result.hash);
      return { success: true, txHash: result.hash };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Flee failed';
      setLastError(errorMsg);
      failTransaction(txId);
      setTimeout(() => removeTransaction(txId), 4000);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [authenticated, movementWallet, signRawHash, startTransaction, completeTransaction, failTransaction, removeTransaction]);

  /**
   * Player defend - User wallet signs (gas sponsored)
   * Reduces next incoming damage by 50%
   */
  const playerDefend = useCallback(async (): Promise<CombatResult> => {
    if (!authenticated || !movementWallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setLastError(null);

    // Show notification immediately
    const txId = startTransaction('Player Defended');

    try {
      const buildResponse = await fetch(`${API_BASE_URL}/api/sponsor-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: movementWallet.address,
          function: `${MODULES.combat}::player_defend`,
          typeArguments: [],
          functionArguments: [],
        }),
      });

      if (!buildResponse.ok) {
        const errorData = await buildResponse.json().catch(() => ({}));
        const errorMsg = errorData.details || errorData.error || 'Failed to build defend transaction';
        throw new Error(errorMsg);
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
        const errorData = await submitResponse.json().catch(() => ({}));
        const errorMsg = errorData.details || errorData.error || 'Failed to submit defend transaction';
        throw new Error(errorMsg);
      }

      const result = await submitResponse.json();
      completeTransaction(txId, result.hash);
      return { success: true, txHash: result.hash };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Defend failed';
      setLastError(errorMsg);
      failTransaction(txId);
      setTimeout(() => removeTransaction(txId), 4000);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [authenticated, movementWallet, signRawHash, startTransaction, completeTransaction, failTransaction, removeTransaction]);

  /**
   * Player heavy attack - User wallet signs (gas sponsored)
   * Costs 20 mana, deals 1.5x damage
   * @param seed - Random seed for crit calculation (passed from CombatScene for synced calculations)
   */
  const playerHeavyAttack = useCallback(async (seed?: number): Promise<CombatResult> => {
    if (!authenticated || !movementWallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setLastError(null);

    // Show notification immediately
    const txId = startTransaction('Heavy Attack');

    try {
      // Use passed seed or generate new one (passed seed ensures frontend/contract sync)
      const attackSeed = seed ?? Math.floor(Math.random() * 1000000);

      const buildResponse = await fetch(`${API_BASE_URL}/api/sponsor-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: movementWallet.address,
          function: `${MODULES.combat}::player_heavy_attack`,
          typeArguments: [],
          functionArguments: [attackSeed],
        }),
      });

      if (!buildResponse.ok) {
        const errorData = await buildResponse.json().catch(() => ({}));
        const errorMsg = errorData.details || errorData.error || 'Failed to build heavy attack transaction';
        throw new Error(errorMsg);
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
        const errorData = await submitResponse.json().catch(() => ({}));
        const errorMsg = errorData.details || errorData.error || 'Failed to submit heavy attack transaction';
        throw new Error(errorMsg);
      }

      const result = await submitResponse.json();
      completeTransaction(txId, result.hash);

      // Fetch combat state from chain to get actual enemy health
      try {
        const [enemyHealth, enemyMaxHealth, , isActive] = await combatService.getCombatState(movementWallet.address);
        const enemyKilled = !isActive || enemyHealth === 0;
        return {
          success: true,
          txHash: result.hash,
          combatState: { enemyHealth, enemyMaxHealth, isActive, enemyKilled },
        };
      } catch {
        return { success: true, txHash: result.hash };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Heavy attack failed';
      setLastError(errorMsg);
      failTransaction(txId);
      setTimeout(() => removeTransaction(txId), 4000);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [authenticated, movementWallet, signRawHash, startTransaction, completeTransaction, failTransaction, removeTransaction]);

  /**
   * Player heal - User wallet signs (gas sponsored)
   * Costs 30 mana, heals 30% of max HP
   */
  const playerHeal = useCallback(async (): Promise<CombatResult> => {
    if (!authenticated || !movementWallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setLastError(null);

    // Show notification immediately
    const txId = startTransaction('Player Healed');

    try {
      const buildResponse = await fetch(`${API_BASE_URL}/api/sponsor-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: movementWallet.address,
          function: `${MODULES.combat}::player_heal`,
          typeArguments: [],
          functionArguments: [],
        }),
      });

      if (!buildResponse.ok) {
        const errorData = await buildResponse.json().catch(() => ({}));
        const errorMsg = errorData.details || errorData.error || 'Failed to build heal transaction';
        throw new Error(errorMsg);
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
        const errorData = await submitResponse.json().catch(() => ({}));
        const errorMsg = errorData.details || errorData.error || 'Failed to submit heal transaction';
        throw new Error(errorMsg);
      }

      const result = await submitResponse.json();
      completeTransaction(txId, result.hash);
      return { success: true, txHash: result.hash };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Heal failed';
      setLastError(errorMsg);
      failTransaction(txId);
      setTimeout(() => removeTransaction(txId), 4000);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [authenticated, movementWallet, signRawHash, startTransaction, completeTransaction, failTransaction, removeTransaction]);

  /**
   * Enemy attack - Server-side (invisible wallet)
   * Returns new enemy intent for next turn from on-chain state
   */
  const triggerEnemyAttack = useCallback(async (): Promise<CombatResult> => {
    if (!movementWallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setLastError(null);

    // Show notification immediately
    const txId = startTransaction('Enemy Attack');

    try {
      const result = await executeEnemyAttack(movementWallet.address);
      if (result.success && result.txHash) {
        completeTransaction(txId, result.txHash);
      } else {
        failTransaction(txId);
        setTimeout(() => removeTransaction(txId), 4000);
      }
      // Return with on-chain enemy intent for next turn
      return {
        success: result.success,
        txHash: result.txHash,
        error: result.error,
        enemyIntent: result.enemyIntent,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Enemy attack failed';
      setLastError(errorMsg);
      failTransaction(txId);
      setTimeout(() => removeTransaction(txId), 4000);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [movementWallet, startTransaction, completeTransaction, failTransaction, removeTransaction]);

  /**
   * Pickup item - User wallet signs (gas sponsored)
   * @param itemType 0=weapon, 1=armor, 2=accessory, 3=consumable
   * @param floor Current dungeon floor
   * @param enemyTier Enemy tier for stat calculation
   * @param consumableType For consumables: 0=health, 1=mana
   * @param power For consumables: healing/restore power
   */
  const pickupItem = useCallback(async (
    itemType: number,
    floor: number,
    enemyTier: number = 1,
    consumableType: number = 0,
    power: number = 50
  ): Promise<CombatResult> => {
    if (!authenticated || !movementWallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setLastError(null);

    const itemNames = ['Weapon', 'Armor', 'Accessory', 'Consumable'];
    // Show notification immediately
    const txId = startTransaction(`Picked Up ${itemNames[itemType] || 'Item'}`);

    try {
      const seed = Math.floor(Math.random() * 1000000);

      // Determine function based on item type
      let functionName: string;
      let functionArgs: (number | string)[];

      switch (itemType) {
        case 0: // Weapon
          functionName = `${MODULES.loot}::pickup_weapon`;
          functionArgs = [floor, enemyTier, seed];
          break;
        case 1: // Armor
          functionName = `${MODULES.loot}::pickup_armor`;
          functionArgs = [floor, enemyTier, seed];
          break;
        case 2: // Accessory
          functionName = `${MODULES.loot}::pickup_accessory`;
          functionArgs = [floor, enemyTier, seed];
          break;
        case 3: // Consumable
          functionName = `${MODULES.loot}::pickup_consumable`;
          functionArgs = [floor, consumableType, power];
          break;
        default:
          throw new Error('Invalid item type');
      }

      // Build sponsored transaction
      const buildResponse = await fetch(`${API_BASE_URL}/api/sponsor-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: movementWallet.address,
          function: functionName,
          typeArguments: [],
          functionArguments: functionArgs,
        }),
      });

      if (!buildResponse.ok) {
        const errorData = await buildResponse.json().catch(() => ({}));
        const errorMsg = errorData.details || errorData.error || 'Failed to build pickup transaction';
        throw new Error(errorMsg);
      }

      const { hash, rawTxnHex, feePayerAddress, feePayerAuthenticatorHex } =
        await buildResponse.json();

      // Sign with Privy
      const { signature } = await signRawHash({
        address: movementWallet.address,
        chainType: 'aptos',
        hash,
      });

      // Submit sponsored transaction
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
        const errorMsg = errorData.details || errorData.error || 'Failed to submit pickup transaction';
        throw new Error(errorMsg);
      }

      const result = await submitResponse.json();
      completeTransaction(txId, result.hash);
      return { success: true, txHash: result.hash };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Pickup failed';
      setLastError(errorMsg);
      failTransaction(txId);
      setTimeout(() => removeTransaction(txId), 4000);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [authenticated, movementWallet, signRawHash, startTransaction, completeTransaction, failTransaction, removeTransaction]);

  return {
    initiateCombat,
    playerAttack,
    playerFlee,
    playerDefend,
    playerHeavyAttack,
    playerHeal,
    triggerEnemyAttack,
    pickupItem,
    isPending,
    lastError,
    walletAddress: movementWallet?.address || null,
    isConnected: authenticated && !!movementWallet,
  };
}
