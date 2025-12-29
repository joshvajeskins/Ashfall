'use client';

import { useState } from 'react';
import { useCharacter } from '@/hooks/useCharacter';
import { CharacterCard } from './CharacterCard';
import { CharacterCreate } from './CharacterCreate';

interface CharacterSelectProps {
  onSelect?: () => void;
  onEquipmentClick?: (slot: 'weapon' | 'armor' | 'accessory') => void;
}

export function CharacterSelect({ onSelect, onEquipmentClick }: CharacterSelectProps) {
  const { character, isLoading, error, refetch } = useCharacter();
  const [showCreate, setShowCreate] = useState(false);

  const handleCharacterCreated = async () => {
    setShowCreate(false);
    await refetch();
    onSelect?.();
  };

  if (isLoading) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-8 text-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-zinc-800 rounded-full"></div>
          <div className="h-4 w-32 bg-zinc-800 rounded"></div>
          <div className="h-3 w-24 bg-zinc-800 rounded"></div>
        </div>
        <p className="text-zinc-500 mt-4">Loading character...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900 border border-red-700 rounded-lg p-6">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load character</p>
          <p className="text-zinc-500 text-sm mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No character exists or character is dead
  if (!character || !character.isAlive) {
    return (
      <>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <div className="text-center space-y-4">
            {character && !character.isAlive ? (
              <>
                <div className="w-16 h-16 mx-auto bg-red-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-500">Your Hero Has Fallen</h3>
                  <p className="text-zinc-400 text-sm mt-2">
                    Your {character.class} died in the dungeon. All equipped items were lost.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto bg-zinc-800 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">No Character Found</h3>
                  <p className="text-zinc-400 text-sm mt-2">
                    Create a new character to begin your adventure.
                  </p>
                </div>
              </>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
            >
              Create New Character
            </button>
          </div>
        </div>

        {showCreate && (
          <CharacterCreate
            onClose={() => setShowCreate(false)}
            onCreated={handleCharacterCreated}
          />
        )}
      </>
    );
  }

  // Character exists and is alive
  return (
    <div className="space-y-4">
      <CharacterCard
        character={character}
        onEquipmentClick={onEquipmentClick}
      />
      <div className="flex gap-3">
        <button
          onClick={onSelect}
          className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
        >
          Enter Dungeon
        </button>
        <button
          className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          title="View Stash"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
