'use client';

import { useState } from 'react';
import type { CharacterClass } from '@/types';
import { CLASS_STATS, CLASS_DESCRIPTIONS } from '@/hooks/useCharacter';
import { useCreateCharacter } from '@/hooks/useCreateCharacter';

interface CharacterCreateProps {
  onClose: () => void;
  onCreated: () => void;
}

const CLASSES: CharacterClass[] = ['Warrior', 'Rogue', 'Mage'];

const CLASS_COLORS: Record<CharacterClass, string> = {
  Warrior: 'border-red-500 bg-red-950/30',
  Rogue: 'border-green-500 bg-green-950/30',
  Mage: 'border-blue-500 bg-blue-950/30',
};

// Character class images
const CLASS_IMAGES: Record<CharacterClass, string> = {
  Warrior: '/assets/characters/warrior.png',
  Rogue: '/assets/characters/rogue.png',
  Mage: '/assets/characters/mage.png',
};

export function CharacterCreate({ onClose, onCreated }: CharacterCreateProps) {
  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(null);
  const { createCharacter, isCreating, error } = useCreateCharacter();

  const handleCreate = async () => {
    if (!selectedClass) return;

    const success = await createCharacter(selectedClass);
    if (success) {
      onCreated();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Create Character</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-zinc-400 text-sm">
            Choose your class. This decision is permanent - choose wisely.
          </p>

          {/* Class selection */}
          <div className="space-y-3">
            {CLASSES.map((cls) => (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`
                  w-full p-4 rounded-lg border-2 transition-all text-left
                  ${selectedClass === cls
                    ? CLASS_COLORS[cls]
                    : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-14 h-14 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden border ${
                    selectedClass === cls ? 'border-white' : 'border-zinc-700'
                  }`}>
                    <img
                      src={CLASS_IMAGES[cls]}
                      alt={cls}
                      className="w-12 h-12 object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{cls}</h3>
                    <p className="text-xs text-zinc-400 mt-1">{CLASS_DESCRIPTIONS[cls]}</p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className="text-red-400">STR {CLASS_STATS[cls].strength}</span>
                      <span className="text-green-400">AGI {CLASS_STATS[cls].agility}</span>
                      <span className="text-blue-400">INT {CLASS_STATS[cls].intelligence}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Stats preview */}
          {selectedClass && (
            <div className="bg-zinc-800 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium text-zinc-300">Starting Stats</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Health</span>
                  <span className="text-zinc-200">100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Mana</span>
                  <span className="text-zinc-200">50</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Level</span>
                  <span className="text-zinc-200">1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Experience</span>
                  <span className="text-zinc-200">0</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedClass || isCreating}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create Character'}
          </button>
        </div>
      </div>
    </div>
  );
}
