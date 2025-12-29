'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { useGameStore } from '@/stores/gameStore';
import { heroService } from '@/lib/move/client';
import type { Character, CharacterClass, CharacterStats } from '@/types';

interface UseCharacterResult {
  character: Character | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Default stats for each class
export const CLASS_STATS: Record<CharacterClass, CharacterStats> = {
  Warrior: { strength: 10, agility: 5, intelligence: 3 },
  Rogue: { strength: 5, agility: 10, intelligence: 5 },
  Mage: { strength: 3, agility: 5, intelligence: 12 },
};

export const CLASS_DESCRIPTIONS: Record<CharacterClass, string> = {
  Warrior: 'A mighty warrior with high strength and defense. Excels in melee combat.',
  Rogue: 'A swift rogue with high agility. Masters of critical strikes and evasion.',
  Mage: 'A powerful mage with high intelligence. Commands devastating magical attacks.',
};

export function useCharacter(): UseCharacterResult {
  const { address, isConnected } = useWalletStore();
  const { character, setCharacter } = useGameStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCharacter = useCallback(async () => {
    if (!address || !isConnected) {
      setCharacter(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await heroService.getPlayer(address);

      if (result && Array.isArray(result) && result.length > 0) {
        // Parse the on-chain data into Character type
        const [level, exp, hp, maxHp, mana, maxMana, str, agi, int, isAlive] = result as number[];

        const characterData: Character = {
          id: 1, // Single character per wallet
          owner: address,
          class: 'Warrior', // Will need to fetch class separately or store it
          level: Number(level) || 1,
          experience: Number(exp) || 0,
          health: Number(hp) || 100,
          maxHealth: Number(maxHp) || 100,
          mana: Number(mana) || 50,
          maxMana: Number(maxMana) || 50,
          stats: {
            strength: Number(str) || 10,
            agility: Number(agi) || 5,
            intelligence: Number(int) || 3,
          },
          equipment: {},
          isAlive: Boolean(isAlive),
        };

        setCharacter(characterData);
      } else {
        // No character exists
        setCharacter(null);
      }
    } catch (err) {
      // Character doesn't exist or error fetching
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch character';

      // If the error indicates no resource, character doesn't exist
      if (errorMessage.includes('not found') || errorMessage.includes('RESOURCE_NOT_FOUND')) {
        setCharacter(null);
        setError(null);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, setCharacter]);

  useEffect(() => {
    fetchCharacter();
  }, [fetchCharacter]);

  return {
    character,
    isLoading,
    error,
    refetch: fetchCharacter,
  };
}
