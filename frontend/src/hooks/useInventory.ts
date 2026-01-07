'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { useGameStore } from '@/stores/gameStore';
import { heroService } from '@/lib/move/client';
import type { Item, ItemType } from '@/types';

type FilterType = 'All' | ItemType;

interface UseInventoryResult {
  inventory: Item[];
  filteredInventory: Item[];
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  itemsByType: Record<ItemType, Item[]>;
  itemCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useInventory(): UseInventoryResult {
  const { address, isConnected } = useWalletStore();
  const { inventory, setInventory } = useGameStore();
  const [filter, setFilter] = useState<FilterType>('All');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    if (!address || !isConnected) {
      setInventory([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if character exists first
      const [exists] = await heroService.characterExists(address);

      if (!exists) {
        setInventory([]);
        return;
      }

      // Get equipped items (inventory is equipment in this game model)
      const [weaponId, armorId, accessoryId] = await heroService.getEquipmentIds(address);
      const items: Item[] = [];

      // Add equipped weapon if exists
      if (Number(weaponId) > 0) {
        items.push({
          id: Number(weaponId),
          name: `Equipped Weapon #${weaponId}`,
          rarity: 'Common',
          type: 'Weapon',
          stats: { damage: 10 },
          enchantments: [],
          durability: 100,
          killCount: 0,
          isEquipped: true,
        });
      }

      // Add equipped armor if exists
      if (Number(armorId) > 0) {
        items.push({
          id: Number(armorId),
          name: `Equipped Armor #${armorId}`,
          rarity: 'Common',
          type: 'Armor',
          stats: { defense: 5 },
          enchantments: [],
          durability: 100,
          killCount: 0,
          isEquipped: true,
        });
      }

      // Add equipped accessory if exists
      if (Number(accessoryId) > 0) {
        items.push({
          id: Number(accessoryId),
          name: `Equipped Accessory #${accessoryId}`,
          rarity: 'Common',
          type: 'Accessory',
          stats: {},
          enchantments: [],
          durability: 100,
          killCount: 0,
          isEquipped: true,
        });
      }

      setInventory(items);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch inventory';
      if (errorMessage.includes('not found') || errorMessage.includes('RESOURCE_NOT_FOUND')) {
        setInventory([]);
        setError(null);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, setInventory]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const itemsByType = useMemo(() => {
    const grouped: Record<ItemType, Item[]> = {
      Weapon: [],
      Armor: [],
      Accessory: [],
      Consumable: [],
    };

    inventory.forEach((item) => {
      grouped[item.type].push(item);
    });

    return grouped;
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    if (filter === 'All') return inventory;
    return inventory.filter((item) => item.type === filter);
  }, [inventory, filter]);

  return {
    inventory,
    filteredInventory,
    filter,
    setFilter,
    itemsByType,
    itemCount: inventory.length,
    isLoading,
    error,
    refetch: fetchInventory,
  };
}
