'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useGameStore } from '@/stores/gameStore';
import { useWalletStore } from '@/stores/walletStore';
import { reportPlayerDeath } from '@/lib/move/dungeonService';
import type { Item } from '@/types';

const RARITY_COLORS: Record<string, string> = {
  Common: 'text-gray-400',
  Uncommon: 'text-green-400',
  Rare: 'text-blue-400',
  Epic: 'text-purple-400',
  Legendary: 'text-yellow-400',
};

export function DeathScreen() {
  const { activeModal, deathState, setDeathChainConfirmed, closeModal } = useUIStore();
  const { die } = useGameStore();
  const { address } = useWalletStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [chainError, setChainError] = useState<string | null>(null);

  const isOpen = activeModal === 'death';

  const processDeathOnChain = useCallback(async () => {
    if (!address) {
      setChainError('Wallet not connected');
      return;
    }

    setIsProcessing(true);
    setChainError(null);

    try {
      const result = await reportPlayerDeath(address);
      if (result.success) {
        setDeathChainConfirmed();
      } else {
        setChainError(result.error || 'Failed to process death');
      }
    } catch (error) {
      console.error('Failed to process death on chain:', error);
      setChainError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }, [address, setDeathChainConfirmed]);

  useEffect(() => {
    if (isOpen && !deathState.isChainConfirmed && address) {
      processDeathOnChain();
    }
  }, [isOpen, deathState.isChainConfirmed, address, processDeathOnChain]);

  const handleContinue = () => {
    die();
    closeModal();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="max-w-md w-full mx-4 bg-gray-900 border-2 border-red-900 rounded-lg p-6">
        <h2 className="text-4xl font-bold text-red-600 text-center mb-6 font-mono">
          YOU DIED
        </h2>

        <div className="space-y-4">
          <div className="text-center text-gray-400 font-mono">
            <p>You reached floor <span className="text-white">{deathState.floorReached}</span></p>
          </div>

          {deathState.itemsLost.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-red-400 font-mono mb-2 text-sm">ITEMS BURNED:</h3>
              <ul className="space-y-1">
                {deathState.itemsLost.map((item: Item) => (
                  <li
                    key={item.id}
                    className={`font-mono text-sm flex items-center gap-2 ${RARITY_COLORS[item.rarity] || 'text-gray-400'}`}
                  >
                    <span className="text-red-500">X</span>
                    {item.name}
                    <span className="text-gray-600 text-xs">({item.rarity})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-center text-gray-500 font-mono text-sm">
            {isProcessing ? (
              <p className="flex items-center justify-center gap-2">
                <span className="animate-pulse">Processing on chain...</span>
              </p>
            ) : chainError ? (
              <div className="space-y-2">
                <p className="text-red-500">{chainError}</p>
                <button
                  onClick={processDeathOnChain}
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Retry
                </button>
              </div>
            ) : deathState.isChainConfirmed ? (
              <p className="text-green-500">Death confirmed on chain</p>
            ) : null}
          </div>
        </div>

        <button
          onClick={handleContinue}
          disabled={!deathState.isChainConfirmed || isProcessing}
          className={`w-full mt-6 py-3 px-4 rounded font-mono font-bold transition-colors ${
            deathState.isChainConfirmed && !isProcessing
              ? 'bg-red-700 hover:bg-red-600 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isProcessing ? 'PROCESSING...' : 'CONTINUE'}
        </button>

        <p className="text-center text-gray-600 font-mono text-xs mt-4">
          Create a new character to continue your journey
        </p>
      </div>
    </div>
  );
}
