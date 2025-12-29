'use client';

import { useState, useCallback } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { useGameStore } from '@/stores/gameStore';
import { useUIStore } from '@/stores/uiStore';
import type { Item } from '@/types';

interface UseItemActionsResult {
  // Mutations
  equipItem: (item: Item) => Promise<boolean>;
  unequipItem: (slot: 'weapon' | 'armor' | 'accessory') => Promise<boolean>;
  depositToStash: (item: Item) => Promise<boolean>;
  withdrawFromStash: (item: Item) => Promise<boolean>;
  useConsumable: (item: Item) => Promise<boolean>;
  // State
  isLoading: boolean;
  error: string | null;
}

export function useItemActions(): UseItemActionsResult {
  const { address, isConnected, signAndSubmit } = useWalletStore();
  const { isInDungeon, removeFromInventory, addToInventory } = useGameStore();
  const { setStash, stash, inventory, setInventory } = useGameStore();
  const { addNotification } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const equipItem = useCallback(async (item: Item): Promise<boolean> => {
    if (!isConnected || !signAndSubmit) {
      setError('Wallet not connected');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build and submit equip transaction
      await signAndSubmit({
        function: 'hero::equip_item',
        typeArguments: [],
        functionArguments: [item.id],
      });

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
  }, [isConnected, signAndSubmit, inventory, setInventory, addNotification]);

  const unequipItem = useCallback(async (slot: 'weapon' | 'armor' | 'accessory'): Promise<boolean> => {
    if (!isConnected || !signAndSubmit) {
      setError('Wallet not connected');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signAndSubmit({
        function: 'hero::unequip_item',
        typeArguments: [],
        functionArguments: [slot],
      });

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
  }, [isConnected, signAndSubmit, addNotification]);

  const depositToStash = useCallback(async (item: Item): Promise<boolean> => {
    if (!isConnected || !signAndSubmit) {
      setError('Wallet not connected');
      return false;
    }

    if (isInDungeon) {
      setError('Cannot access stash while in dungeon');
      addNotification({
        type: 'warning',
        message: 'Cannot access stash while in dungeon',
        duration: 3000,
      });
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signAndSubmit({
        function: 'stash::deposit',
        typeArguments: [],
        functionArguments: [item.id],
      });

      // Optimistic update
      removeFromInventory(item.id);
      setStash([...stash, item]);

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
  }, [isConnected, signAndSubmit, isInDungeon, removeFromInventory, stash, setStash, addNotification]);

  const withdrawFromStash = useCallback(async (item: Item): Promise<boolean> => {
    if (!isConnected || !signAndSubmit) {
      setError('Wallet not connected');
      return false;
    }

    if (isInDungeon) {
      setError('Cannot access stash while in dungeon');
      addNotification({
        type: 'warning',
        message: 'Cannot access stash while in dungeon',
        duration: 3000,
      });
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signAndSubmit({
        function: 'stash::withdraw',
        typeArguments: [],
        functionArguments: [item.id],
      });

      // Optimistic update
      setStash(stash.filter((i) => i.id !== item.id));
      addToInventory(item);

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
  }, [isConnected, signAndSubmit, isInDungeon, stash, setStash, addToInventory, addNotification]);

  const useConsumable = useCallback(async (item: Item): Promise<boolean> => {
    if (!isConnected || !signAndSubmit) {
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
      await signAndSubmit({
        function: 'hero::use_item',
        typeArguments: [],
        functionArguments: [item.id],
      });

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
  }, [isConnected, signAndSubmit, removeFromInventory, addNotification]);

  return {
    equipItem,
    unequipItem,
    depositToStash,
    withdrawFromStash,
    useConsumable,
    isLoading,
    error,
  };
}
