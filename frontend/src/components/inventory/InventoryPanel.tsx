'use client';

import { useState } from 'react';
import type { Item, ItemType } from '@/types';
import { useInventory, useItemActions } from '@/hooks';
import { useGameStore } from '@/stores/gameStore';
import { useUIStore } from '@/stores/uiStore';
import { ItemCard } from './ItemCard';
import { ImagePanel, PanelDivider } from '@/components/ui/ImagePanel';
import { soundManager } from '@/game/effects/SoundManager';

type FilterTab = 'All' | ItemType;

const FILTER_TABS: FilterTab[] = ['All', 'Weapon', 'Armor', 'Accessory', 'Consumable'];

const ICON_CLOSE = '/assets/ui/icons/icon-close.png';

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
    soundManager.play('buttonClick');
    setActiveTab(tab);
    setFilter(tab);
  };

  const handleClose = () => {
    soundManager.play('error');
    onClose?.();
  };

  return (
    <ImagePanel size="large">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <img
            src="/assets/items/gold.png"
            alt=""
            className="w-6 h-6"
            style={{ imageRendering: 'pixelated' }}
          />
          <h3
            className="text-lg font-bold text-yellow-100"
            style={{ textShadow: '2px 2px 0 #000' }}
          >
            Inventory
          </h3>
          <span
            className="text-sm text-gray-400"
            style={{ textShadow: '1px 1px 0 #000' }}
          >
            ({itemCount})
          </span>
        </div>
        {onClose && (
          <button
            onClick={handleClose}
            className="w-6 h-6 hover:brightness-125 transition-all"
          >
            <img
              src={ICON_CLOSE}
              alt="Close"
              className="w-full h-full"
              style={{ imageRendering: 'pixelated' }}
            />
          </button>
        )}
      </div>

      <PanelDivider />

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`
              px-3 py-1 text-sm font-medium whitespace-nowrap transition-all
              ${activeTab === tab ? 'brightness-125' : 'brightness-75 hover:brightness-100'}
            `}
            style={{
              backgroundImage: activeTab === tab
                ? 'url(/assets/ui/slots/slot-rare.png)'
                : 'url(/assets/ui/slots/slot-common.png)',
              backgroundSize: '100% 100%',
              imageRendering: 'pixelated',
              textShadow: '1px 1px 0 #000',
              color: activeTab === tab ? '#fef3c7' : '#9ca3af',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[200px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-8">
            <p
              className="text-gray-400"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              No items found
            </p>
            <p
              className="text-xs text-gray-500 mt-1"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              {activeTab === 'All' ? 'Explore dungeons to find loot!' : `No ${activeTab.toLowerCase()}s`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {filteredInventory.map((item, index) => (
              <ItemCard
                key={item.id}
                item={item}
                onEquip={() => equipItem(item, index)}
                onUse={() => useConsumable(item, index)}
                onDeposit={
                  !isInDungeon
                    ? () => openTransferModal(item, 'deposit', index)
                    : undefined
                }
                disabled={isInDungeon && item.type !== 'Consumable'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer warning */}
      {isInDungeon && (
        <>
          <PanelDivider />
          <p
            className="text-xs text-orange-400 text-center"
            style={{ textShadow: '1px 1px 0 #000' }}
          >
            Stash access disabled while in dungeon
          </p>
        </>
      )}
    </ImagePanel>
  );
}
