'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { useGameStore } from '@/stores/gameStore';
import { stashService } from '@/lib/move/client';
import type { Item, ItemType } from '@/types';

const MAX_STASH_CAPACITY = 50;

interface UseStashResult {
  stash: Item[];
  capacity: number;
  maxCapacity: number;
  isFull: boolean;
  canAccessStash: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStash(): UseStashResult {
  const { address, isConnected } = useWalletStore();
  const { stash, setStash, isInDungeon } = useGameStore();
  const [capacity, setCapacity] = useState(MAX_STASH_CAPACITY);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStash = useCallback(async () => {
    if (!address || !isConnected) {
      setStash([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [stashResult, capacityResult] = await Promise.all([
        stashService.getStash(address),
        stashService.getStashCapacity(address).catch(() => [MAX_STASH_CAPACITY]),
      ]);

      if (stashResult && Array.isArray(stashResult)) {
        const items = parseStashData(stashResult);
        setStash(items);
      } else {
        setStash([]);
      }

      if (capacityResult && Array.isArray(capacityResult)) {
        setCapacity(Number(capacityResult[0]) || MAX_STASH_CAPACITY);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stash';
      if (errorMessage.includes('not found') || errorMessage.includes('RESOURCE_NOT_FOUND')) {
        setStash([]);
        setError(null);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, setStash]);

  useEffect(() => {
    fetchStash();
  }, [fetchStash]);

  const isFull = useMemo(() => stash.length >= capacity, [stash.length, capacity]);
  const canAccessStash = useMemo(() => !isInDungeon, [isInDungeon]);

  return {
    stash,
    capacity: stash.length,
    maxCapacity: capacity,
    isFull,
    canAccessStash,
    isLoading,
    error,
    refetch: fetchStash,
  };
}

// Parse on-chain stash data into Item objects
function parseStashData(data: unknown[]): Item[] {
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
