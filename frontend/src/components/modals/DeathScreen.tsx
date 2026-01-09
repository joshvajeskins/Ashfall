'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useGameStore } from '@/stores/gameStore';
import { useWalletStore } from '@/stores/walletStore';
import { reportPlayerDeath } from '@/lib/move/dungeonService';
import { ImagePanel, PanelDivider } from '@/components/ui/ImagePanel';
import { ImageButton } from '@/components/ui/ImageButton';
import { ImageSlot } from '@/components/ui/ImageSlot';
import { soundManager } from '@/game/effects/SoundManager';
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

  useEffect(() => {
    if (isOpen) {
      soundManager.play('playerDeath');
    }
  }, [isOpen]);

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
        soundManager.play('error');
        setChainError(result.error || 'Failed to process death');
      }
    } catch (error) {
      console.error('Failed to process death on chain:', error);
      soundManager.play('error');
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
    soundManager.play('buttonClick');
    die();
    closeModal();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundImage: 'url(/assets/backgrounds/game-over.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative max-w-md w-full mx-4">
        <ImagePanel size="medium">
          <h2
            className="text-4xl font-bold text-red-600 text-center mb-6"
            style={{
              textShadow: '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
            }}
          >
            YOU DIED
          </h2>

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-gray-400" style={{ textShadow: '1px 1px 0 #000' }}>
                You reached floor{' '}
                <span className="text-yellow-100 font-bold">{deathState.floorReached}</span>
              </p>
            </div>

            {deathState.itemsLost.length > 0 && (
              <div
                className="p-4"
                style={{
                  backgroundImage: 'url(/assets/ui/panels/panel-small.png)',
                  backgroundSize: '100% 100%',
                  imageRendering: 'pixelated',
                }}
              >
                <h3
                  className="text-red-400 mb-3 text-sm font-bold"
                  style={{ textShadow: '1px 1px 0 #000' }}
                >
                  ITEMS BURNED:
                </h3>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {deathState.itemsLost.slice(0, 10).map((item: Item) => (
                    <ImageSlot key={item.id} item={item} size="sm" disabled />
                  ))}
                </div>
                {deathState.itemsLost.length > 10 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{deathState.itemsLost.length - 10} more items lost
                  </p>
                )}
              </div>
            )}

            <div className="text-center">
              {isProcessing ? (
                <p
                  className="flex items-center justify-center gap-2 text-gray-400"
                  style={{ textShadow: '1px 1px 0 #000' }}
                >
                  <span className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
                  Processing on chain...
                </p>
              ) : chainError ? (
                <div className="space-y-2">
                  <p className="text-red-400" style={{ textShadow: '1px 1px 0 #000' }}>
                    {chainError}
                  </p>
                  <button
                    onClick={processDeathOnChain}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    Retry
                  </button>
                </div>
              ) : deathState.isChainConfirmed ? (
                <p className="text-green-400" style={{ textShadow: '1px 1px 0 #000' }}>
                  Death confirmed on chain
                </p>
              ) : null}
            </div>
          </div>

          <PanelDivider />

          <div className="flex justify-center">
            <ImageButton
              variant="primary"
              size="lg"
              onClick={handleContinue}
              disabled={!deathState.isChainConfirmed || isProcessing}
            >
              {isProcessing ? 'PROCESSING...' : 'CONTINUE'}
            </ImageButton>
          </div>

          <p
            className="text-center text-gray-500 text-xs mt-4"
            style={{ textShadow: '1px 1px 0 #000' }}
          >
            Create a new character to continue your journey
          </p>
        </ImagePanel>
      </div>
    </div>
  );
}
