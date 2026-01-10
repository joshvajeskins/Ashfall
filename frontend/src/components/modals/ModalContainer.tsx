'use client';

import { useChainEvents } from '@/hooks';
import { useUIStore } from '@/stores/uiStore';
import { DeathScreen } from './DeathScreen';
import { LootModal } from './LootModal';
import { VictoryScreen } from './VictoryScreen';
import { InventoryPanel } from '@/components/inventory/InventoryPanel';
import { StashPanel } from '@/components/inventory/StashPanel';
import { TransferModal } from '@/components/inventory/TransferModal';

/**
 * Container for all modal components.
 * Renders the appropriate modal based on UI state and handles chain events.
 */
export function ModalContainer() {
  // Initialize chain event listeners
  useChainEvents();

  const { activeModal, transferState, closeModal } = useUIStore();

  return (
    <>
      <DeathScreen />
      <LootModal />
      <VictoryScreen />

      {/* Inventory Modal */}
      {activeModal === 'inventory' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeModal} />
          <div className="relative z-10">
            <InventoryPanel onClose={closeModal} />
          </div>
        </div>
      )}

      {/* Stash Modal */}
      {activeModal === 'stash' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeModal} />
          <div className="relative z-10">
            <StashPanel onClose={closeModal} />
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {activeModal === 'transfer' && transferState.item && (
        <TransferModal
          item={transferState.item}
          action={transferState.action}
          itemIndex={transferState.itemIndex}
          onClose={closeModal}
        />
      )}
    </>
  );
}
