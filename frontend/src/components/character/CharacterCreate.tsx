'use client';

import { useState } from 'react';
import type { CharacterClass } from '@/types';
import { CLASS_STATS, CLASS_DESCRIPTIONS } from '@/hooks/useCharacter';
import { useCreateCharacter } from '@/hooks/useCreateCharacter';
import { ImageButton } from '@/components/ui/ImageButton';
import { ImagePanel, PanelDivider } from '@/components/ui/ImagePanel';
import { soundManager } from '@/game/effects/SoundManager';

export type CharacterCreateMode = 'create' | 'replace' | 'revive';

interface CharacterCreateProps {
  onClose: () => void;
  onCreated: () => void;
  mode?: CharacterCreateMode;
}

const CLASSES: CharacterClass[] = ['Warrior', 'Rogue', 'Mage'];

const CLASS_IMAGES: Record<CharacterClass, string> = {
  Warrior: '/assets/characters/warrior.png',
  Rogue: '/assets/characters/rogue.png',
  Mage: '/assets/characters/mage.png',
};

const ICON_CLOSE = '/assets/ui/icons/icon-close.png';

const MODE_CONFIG = {
  create: {
    title: 'Create Character',
    instruction: 'Choose your class. This decision is permanent.',
    buttonText: 'Create',
    buttonTextLoading: 'Creating...',
  },
  replace: {
    title: 'Replace Character',
    instruction: 'Warning: Your current character and ALL equipped items will be permanently destroyed!',
    buttonText: 'Replace Character',
    buttonTextLoading: 'Replacing...',
  },
  revive: {
    title: 'Rise Again',
    instruction: 'Your hero has fallen. Choose a new class to continue your journey.',
    buttonText: 'Begin Anew',
    buttonTextLoading: 'Creating...',
  },
};

