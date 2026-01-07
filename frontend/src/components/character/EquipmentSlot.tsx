'use client';

import type { Item, ItemType } from '@/types';

interface EquipmentSlotProps {
  slotType: 'weapon' | 'armor' | 'accessory';
  item?: Item;
  onClick?: () => void;
}

// Slot images for empty slots
const SLOT_IMAGES: Record<string, string> = {
  weapon: '/assets/items/sword.png',
  armor: '/assets/items/armor.png',
  accessory: '/assets/items/ring.png',
};

// Get item image based on name and type
function getEquippedItemImage(item: Item): string {
  const name = item.name.toLowerCase();
  if (name.includes('shield')) return '/assets/items/shield.png';
  if (name.includes('potion')) return '/assets/items/potion.png';
  if (name.includes('ring')) return '/assets/items/ring.png';
  if (name.includes('armor')) return '/assets/items/armor.png';
  return SLOT_IMAGES[item.type.toLowerCase()] || '/assets/items/sword.png';
}

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
          <img
            src={SLOT_IMAGES[slotType]}
            alt={SLOT_LABELS[slotType]}
            className="w-8 h-8 object-contain opacity-30"
            style={{ imageRendering: 'pixelated' }}
          />
          <span className="text-[10px] text-zinc-600">{SLOT_LABELS[slotType]}</span>
        </>
      ) : (
        <>
          <img
            src={getEquippedItemImage(item)}
            alt={item.name}
            className="w-10 h-10 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
          {item.stats.damage && (
            <span className="absolute bottom-0.5 right-0.5 text-[10px] text-red-400 font-bold">+{item.stats.damage}</span>
          )}
          {item.stats.defense && (
            <span className="absolute bottom-0.5 right-0.5 text-[10px] text-blue-400 font-bold">+{item.stats.defense}</span>
          )}
        </>
      )}
    </button>
  );
}
