'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useGameStore } from '@/stores/gameStore';
import { useDungeonClaim } from '@/hooks/useDungeonClaim';
import { gameEvents, GAME_EVENTS } from '@/game/events/GameEvents';
import { ImagePanel, PanelDivider } from '@/components/ui/ImagePanel';
import { ImageButton } from '@/components/ui/ImageButton';
import { ImageSlot } from '@/components/ui/ImageSlot';
import { soundManager } from '@/game/effects/SoundManager';
import type { Item } from '@/types';

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function VictoryScreen() {
  const { activeModal, victoryState, closeModal } = useUIStore();
  const { exitDungeonSuccess, transferPendingToInventory } = useGameStore();
  const { claimLoot, isClaimingLoot, claimError } = useDungeonClaim();
  const [isTransferred, setIsTransferred] = useState(false);
  const hasStartedClaim = useRef(false);

  const isOpen = activeModal === 'victory';

  useEffect(() => {
    if (isOpen) {
      soundManager.play('victory');
    }
  }, [isOpen]);

  const claimLootFromChain = useCallback(async () => {
    if (hasStartedClaim.current) return;
    hasStartedClaim.current = true;

    const success = await claimLoot();
    if (success) {
      soundManager.play('itemPickup');
      transferPendingToInventory();
      setIsTransferred(true);
      gameEvents.emit(GAME_EVENTS.LOOT_TRANSFER, { items: victoryState.lootGained });
    } else {
      soundManager.play('error');
      hasStartedClaim.current = false;
    }
  }, [claimLoot, transferPendingToInventory, victoryState.lootGained]);

  useEffect(() => {
    if (isOpen && !isTransferred && !isClaimingLoot && !hasStartedClaim.current) {
      const timer = setTimeout(() => {
        claimLootFromChain();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isTransferred, isClaimingLoot, claimLootFromChain]);

  useEffect(() => {
    if (!isOpen) {
      hasStartedClaim.current = false;
      const timer = setTimeout(() => setIsTransferred(false), 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleRetry = () => {
    hasStartedClaim.current = false;
    claimLootFromChain();
  };

  const handleReturn = () => {
    if (!isTransferred) return;
    soundManager.play('buttonClick');
    exitDungeonSuccess();
    closeModal();
    gameEvents.emit(GAME_EVENTS.VICTORY_COMPLETE, { lootGained: victoryState.lootGained });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundImage: 'url(/assets/backgrounds/victory.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative max-w-md w-full mx-4">
        <ImagePanel size="large">
          <h2
            className="text-3xl font-bold text-yellow-400 text-center mb-6"
            style={{
              textShadow: '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
            }}
          >
            DUNGEON CLEARED!
          </h2>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'FLOORS', value: victoryState.floorCleared, color: 'text-white' },
              { label: 'KILLS', value: victoryState.enemiesKilled, color: 'text-red-400' },
              { label: 'TIME', value: formatTime(victoryState.timeElapsed), color: 'text-blue-400' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center p-3"
                style={{
                  backgroundImage: 'url(/assets/ui/slots/slot-common.png)',
                  backgroundSize: '100% 100%',
                  imageRendering: 'pixelated',
                }}
              >
                <p className="text-gray-400 text-xs" style={{ textShadow: '1px 1px 0 #000' }}>
                  {stat.label}
                </p>
                <p
                  className={`text-2xl font-bold ${stat.color}`}
                  style={{ textShadow: '2px 2px 0 #000' }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Loot section */}
          {victoryState.lootGained.length > 0 && (
            <div
              className="p-4 mb-4"
              style={{
                backgroundImage: 'url(/assets/ui/panels/panel-small.png)',
                backgroundSize: '100% 100%',
                imageRendering: 'pixelated',
              }}
            >
              <h3 className="text-yellow-400 mb-3 text-sm font-bold flex items-center gap-2">
                <span style={{ textShadow: '1px 1px 0 #000' }}>LOOT GAINED</span>
                {isClaimingLoot && (
                  <span className="text-gray-500 text-xs animate-pulse">(claiming...)</span>
                )}
                {isTransferred && (
                  <span className="text-green-400 text-xs">claimed!</span>
                )}
                {claimError && !isClaimingLoot && (
                  <span className="text-red-400 text-xs">failed</span>
                )}
              </h3>
              <div className="grid grid-cols-5 gap-2 max-h-24 overflow-y-auto">
                {victoryState.lootGained.map((item: Item) => (
                  <ImageSlot key={item.id} item={item} size="sm" />
                ))}
              </div>
            </div>
          )}

          {victoryState.lootGained.length === 0 && (
            <div
              className="p-4 mb-4 text-center"
              style={{
                backgroundImage: 'url(/assets/ui/panels/panel-small.png)',
                backgroundSize: '100% 100%',
                imageRendering: 'pixelated',
              }}
            >
              <p className="text-gray-500" style={{ textShadow: '1px 1px 0 #000' }}>
                No loot this run
              </p>
            </div>
          )}

          {claimError && !isClaimingLoot && (
            <div
              className="p-3 mb-4"
              style={{
                backgroundImage: 'url(/assets/ui/slots/slot-epic.png)',
                backgroundSize: '100% 100%',
                imageRendering: 'pixelated',
              }}
            >
              <p className="text-red-400 text-sm" style={{ textShadow: '1px 1px 0 #000' }}>
                {claimError}
              </p>
              <button
                onClick={handleRetry}
                className="mt-2 text-red-300 hover:text-red-200 text-xs underline"
              >
                Retry
              </button>
            </div>
          )}

          <PanelDivider />

          <div className="flex justify-center">
            <ImageButton
              variant="primary"
              size="lg"
              onClick={handleReturn}
              disabled={isClaimingLoot || !isTransferred}
            >
              {isClaimingLoot ? 'CLAIMING...' : isTransferred ? 'RETURN TO TOWN' : 'WAITING...'}
            </ImageButton>
          </div>

          <p
            className="text-center text-gray-500 text-xs mt-4"
            style={{ textShadow: '1px 1px 0 #000' }}
          >
            {isTransferred
              ? 'Items have been added to your stash'
              : isClaimingLoot
              ? 'Confirming on-chain...'
              : 'Preparing loot transfer'}
          </p>
        </ImagePanel>
      </div>
    </div>
  );
}
