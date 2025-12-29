'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useGameStore } from '@/stores/gameStore';
import { useDungeonClaim } from '@/hooks/useDungeonClaim';
import { gameEvents, GAME_EVENTS } from '@/game/events/GameEvents';
import type { Item } from '@/types';

const RARITY_TEXT: Record<string, string> = {
  Common: 'text-gray-400',
  Uncommon: 'text-green-400',
  Rare: 'text-blue-400',
  Epic: 'text-purple-400',
  Legendary: 'text-yellow-400',
};

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

  const claimLootFromChain = useCallback(async () => {
    if (hasStartedClaim.current) return;
    hasStartedClaim.current = true;

    const success = await claimLoot();
    if (success) {
      transferPendingToInventory();
      setIsTransferred(true);
      gameEvents.emit(GAME_EVENTS.LOOT_TRANSFER, { items: victoryState.lootGained });
    } else {
      hasStartedClaim.current = false;
    }
  }, [claimLoot, transferPendingToInventory, victoryState.lootGained]);

  useEffect(() => {
    if (isOpen && !isTransferred && !isClaimingLoot && !hasStartedClaim.current) {
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        claimLootFromChain();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isTransferred, isClaimingLoot, claimLootFromChain]);

  // Reset ref when modal closes - use setTimeout to avoid synchronous setState
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
    exitDungeonSuccess();
    closeModal();
    gameEvents.emit(GAME_EVENTS.VICTORY_COMPLETE, { lootGained: victoryState.lootGained });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="max-w-md w-full mx-4 bg-gray-900 border-2 border-yellow-500 rounded-lg p-6">
        <h2 className="text-3xl font-bold text-yellow-400 text-center mb-6 font-mono">
          DUNGEON CLEARED!
        </h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center bg-gray-800 rounded-lg p-3">
            <p className="text-gray-500 font-mono text-xs">FLOORS</p>
            <p className="text-2xl font-bold text-white font-mono">
              {victoryState.floorCleared}
            </p>
          </div>
          <div className="text-center bg-gray-800 rounded-lg p-3">
            <p className="text-gray-500 font-mono text-xs">KILLS</p>
            <p className="text-2xl font-bold text-red-400 font-mono">
              {victoryState.enemiesKilled}
            </p>
          </div>
          <div className="text-center bg-gray-800 rounded-lg p-3">
            <p className="text-gray-500 font-mono text-xs">TIME</p>
            <p className="text-2xl font-bold text-blue-400 font-mono">
              {formatTime(victoryState.timeElapsed)}
            </p>
          </div>
        </div>

        {victoryState.lootGained.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <h3 className="text-yellow-400 font-mono mb-3 text-sm flex items-center gap-2">
              LOOT GAINED
              {isClaimingLoot && (
                <span className="text-gray-500 animate-pulse">(claiming...)</span>
              )}
              {isTransferred && (
                <span className="text-green-400">claimed!</span>
              )}
              {claimError && !isClaimingLoot && (
                <span className="text-red-400">failed</span>
              )}
            </h3>
            <ul className="space-y-1 max-h-32 overflow-y-auto">
              {victoryState.lootGained.map((item: Item) => (
                <li
                  key={item.id}
                  className={`font-mono text-sm flex items-center gap-2 ${RARITY_TEXT[item.rarity] || 'text-gray-400'}`}
                >
                  <span className="text-yellow-500">+</span>
                  {item.name}
                  <span className="text-gray-600 text-xs">({item.rarity})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {victoryState.lootGained.length === 0 && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6 text-center">
            <p className="text-gray-500 font-mono text-sm">No loot this run</p>
          </div>
        )}

        {claimError && !isClaimingLoot && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mb-4">
            <p className="text-red-400 font-mono text-sm">{claimError}</p>
            <button
              onClick={handleRetry}
              className="mt-2 text-red-300 hover:text-red-200 font-mono text-xs underline"
            >
              Retry
            </button>
          </div>
        )}

        <button
          onClick={handleReturn}
          disabled={isClaimingLoot || !isTransferred}
          className={`w-full py-3 px-4 rounded font-mono font-bold transition-colors ${
            isTransferred && !isClaimingLoot
              ? 'bg-yellow-600 hover:bg-yellow-500 text-black'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isClaimingLoot ? 'CLAIMING LOOT...' : isTransferred ? 'RETURN TO TOWN' : 'WAITING...'}
        </button>

        <p className="text-center text-gray-600 font-mono text-xs mt-4">
          {isTransferred
            ? 'Items have been added to your stash'
            : isClaimingLoot
            ? 'Confirming on-chain...'
            : 'Preparing loot transfer'}
        </p>
      </div>
    </div>
  );
}
