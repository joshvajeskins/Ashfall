'use client';

import type { Item, ItemType } from '@/types';

interface EquipmentSlotProps {
  slotType: 'weapon' | 'armor' | 'accessory';
  item?: Item;
  onClick?: () => void;
}

const SLOT_ICONS: Record<string, string> = {
  weapon: 'M14.5 2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 6.5a2 2 0 00-2 2v1.414l-4.707 4.707a1 1 0 001.414 1.414L9.414 11.5H11a2 2 0 002-2V8.5a2 2 0 00-2-2h-.5z',
  armor: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
  accessory: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
};

const SLOT_LABELS: Record<string, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Ring',
};

const RARITY_COLORS: Record<string, string> = {
  Common: 'border-zinc-600',
  Uncommon: 'border-green-600',
  Rare: 'border-blue-600',
  Epic: 'border-purple-600',
  Legendary: 'border-orange-500',
};

const RARITY_BG: Record<string, string> = {
  Common: 'bg-zinc-900',
  Uncommon: 'bg-green-950/50',
  Rare: 'bg-blue-950/50',
  Epic: 'bg-purple-950/50',
  Legendary: 'bg-orange-950/50',
};

export function EquipmentSlot({ slotType, item, onClick }: EquipmentSlotProps) {
  const isEmpty = !item;
  const borderColor = item ? RARITY_COLORS[item.rarity] : 'border-zinc-700';
  const bgColor = item ? RARITY_BG[item.rarity] : 'bg-zinc-900';

  return (
    <button
      onClick={onClick}
      className={`
        relative w-16 h-16 rounded-lg border-2 ${borderColor} ${bgColor}
        flex flex-col items-center justify-center gap-1
        hover:brightness-110 transition-all cursor-pointer
        ${isEmpty ? 'border-dashed opacity-60' : 'border-solid'}
      `}
      title={item ? `${item.name} (${item.rarity})` : `Empty ${SLOT_LABELS[slotType]} slot`}
    >
      {isEmpty ? (
        <>
          <svg
            className="w-6 h-6 text-zinc-600"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d={SLOT_ICONS[slotType]} />
          </svg>
          <span className="text-[10px] text-zinc-600">{SLOT_LABELS[slotType]}</span>
        </>
      ) : (
        <>
          <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center">
            <svg className="w-5 h-5 text-zinc-300" fill="currentColor" viewBox="0 0 24 24">
              <path d={SLOT_ICONS[slotType]} />
            </svg>
          </div>
          {item.stats.damage && (
            <span className="text-[10px] text-red-400">+{item.stats.damage}</span>
          )}
          {item.stats.defense && (
            <span className="text-[10px] text-blue-400">+{item.stats.defense}</span>
          )}
        </>
      )}
    </button>
  );
}
