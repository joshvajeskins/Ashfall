'use client';

import { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useGameStore } from '@/stores/gameStore';
import { gameEvents, GAME_EVENTS } from '@/game/events/GameEvents';
import { ImagePanel, PanelDivider } from '@/components/ui/ImagePanel';
import { ImageButton } from '@/components/ui/ImageButton';
import { ImageSlot } from '@/components/ui/ImageSlot';
import { soundManager } from '@/game/effects/SoundManager';
import type { Item } from '@/types';

const RARITY_TEXT: Record<string, string> = {
  Common: 'text-gray-400',
  Uncommon: 'text-green-400',
  Rare: 'text-blue-400',
  Epic: 'text-purple-400',
  Legendary: 'text-yellow-400',
};

interface LootItemProps {
  item: Item;
  onPickup: (item: Item) => void;
  onLeave: (item: Item) => void;
}

function LootItem({ item, onPickup, onLeave }: LootItemProps) {
  const handlePickup = () => {
    soundManager.play('itemPickup');
    onPickup(item);
  };

  const handleLeave = () => {
    onLeave(item);
  };

  return (
    <div
      className="p-3 flex items-center gap-3"
      style={{
        backgroundImage: 'url(/assets/ui/panels/panel-small.png)',
        backgroundSize: '100% 100%',
        imageRendering: 'pixelated',
      }}
    >
      <ImageSlot item={item} size="md" />

      <div className="flex-1">
        <h4
          className={`font-bold ${RARITY_TEXT[item.rarity] || RARITY_TEXT.Common}`}
          style={{ textShadow: '1px 1px 0 #000' }}
        >
          {item.name}
        </h4>
        <p className="text-xs text-gray-500" style={{ textShadow: '1px 1px 0 #000' }}>
          {item.rarity} {item.type}
        </p>
        <div className="text-xs mt-1" style={{ textShadow: '1px 1px 0 #000' }}>
          {item.stats.damage && <span className="text-red-400 mr-2">DMG: {item.stats.damage}</span>}
          {item.stats.defense && <span className="text-blue-400 mr-2">DEF: {item.stats.defense}</span>}
          {item.stats.health && <span className="text-green-400 mr-2">HP: +{item.stats.health}</span>}
          {item.stats.mana && <span className="text-purple-400">MP: +{item.stats.mana}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <ImageButton variant="primary" size="sm" onClick={handlePickup}>
          TAKE
        </ImageButton>
        <ImageButton variant="secondary" size="sm" onClick={handleLeave} soundType="cancel">
          LEAVE
        </ImageButton>
      </div>
    </div>
  );
}

export function LootModal() {
  const { activeModal, lootState, setAutoPickup, closeModal } = useUIStore();
  const { addPendingLoot } = useGameStore();
  const [remainingItems, setRemainingItems] = useState<Item[]>(lootState.items);

  const isOpen = activeModal === 'loot';

  useEffect(() => {
    if (isOpen) {
      soundManager.play('menuOpen');
      setRemainingItems(lootState.items);
    }
  }, [isOpen, lootState.items]);

  const handlePickup = (item: Item) => {
    addPendingLoot(item);
    gameEvents.emit(GAME_EVENTS.LOOT_PICKUP, { item });
    setRemainingItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const handleLeave = (item: Item) => {
    soundManager.play('error');
    setRemainingItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const handlePickupAll = () => {
    soundManager.play('itemPickup');
    remainingItems.forEach((item) => {
      addPendingLoot(item);
      gameEvents.emit(GAME_EVENTS.LOOT_PICKUP, { item });
    });
    setRemainingItems([]);
  };

  const handleLeaveAll = () => {
    soundManager.play('error');
    setRemainingItems([]);
  };

  const handleClose = () => {
    closeModal();
    gameEvents.emit(GAME_EVENTS.UI_RESUME_GAME);
  };

  if (!isOpen) return null;

  // All items handled - show completion
  if (remainingItems.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="relative max-w-sm w-full mx-4">
          <ImagePanel size="small">
            <p
              className="text-center text-gray-300 mb-4"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              All items collected!
            </p>
            <div className="flex justify-center">
              <ImageButton variant="primary" size="md" onClick={handleClose}>
                CONTINUE
              </ImageButton>
            </div>
          </ImagePanel>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative max-w-lg w-full mx-4">
        <ImagePanel size="large">
          {/* Header */}
          <h2
            className="text-2xl font-bold text-yellow-400 text-center mb-4"
            style={{ textShadow: '2px 2px 0 #000' }}
          >
            LOOT DROPPED!
          </h2>

          <PanelDivider />

          {/* Item count */}
          <div className="flex justify-between items-center mb-4">
            <span
              className="text-gray-400 text-sm"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              {remainingItems.length} item{remainingItems.length !== 1 ? 's' : ''} found
            </span>
            <div className="flex gap-2">
              <ImageButton variant="primary" size="sm" onClick={handlePickupAll}>
                TAKE ALL
              </ImageButton>
              <ImageButton variant="secondary" size="sm" onClick={handleLeaveAll} soundType="cancel" playSound={false}>
                LEAVE ALL
              </ImageButton>
            </div>
          </div>

          <PanelDivider />

          {/* Items list */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
            {remainingItems.map((item) => (
              <LootItem
                key={item.id}
                item={item}
                onPickup={handlePickup}
                onLeave={handleLeave}
              />
            ))}
          </div>

          <PanelDivider />

          {/* Footer */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lootState.autoPickup}
                onChange={(e) => setAutoPickup(e.target.checked)}
                className="w-4 h-4 accent-yellow-500"
              />
              <span
                className="text-gray-400 text-sm"
                style={{ textShadow: '1px 1px 0 #000' }}
              >
                Auto-pickup
              </span>
            </label>
            <ImageButton variant="secondary" size="sm" onClick={handleClose} soundType="cancel">
              CLOSE
            </ImageButton>
          </div>
        </ImagePanel>
      </div>
    </div>
  );
}
