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
  const { addPendingTransaction, confirmTransaction, failTransaction, removeTransaction } =
    useTransactionStore();

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

  const movementWallet = getMovementWallet(user);

  /**
   * Start combat - Server-side (invisible wallet)
   */
  const initiateCombat = useCallback(
    async (
      enemyType: keyof typeof ENEMY_TYPES | number,
      floor: number
    ): Promise<CombatResult> => {
      if (!movementWallet) {
        return { success: false, error: 'Wallet not connected' };
      }

      setIsPending(true);
      setLastError(null);

      try {
        const result = await startCombat(movementWallet.address, enemyType, floor);
        if (result.success && result.txHash) {
          addTransaction('Combat Started', result.txHash);
        }
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to start combat';
        setLastError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsPending(false);
      }
    },
    [movementWallet, addTransaction]
  );

  /**
   * Player attack - User wallet signs (gas sponsored)
   */
  const playerAttack = useCallback(async (): Promise<CombatResult> => {
    if (!authenticated || !movementWallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setLastError(null);

    try {
      // Generate random seed for crit calculation
      const seed = Math.floor(Math.random() * 1000000);

      // Build sponsored transaction
      const buildResponse = await fetch(`${API_BASE_URL}/api/sponsor-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: movementWallet.address,
          function: `${MODULES.combat}::player_attack`,
          typeArguments: [],
          functionArguments: [seed],
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
        throw new Error('Failed to submit attack transaction');
      }

      const result = await submitResponse.json();
      addTransaction('Player Attack', result.hash);

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
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [authenticated, movementWallet, signRawHash, addTransaction]);

  /**
   * Player flee - User wallet signs (gas sponsored)
   */
  const playerFlee = useCallback(async (): Promise<CombatResult> => {
    if (!authenticated || !movementWallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setLastError(null);

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
        throw new Error('Failed to submit flee transaction');
      }

      const result = await submitResponse.json();
      addTransaction('Player Fled', result.hash);
      return { success: true, txHash: result.hash };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Flee failed';
      setLastError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [authenticated, movementWallet, signRawHash, addTransaction]);

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
        throw new Error('Failed to submit defend transaction');
      }

      const result = await submitResponse.json();
      addTransaction('Player Defended', result.hash);
      return { success: true, txHash: result.hash };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Defend failed';
      setLastError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [authenticated, movementWallet, signRawHash, addTransaction]);

  /**
   * Player heavy attack - User wallet signs (gas sponsored)
   * Costs 20 mana, deals 1.5x damage
   */
  const playerHeavyAttack = useCallback(async (): Promise<CombatResult> => {
    if (!authenticated || !movementWallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setLastError(null);

    try {
      const seed = Math.floor(Math.random() * 1000000);

      const buildResponse = await fetch(`${API_BASE_URL}/api/sponsor-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: movementWallet.address,
          function: `${MODULES.combat}::player_heavy_attack`,
          typeArguments: [],
          functionArguments: [seed],
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
        throw new Error('Failed to submit heavy attack transaction');
      }

      const result = await submitResponse.json();
      addTransaction('Heavy Attack', result.hash);

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
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [authenticated, movementWallet, signRawHash, addTransaction]);

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
        throw new Error('Failed to submit heal transaction');
      }

      const result = await submitResponse.json();
      addTransaction('Player Healed', result.hash);
      return { success: true, txHash: result.hash };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Heal failed';
      setLastError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [authenticated, movementWallet, signRawHash, addTransaction]);

  /**
   * Enemy attack - Server-side (invisible wallet)
   */
  const triggerEnemyAttack = useCallback(async (): Promise<CombatResult> => {
    if (!movementWallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setLastError(null);

    try {
      const result = await executeEnemyAttack(movementWallet.address);
      if (result.success && result.txHash) {
        addTransaction('Enemy Attack', result.txHash);
      }
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Enemy attack failed';
      setLastError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [movementWallet, addTransaction]);

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
        throw new Error('Failed to submit pickup transaction');
      }

      const result = await submitResponse.json();
      const itemNames = ['Weapon', 'Armor', 'Accessory', 'Consumable'];
      addTransaction(`Picked Up ${itemNames[itemType] || 'Item'}`, result.hash);
      return { success: true, txHash: result.hash };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Pickup failed';
      setLastError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsPending(false);
    }
  }, [authenticated, movementWallet, signRawHash, addTransaction]);

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
