'use client';

import { useState } from 'react';
import { useCharacter } from '@/hooks/useCharacter';
import { useUIStore } from '@/stores/uiStore';
import { useGameStore } from '@/stores/gameStore';
import { CharacterCard } from './CharacterCard';
import { CharacterCreate, CharacterCreateMode } from './CharacterCreate';
import { ImagePanel } from '@/components/ui/ImagePanel';
import { ImageButton } from '@/components/ui/ImageButton';
import { soundManager } from '@/game/effects/SoundManager';

interface CharacterSelectProps {
  onSelect?: () => void;
  onEquipmentClick?: (slot: 'weapon' | 'armor' | 'accessory') => void;
}

export function CharacterSelect({ onSelect, onEquipmentClick }: CharacterSelectProps) {
  const { character, isLoading, error, refetch } = useCharacter();
  const { openModal } = useUIStore();
  const { deleteCharacter } = useGameStore();
  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<CharacterCreateMode>('create');

  const handleCharacterCreated = async () => {
    // Clear local store when replacing/reviving
    if (createMode === 'replace' || createMode === 'revive') {
      deleteCharacter();
    }
    setShowCreate(false);
    await refetch();
    onSelect?.();
  };

  const handleNewCharacter = () => {
    soundManager.play('buttonClick');
    setCreateMode('replace');
    setShowCreate(true);
  };

  const handleRefetch = () => {
    soundManager.play('buttonClick');
    refetch();
  };

  if (isLoading) {
    return (
      <ImagePanel size="medium" width={400}>
        <div style={{ padding: 32, textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: '0 auto 16px',
              border: '4px solid #ca8a04',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ color: '#9ca3af', textShadow: '1px 1px 0 #000' }}>
            Loading character...
          </p>
        </div>
      </ImagePanel>
    );
  }

  if (error) {
    return (
      <ImagePanel size="medium" width={400}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <img
            src="/assets/environment/skull.png"
            alt=""
            style={{ width: 48, height: 48, margin: '0 auto 16px', imageRendering: 'pixelated' }}
          />
          <p style={{ color: '#f87171', marginBottom: 8, textShadow: '1px 1px 0 #000' }}>
            Failed to load character
          </p>
          <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16, textShadow: '1px 1px 0 #000' }}>
            {error}
          </p>
          <ImageButton variant="secondary" size="md" onClick={handleRefetch}>
            Retry
          </ImageButton>
        </div>
      </ImagePanel>
    );
  }

  // No character exists or character is dead
  if (!character || !character.isAlive) {
    return (
      <>
        <ImagePanel size="medium" width={400}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            {character && !character.isAlive ? (
              <>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    margin: '0 auto 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundImage: 'url(/assets/ui/slots/slot-epic.png)',
                    backgroundSize: '100% 100%',
                    imageRendering: 'pixelated' as const,
                  }}
                >
                  <img
                    src="/assets/environment/skull.png"
                    alt=""
                    style={{ width: 40, height: 40, imageRendering: 'pixelated' }}
                  />
                </div>
                <h3
                  style={{
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: '#ef4444',
                    textShadow: '2px 2px 0 #000',
                    marginBottom: 8,
                  }}
                >
                  Your Hero Has Fallen
                </h3>
                <p style={{ color: '#9ca3af', fontSize: 14, textShadow: '1px 1px 0 #000', marginBottom: 16 }}>
                  Your {character.class} died in the dungeon. All equipped items were lost.
                </p>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    margin: '0 auto 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundImage: 'url(/assets/ui/slots/slot-empty.png)',
                    backgroundSize: '100% 100%',
                    imageRendering: 'pixelated' as const,
                  }}
                >
                  <span style={{ fontSize: 32, color: '#9ca3af' }}>?</span>
                </div>
                <h3
                  style={{
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: '#fef3c7',
                    textShadow: '2px 2px 0 #000',
                    marginBottom: 8,
                  }}
                >
                  No Character Found
                </h3>
                <p style={{ color: '#9ca3af', fontSize: 14, textShadow: '1px 1px 0 #000', marginBottom: 16 }}>
                  Create a new character to begin your adventure.
                </p>
              </>
            )}
            <ImageButton
              variant="primary"
              size="lg"
              onClick={() => {
                soundManager.play('buttonClick');
                // Use 'revive' mode for dead characters, 'create' for new
                setCreateMode(character && !character.isAlive ? 'revive' : 'create');
                setShowCreate(true);
              }}
            >
              {character && !character.isAlive ? 'Rise Again' : 'Create Character'}
            </ImageButton>
          </div>
        </ImagePanel>

        {showCreate && (
          <CharacterCreate
            mode={createMode}
            onClose={() => setShowCreate(false)}
            onCreated={handleCharacterCreated}
          />
        )}
      </>
    );
  }

  // Character exists and is alive
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <CharacterCard
          character={character}
          onEquipmentClick={onEquipmentClick}
        />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <ImageButton variant="primary" size="lg" onClick={onSelect}>
            Enter Dungeon
          </ImageButton>
          <button
            style={{
              width: 56,
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundImage: 'url(/assets/ui/slots/slot-rare.png)',
              backgroundSize: '100% 100%',
              imageRendering: 'pixelated' as const,
              border: 'none',
              cursor: 'pointer',
            }}
            title="View Stash"
            onClick={() => {
              soundManager.play('menuOpen');
              openModal('stash');
            }}
          >
            <img
              src="/assets/environment/chest.png"
              alt="Stash"
              style={{ width: 40, height: 40, imageRendering: 'pixelated' }}
            />
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleNewCharacter}
            style={{
              fontSize: 12,
              color: '#9ca3af',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              textShadow: '1px 1px 0 #000',
            }}
          >
            Start Fresh (New Character)
          </button>
        </div>
      </div>

      {showCreate && (
        <CharacterCreate
          mode={createMode}
          onClose={() => setShowCreate(false)}
          onCreated={handleCharacterCreated}
        />
      )}
    </>
  );
}
