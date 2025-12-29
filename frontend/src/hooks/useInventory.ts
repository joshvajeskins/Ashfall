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
      const result = await heroService.getInventory(address);

      if (result && Array.isArray(result)) {
        const items = parseInventoryData(result);
        setInventory(items);
      } else {
        setInventory([]);
      }
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

// Parse on-chain inventory data into Item objects
function parseInventoryData(data: unknown[]): Item[] {
  // This will need to be adjusted based on actual on-chain data format
  // For now, return mock data structure
  return data.map((item, index) => {
    if (typeof item === 'object' && item !== null) {
      const rawItem = item as Record<string, unknown>;
      return {
        id: Number(rawItem.id) || index,
        name: String(rawItem.name || 'Unknown Item'),
        rarity: parseRarity(rawItem.rarity),
        type: parseItemType(rawItem.type),
        stats: parseStats(rawItem.stats),
        enchantments: [],
        durability: Number(rawItem.durability) || 100,
        killCount: Number(rawItem.kill_count) || 0,
        origin: rawItem.origin ? {
          dungeonId: Number((rawItem.origin as Record<string, unknown>).dungeon_id) || 0,
          floor: Number((rawItem.origin as Record<string, unknown>).floor) || 0,
        } : undefined,
        isEquipped: Boolean(rawItem.is_equipped),
      };
    }
    return createDefaultItem(index);
  });
}

function parseRarity(value: unknown): Item['rarity'] {
  const rarities: Item['rarity'][] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  if (typeof value === 'number' && value >= 0 && value < rarities.length) {
    return rarities[value];
  }
  if (typeof value === 'string' && rarities.includes(value as Item['rarity'])) {
    return value as Item['rarity'];
  }
  return 'Common';
}

function parseItemType(value: unknown): ItemType {
  const types: ItemType[] = ['Weapon', 'Armor', 'Accessory', 'Consumable'];
  if (typeof value === 'number' && value >= 0 && value < types.length) {
    return types[value];
  }
  if (typeof value === 'string' && types.includes(value as ItemType)) {
    return value as ItemType;
  }
  return 'Consumable';
}

function parseStats(value: unknown): Item['stats'] {
  if (typeof value === 'object' && value !== null) {
    const stats = value as Record<string, unknown>;
    return {
      damage: stats.damage ? Number(stats.damage) : undefined,
      defense: stats.defense ? Number(stats.defense) : undefined,
      health: stats.health ? Number(stats.health) : undefined,
      mana: stats.mana ? Number(stats.mana) : undefined,
    };
  }
  return {};
}

function createDefaultItem(id: number): Item {
  return {
    id,
    name: 'Unknown Item',
    rarity: 'Common',
    type: 'Consumable',
    stats: {},
    enchantments: [],
    durability: 100,
    killCount: 0,
  };
}
