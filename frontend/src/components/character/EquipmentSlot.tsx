'use client';

import { useState } from 'react';
import type { Item } from '@/types';
import { ImageSlot } from '@/components/ui/ImageSlot';

interface EquipmentSlotProps {
  slotType: 'weapon' | 'armor' | 'accessory';
  item?: Item;
  onClick?: () => void;
}

const SLOT_IMAGES: Record<string, string> = {
  weapon: '/assets/items/sword.png',
  armor: '/assets/items/armour.png',
  accessory: '/assets/items/ring.png',
};

const SLOT_LABELS: Record<string, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Ring',
};

export function EquipmentSlot({ slotType, item, onClick }: EquipmentSlotProps) {
  const isEmpty = !item;

  return (
    <div className="flex flex-col items-center gap-2">
      <ImageSlot
        item={item || undefined}
        onClick={onClick}
        size="xl"
        isEquipped={!!item}
      >
        {isEmpty && (
          <img
            src={SLOT_IMAGES[slotType]}
            alt={SLOT_LABELS[slotType]}
            className="w-10 h-10 object-contain opacity-30"
            style={{ imageRendering: 'pixelated' }}
          />
        )}
      </ImageSlot>
      <span
        className="text-xs text-gray-400"
        style={{ textShadow: '1px 1px 0 #000' }}
      >
        {SLOT_LABELS[slotType]}
      </span>
    </div>
  );
}
