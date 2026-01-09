'use client';

import { useState } from 'react';
import type { Item } from '@/types';

type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

interface ImageSlotProps {
  item?: Item | null;
  rarity?: Rarity;
  onClick?: () => void;
  onRightClick?: (e: React.MouseEvent) => void;
  isEquipped?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTooltip?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const SLOT_IMAGES: Record<Rarity | 'empty', string> = {
  empty: '/assets/ui/slots/slot-empty.png',
  Common: '/assets/ui/slots/slot-common.png',
  Uncommon: '/assets/ui/slots/slot-uncommon.png',
  Rare: '/assets/ui/slots/slot-rare.png',
  Epic: '/assets/ui/slots/slot-epic.png',
  Legendary: '/assets/ui/slots/slot-legendary.png',
};

const SLOT_SIZES: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 40,
  md: 56,
  lg: 72,
  xl: 88,
};

// Map item types to their image paths
const TYPE_IMAGES: Record<string, string> = {
  Weapon: '/assets/items/sword.png',
  Armor: '/assets/items/armor.png',
  Accessory: '/assets/items/ring.png',
  Consumable: '/assets/items/potion.png',
};

function getItemImage(item: Item): string {
  const name = item.name.toLowerCase();
  if (name.includes('shield')) return '/assets/items/shield.png';
  if (name.includes('gold') || name.includes('coin')) return '/assets/items/gold.png';
  if (name.includes('potion')) return '/assets/items/potion.png';
  if (name.includes('ring')) return '/assets/items/ring.png';
  if (name.includes('armor')) return '/assets/items/armor.png';
  return TYPE_IMAGES[item.type] || '/assets/items/sword.png';
}

export function ImageSlot({
  item,
  rarity,
  onClick,
  onRightClick,
  isEquipped = false,
  disabled = false,
  size = 'md',
  className = '',
  children,
}: ImageSlotProps) {
  const [isHovered, setIsHovered] = useState(false);

  const effectiveRarity = item?.rarity ?? rarity ?? 'empty';
  const slotImage = item ? SLOT_IMAGES[item.rarity] : SLOT_IMAGES[effectiveRarity as Rarity | 'empty'];
  const slotSize = SLOT_SIZES[size];

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onRightClick?.(e);
  };

  return (
    <button
      onClick={onClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled}
      className={`
        relative
        transition-all duration-150
        ${isHovered && !disabled ? 'brightness-125 scale-105' : ''}
        ${isEquipped ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-black' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      style={{
        width: slotSize,
        height: slotSize,
        background: 'transparent',
        border: 'none',
        padding: 0,
      }}
    >
      {/* Slot background */}
      <img
        src={slotImage}
        alt=""
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'pixelated' }}
        draggable={false}
      />

      {/* Item image */}
      {item && (
        <img
          src={getItemImage(item)}
          alt={item.name}
          className="absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] object-contain"
          style={{ imageRendering: 'pixelated' }}
          draggable={false}
        />
      )}

      {/* Custom content (for slot type icons, etc.) */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}

      {/* Equipped indicator */}
      {isEquipped && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-yellow-600" />
      )}

      {/* Stat badge */}
      {item?.stats.damage && (
        <span
          className="absolute bottom-0.5 right-0.5 text-[9px] font-bold text-red-400"
          style={{ textShadow: '1px 1px 0 #000' }}
        >
          +{item.stats.damage}
        </span>
      )}
      {item?.stats.defense && !item?.stats.damage && (
        <span
          className="absolute bottom-0.5 right-0.5 text-[9px] font-bold text-blue-400"
          style={{ textShadow: '1px 1px 0 #000' }}
        >
          +{item.stats.defense}
        </span>
      )}
    </button>
  );
}
