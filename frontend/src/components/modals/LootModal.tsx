'use client';

import { useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useGameStore } from '@/stores/gameStore';
import { gameEvents, GAME_EVENTS } from '@/game/events/GameEvents';
import type { Item } from '@/types';

const RARITY_COLORS: Record<string, string> = {
  Common: 'border-gray-500 bg-gray-800/50',
  Uncommon: 'border-green-500 bg-green-900/30',
  Rare: 'border-blue-500 bg-blue-900/30',
  Epic: 'border-purple-500 bg-purple-900/30',
  Legendary: 'border-yellow-500 bg-yellow-900/30 animate-pulse',
};

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
  return (
    <div className={`border rounded-lg p-3 ${RARITY_COLORS[item.rarity] || RARITY_COLORS.Common}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className={`font-mono font-bold ${RARITY_TEXT[item.rarity] || RARITY_TEXT.Common}`}>
            {item.name}
          </h4>
          <p className="text-xs text-gray-500 font-mono">{item.rarity} {item.type}</p>
        </div>
      </div>

      <div className="text-xs text-gray-400 font-mono mb-3">
        {item.stats.damage && <span className="text-red-400">DMG: {item.stats.damage} </span>}
        {item.stats.defense && <span className="text-blue-400">DEF: {item.stats.defense} </span>}
        {item.stats.health && <span className="text-green-400">HP: +{item.stats.health} </span>}
        {item.stats.mana && <span className="text-purple-400">MP: +{item.stats.mana}</span>}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onPickup(item)}
          className="flex-1 py-1 px-2 bg-green-700 hover:bg-green-600 text-white text-xs font-mono rounded"
        >
          PICK UP
        </button>
        <button
          onClick={() => onLeave(item)}
          className="flex-1 py-1 px-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-mono rounded"
        >
          LEAVE
        </button>
      </div>
    </div>
  );
}

export function LootModal() {
  const { activeModal, lootState, setAutoPickup, closeModal } = useUIStore();
  const { addPendingLoot } = useGameStore();
  const [remainingItems, setRemainingItems] = useState<Item[]>(lootState.items);

  const isOpen = activeModal === 'loot';

  const handlePickup = (item: Item) => {
    addPendingLoot(item);
    gameEvents.emit(GAME_EVENTS.LOOT_PICKUP, { item });
    setRemainingItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const handleLeave = (item: Item) => {
    setRemainingItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const handlePickupAll = () => {
    remainingItems.forEach((item) => {
      addPendingLoot(item);
      gameEvents.emit(GAME_EVENTS.LOOT_PICKUP, { item });
    });
    setRemainingItems([]);
  };

  const handleLeaveAll = () => {
    setRemainingItems([]);
  };

  const handleClose = () => {
    closeModal();
    gameEvents.emit(GAME_EVENTS.UI_RESUME_GAME);
  };

  if (!isOpen) return null;

  // Auto-close when all items are handled
  if (remainingItems.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm">
          <p className="text-gray-400 font-mono text-center mb-4">All items collected!</p>
          <button
            onClick={handleClose}
            className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-mono rounded"
          >
            CONTINUE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="max-w-lg w-full mx-4 bg-gray-900 border border-yellow-600 rounded-lg p-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-yellow-400 font-mono">LOOT DROPPED!</h2>
          <span className="text-gray-500 font-mono text-sm">
            {remainingItems.length} item{remainingItems.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={handlePickupAll}
            className="flex-1 py-2 px-3 bg-green-700 hover:bg-green-600 text-white text-sm font-mono rounded"
          >
            PICK UP ALL
          </button>
          <button
            onClick={handleLeaveAll}
            className="flex-1 py-2 px-3 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-mono rounded"
          >
            LEAVE ALL
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {remainingItems.map((item) => (
            <LootItem
              key={item.id}
              item={item}
              onPickup={handlePickup}
              onLeave={handleLeave}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-gray-700 pt-4">
          <label className="flex items-center gap-2 text-gray-400 text-sm font-mono cursor-pointer">
            <input
              type="checkbox"
              checked={lootState.autoPickup}
              onChange={(e) => setAutoPickup(e.target.checked)}
              className="form-checkbox rounded bg-gray-800 border-gray-600"
            />
            Auto-pickup
          </label>
          <button
            onClick={handleClose}
            className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-mono rounded"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
