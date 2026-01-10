'use client';

import { useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSignRawHash } from '@privy-io/react-auth/extended-chains';
import { getMovementWallet } from '@/lib/privy-movement';
import { useGameStore } from '@/stores/gameStore';
import { useUIStore } from '@/stores/uiStore';
import { useTransactionStore, waitForTransaction } from '@/stores/transactionStore';
import { MODULES } from '@/lib/contract';
import type { Item } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

interface UseItemActionsResult {
  // Mutations
  equipItem: (item: Item, inventoryIndex: number) => Promise<boolean>;
  unequipItem: (slot: 'weapon' | 'armor' | 'accessory') => Promise<boolean>;
  useConsumable: (item: Item, inventoryIndex: number) => Promise<boolean>;
  depositToStash: (item: Item, inventoryIndex: number) => Promise<boolean>;
  withdrawFromStash: (item: Item, stashIndex: number) => Promise<boolean>;
  // State
  isLoading: boolean;
  error: string | null;
}

export function useItemActions(): UseItemActionsResult {
  const { user, authenticated } = usePrivy();
  const { signRawHash } = useSignRawHash();
  const { isInDungeon, removeFromInventory } = useGameStore();
  const { inventory, setInventory } = useGameStore();
  const { addNotification } = useUIStore();
  const { addPendingTransaction, confirmTransaction, failTransaction, removeTransaction } =
    useTransactionStore();
  const [isLoading, setIsLoading] = useState(false);
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

  const movementWallet = getMovementWallet(user);

  /**
   * Build, sign, and submit a sponsored transaction
   */
  const submitSponsoredTransaction = useCallback(
    async (functionName: string, args: (string | number)[]) => {
      if (!authenticated || !movementWallet) {
        throw new Error('Wallet not connected');
      }

      const buildResponse = await fetch(`${API_BASE_URL}/api/sponsor-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: movementWallet.address,
          function: functionName,
          typeArguments: [],
          functionArguments: args,
        }),
      });

      if (!buildResponse.ok) {
        throw new Error('Failed to build transaction');
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
        throw new Error('Failed to submit transaction');
      }

      return await submitResponse.json();
    },
    [authenticated, movementWallet, signRawHash]
  );

  const equipItem = useCallback(
    async (item: Item, inventoryIndex: number): Promise<boolean> => {
      if (!authenticated || !movementWallet) {
        setError('Wallet not connected');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Determine which equip function to call based on item type
        let functionName: string;
        switch (item.type) {
          case 'Weapon':
            functionName = `${MODULES.loot}::equip_weapon_from_inventory`;
            break;
          case 'Armor':
            functionName = `${MODULES.loot}::equip_armor_from_inventory`;
            break;
          case 'Accessory':
            functionName = `${MODULES.loot}::equip_accessory_from_inventory`;
            break;
          default:
            throw new Error('Invalid item type for equipping');
        }

        const result = await submitSponsoredTransaction(functionName, [inventoryIndex]);
        addTransaction(`Equipped ${item.type}`, result.hash);

        // Optimistic update - mark item as equipped
        const updatedInventory = inventory.map((i) =>
          i.id === item.id ? { ...i, isEquipped: true } : i
        );
        setInventory(updatedInventory);

        addNotification({
          type: 'success',
          message: `Equipped ${item.name}`,
          duration: 3000,
        });

        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to equip item';
        setError(msg);
        addNotification({ type: 'error', message: msg, duration: 5000 });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [authenticated, movementWallet, submitSponsoredTransaction, inventory, setInventory, addNotification, addTransaction]
  );

  const unequipItem = useCallback(
    async (slot: 'weapon' | 'armor' | 'accessory'): Promise<boolean> => {
      if (!authenticated || !movementWallet) {
        setError('Wallet not connected');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Determine which unequip function to call
        let functionName: string;
        switch (slot) {
          case 'weapon':
            functionName = `${MODULES.loot}::unequip_weapon_to_inventory`;
            break;
          case 'armor':
            functionName = `${MODULES.loot}::unequip_armor_to_inventory`;
            break;
          case 'accessory':
            functionName = `${MODULES.loot}::unequip_accessory_to_inventory`;
            break;
        }

        const result = await submitSponsoredTransaction(functionName, []);
        addTransaction(`Unequipped ${slot}`, result.hash);

        addNotification({
          type: 'success',
          message: `Unequipped ${slot}`,
          duration: 3000,
        });

        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to unequip item';
        setError(msg);
        addNotification({ type: 'error', message: msg, duration: 5000 });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [authenticated, movementWallet, submitSponsoredTransaction, addNotification, addTransaction]
  );

  const useConsumable = useCallback(
    async (item: Item, inventoryIndex: number): Promise<boolean> => {
      if (!authenticated || !movementWallet) {
        setError('Wallet not connected');
        return false;
      }

      if (item.type !== 'Consumable') {
        setError('Item is not consumable');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await submitSponsoredTransaction(
          `${MODULES.loot}::use_consumable_from_inventory`,
          [inventoryIndex]
        );
        addTransaction('Used Consumable', result.hash);

        // Optimistic update - remove consumed item
        removeFromInventory(item.id);

        addNotification({
          type: 'success',
          message: `Used ${item.name}`,
          duration: 3000,
        });

        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to use item';
        setError(msg);
        addNotification({ type: 'error', message: msg, duration: 5000 });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [authenticated, movementWallet, submitSponsoredTransaction, removeFromInventory, addNotification, addTransaction]
  );

  const depositToStash = useCallback(
    async (item: Item, inventoryIndex: number): Promise<boolean> => {
      if (!authenticated || !movementWallet) {
        setError('Wallet not connected');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Determine which deposit function to call based on item type
        let functionName: string;
        switch (item.type) {
          case 'Weapon':
            functionName = `${MODULES.loot}::deposit_weapon_to_stash`;
            break;
          case 'Armor':
            functionName = `${MODULES.loot}::deposit_armor_to_stash`;
            break;
          case 'Accessory':
            functionName = `${MODULES.loot}::deposit_accessory_to_stash`;
            break;
          case 'Consumable':
            functionName = `${MODULES.loot}::deposit_consumable_to_stash`;
            break;
          default:
            throw new Error('Invalid item type');
        }

        const result = await submitSponsoredTransaction(functionName, [inventoryIndex]);
        addTransaction(`Deposited ${item.type}`, result.hash);

        // Optimistic update
        removeFromInventory(item.id);

        addNotification({
          type: 'success',
          message: `Deposited ${item.name} to stash`,
          duration: 3000,
        });

        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to deposit item';
        setError(msg);
        addNotification({ type: 'error', message: msg, duration: 5000 });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [authenticated, movementWallet, submitSponsoredTransaction, removeFromInventory, addNotification, addTransaction]
  );

  const withdrawFromStash = useCallback(
    async (item: Item, stashIndex: number): Promise<boolean> => {
      if (!authenticated || !movementWallet) {
        setError('Wallet not connected');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Determine which withdraw function to call based on item type
        let functionName: string;
        switch (item.type) {
          case 'Weapon':
            functionName = `${MODULES.loot}::withdraw_weapon_from_stash`;
            break;
          case 'Armor':
            functionName = `${MODULES.loot}::withdraw_armor_from_stash`;
            break;
          case 'Accessory':
            functionName = `${MODULES.loot}::withdraw_accessory_from_stash`;
            break;
          case 'Consumable':
            functionName = `${MODULES.loot}::withdraw_consumable_from_stash`;
            break;
          default:
            throw new Error('Invalid item type');
        }

        const result = await submitSponsoredTransaction(functionName, [stashIndex]);
        addTransaction(`Withdrew ${item.type}`, result.hash);

        addNotification({
          type: 'success',
          message: `Withdrew ${item.name} from stash`,
          duration: 3000,
        });

        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to withdraw item';
        setError(msg);
        addNotification({ type: 'error', message: msg, duration: 5000 });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [authenticated, movementWallet, submitSponsoredTransaction, addNotification, addTransaction]
  );

  return {
    equipItem,
    unequipItem,
    useConsumable,
    depositToStash,
    withdrawFromStash,
    isLoading,
    error,
  };
}