export function CharacterCreate({ onClose, onCreated, mode = 'create' }: CharacterCreateProps) {
  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { createCharacter, replaceCharacter, isCreating, error } = useCreateCharacter();
  const config = MODE_CONFIG[mode];

  const handleClassSelect = (cls: CharacterClass) => {
    soundManager.play('buttonClick');
    setSelectedClass(cls);
  };

  const handleCreate = async () => {
    if (!selectedClass) return;

    // For replace mode, show confirmation first
    if (mode === 'replace' && !showConfirmation) {
      soundManager.play('buttonClick');
      setShowConfirmation(true);
      return;
    }

    soundManager.play('buttonClick');

    // Use replaceCharacter for replace/revive modes (handles existing character)
    const success = mode === 'create'
      ? await createCharacter(selectedClass)
      : await replaceCharacter(selectedClass);

    if (success) {
      soundManager.play('levelUp');
      onCreated();
    } else {
      soundManager.play('error');
    }
  };

  const handleCancelConfirmation = () => {
    soundManager.play('error');
    setShowConfirmation(false);
  };

  const handleClose = () => {
    soundManager.play('error');
    onClose();
  };

  return (
    <div
      className="absolute left-0 right-0 bottom-0 flex items-center justify-center z-50 p-4"
      style={{
        top: 70, // Below header
        backgroundImage: 'url(/assets/backgrounds/character-select.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative max-w-2xl w-full mx-auto">
        <ImagePanel size="large">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-xl font-bold text-yellow-100"
              style={{ textShadow: '2px 2px 0 #000' }}
            >
              {config.title}
            </h2>
            {mode !== 'revive' && (
              <button
                onClick={handleClose}
                className="w-8 h-8 hover:brightness-125 transition-all"
              >
                <img
                  src={ICON_CLOSE}
                  alt="Close"
                  className="w-full h-full"
                  style={{ imageRendering: 'pixelated' }}
                />
              </button>
            )}
          </div>

          <PanelDivider />

          {/* Instructions */}
          <p
            className={`text-center mb-4 ${mode === 'replace' ? 'text-red-400' : 'text-gray-300'}`}
            style={{ textShadow: '1px 1px 0 #000' }}
          >
            {config.instruction}
          </p>

          {/* Class selection */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {CLASSES.map((cls) => (
              <button
                key={cls}
                onClick={() => handleClassSelect(cls)}
                className={`
                  relative p-3 transition-all hover:scale-105 rounded-lg
                  ${selectedClass === cls ? 'scale-105 bg-yellow-900/40 ring-2 ring-yellow-400' : 'bg-black/30 hover:bg-black/50'}
                `}
              >
                <div className="flex flex-col items-center">
                  <img
                    src={CLASS_IMAGES[cls]}
                    alt={cls}
                    className="w-24 h-24 object-contain mb-2"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <h3
                    className="font-bold text-yellow-100 text-lg"
                    style={{ textShadow: '2px 2px 0 #000' }}
                  >
                    {cls}
                  </h3>
                  <p
                    className="text-[10px] text-gray-300 text-center mt-1 px-2"
                    style={{ textShadow: '1px 1px 0 #000' }}
                  >
                    {CLASS_DESCRIPTIONS[cls]}
                  </p>
                  <div className="flex gap-2 mt-2 text-[10px]">
                    <span className="text-red-400">STR {CLASS_STATS[cls].strength}</span>
                    <span className="text-green-400">AGI {CLASS_STATS[cls].agility}</span>
                    <span className="text-blue-400">INT {CLASS_STATS[cls].intelligence}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <PanelDivider />

          {/* Stats preview */}
          {selectedClass && (
            <div
              className="mb-4"
              style={{
                backgroundImage: 'url(/assets/ui/panels/panel-small.png)',
                backgroundSize: '100% 100%',
                imageRendering: 'pixelated',
                padding: '32px 56px',
              }}
            >
              <h4
                className="text-sm font-bold text-yellow-100 mb-2 text-center"
                style={{ textShadow: '1px 1px 0 #000' }}
              >
                Starting Stats
              </h4>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Health</span>
                  <span className="text-white font-bold">100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Mana</span>
                  <span className="text-white font-bold">50</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Level</span>
                  <span className="text-white font-bold">1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Experience</span>
                  <span className="text-white font-bold">0</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div
              className="p-3 mb-4 text-center"
              style={{
                backgroundImage: 'url(/assets/ui/slots/slot-epic.png)',
                backgroundSize: '100% 100%',
                imageRendering: 'pixelated',
              }}
            >
              <p className="text-red-400 text-sm" style={{ textShadow: '1px 1px 0 #000' }}>
                {error}
              </p>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex gap-4 justify-center">
            {mode !== 'revive' && (
              <ImageButton
                variant="secondary"
                size="md"
                onClick={handleClose}
                disabled={isCreating}
                soundType="cancel"
                playSound={false}
              >
                Cancel
              </ImageButton>
            )}
            <ImageButton
              variant={mode === 'replace' ? 'danger' : 'primary'}
              size="md"
              onClick={handleCreate}
              disabled={!selectedClass || isCreating}
            >
              {isCreating ? config.buttonTextLoading : config.buttonText}
            </ImageButton>
          </div>
        </ImagePanel>

        {/* Confirmation Modal for Replace */}
        {showConfirmation && (
          <div className="absolute inset-0 flex items-center justify-center z-60">
            <div className="absolute inset-0 bg-black/80" onClick={handleCancelConfirmation} />
            <div className="relative">
              <ImagePanel size="small">
                <h3
                  className="text-lg font-bold text-red-400 mb-4 text-center"
                  style={{ textShadow: '2px 2px 0 #000' }}
                >
                  Are you sure?
                </h3>
                <p
                  className="text-gray-300 text-sm mb-4 text-center"
                  style={{ textShadow: '1px 1px 0 #000' }}
                >
                  This will permanently destroy your current character
                  and all equipped items. This cannot be undone.
                </p>
                <div className="flex gap-4 justify-center">
                  <ImageButton
                    variant="secondary"
                    size="sm"
                    onClick={handleCancelConfirmation}
                    disabled={isCreating}
                  >
                    Go Back
                  </ImageButton>
                  <ImageButton
                    variant="danger"
                    size="sm"
                    onClick={handleCreate}
                    disabled={isCreating}
                  >
                    {isCreating ? 'Replacing...' : 'Confirm Delete'}
                  </ImageButton>
                </div>
              </ImagePanel>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
