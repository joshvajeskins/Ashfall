'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { useGameStore } from '@/stores/gameStore';
import { stashService } from '@/lib/move/client';
import type { Item } from '@/types';

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
      // First check if stash exists
      const [stashExists] = await stashService.stashExists(address);

      if (!stashExists) {
        setStash([]);
        setCapacity(MAX_STASH_CAPACITY);
        return;
      }

      // Fetch stash counts
      const [weapons, armors, accessories, consumables, gold] = await stashService.getStashCounts(address);
      const [remainingCapacity] = await stashService.getStashCapacityRemaining(address);

      // For now, create placeholder items based on counts
      // Full item data would require additional view functions or indexer
      const items: Item[] = [];

      // Add weapon placeholders
      for (let i = 0; i < Number(weapons); i++) {
        items.push({
          id: i,
          name: `Weapon ${i + 1}`,
          rarity: 'Common',
          type: 'Weapon',
          stats: { damage: 10 },
          enchantments: [],
          durability: 100,
          killCount: 0,
        });
      }

      // Add armor placeholders
      for (let i = 0; i < Number(armors); i++) {
        items.push({
          id: 100 + i,
          name: `Armor ${i + 1}`,
          rarity: 'Common',
          type: 'Armor',
          stats: { defense: 5 },
          enchantments: [],
          durability: 100,
          killCount: 0,
        });
      }

      // Add accessory placeholders
      for (let i = 0; i < Number(accessories); i++) {
        items.push({
          id: 200 + i,
          name: `Accessory ${i + 1}`,
          rarity: 'Common',
          type: 'Accessory',
          stats: {},
          enchantments: [],
          durability: 100,
          killCount: 0,
        });
      }

      // Add consumable placeholders
      for (let i = 0; i < Number(consumables); i++) {
        items.push({
          id: 300 + i,
          name: `Consumable ${i + 1}`,
          rarity: 'Common',
          type: 'Consumable',
          stats: { health: 50 },
          enchantments: [],
          durability: 100,
          killCount: 0,
        });
      }

      setStash(items);
      setCapacity(MAX_STASH_CAPACITY - Number(remainingCapacity));
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
