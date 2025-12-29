'use client';

import { useChainEvents } from '@/hooks';
import { DeathScreen } from './DeathScreen';
import { LootModal } from './LootModal';
import { VictoryScreen } from './VictoryScreen';

/**
 * Container for all modal components.
 * Renders the appropriate modal based on UI state and handles chain events.
 */
export function ModalContainer() {
  // Initialize chain event listeners
  useChainEvents();

  return (
    <>
      <DeathScreen />
      <LootModal />
      <VictoryScreen />
    </>
  );
}
