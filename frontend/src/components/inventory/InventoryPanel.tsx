'use client';

import { useState } from 'react';
import type { Item, ItemType } from '@/types';
import { useInventory, useItemActions } from '@/hooks';
import { useGameStore } from '@/stores/gameStore';
import { useUIStore } from '@/stores/uiStore';
import { ItemCard } from './ItemCard';

type FilterTab = 'All' | ItemType;

const FILTER_TABS: FilterTab[] = ['All', 'Weapon', 'Armor', 'Accessory', 'Consumable'];

interface InventoryPanelProps {
  onClose?: () => void;
}

export function InventoryPanel({ onClose }: InventoryPanelProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const { filteredInventory, filter, setFilter, itemCount, isLoading } = useInventory();
  const { equipItem, useConsumable } = useItemActions();
  const { isInDungeon } = useGameStore();
  const { openTransferModal } = useUIStore();

  const handleTabClick = (tab: FilterTab) => {
    setActiveTab(tab);
    setFilter(tab);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden w-full max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="text-lg font-semibold text-white">Inventory</h3>
          <span className="text-sm text-zinc-500">({itemCount})</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-zinc-700 overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`
              px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors
              ${activeTab === tab
                ? 'text-white border-b-2 border-orange-500 bg-zinc-800/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'}
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-zinc-600 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-zinc-500">No items found</p>
            <p className="text-xs text-zinc-600 mt-1">
              {activeTab === 'All' ? 'Explore dungeons to find loot!' : `No ${activeTab.toLowerCase()}s in inventory`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {filteredInventory.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onEquip={() => equipItem(item)}
                onUse={() => useConsumable(item)}
                onDeposit={
                  !isInDungeon
                    ? () => openTransferModal(item, 'deposit')
                    : undefined
                }
                disabled={isInDungeon && item.type !== 'Consumable'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {isInDungeon && (
        <div className="px-4 py-2 bg-zinc-800/50 border-t border-zinc-700">
          <p className="text-xs text-orange-400">
            Stash access disabled while in dungeon
          </p>
        </div>
      )}
    </div>
  );
}
