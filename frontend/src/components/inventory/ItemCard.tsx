'use client';

import { useState, useRef, useEffect } from 'react';
import type { Item } from '@/types';
import { ItemTooltip } from './ItemTooltip';

interface ItemCardProps {
  item: Item;
  onEquip?: () => void;
  onUse?: () => void;
  onDeposit?: () => void;
  onWithdraw?: () => void;
  isStashItem?: boolean;
  disabled?: boolean;
}

const RARITY_BORDER: Record<Item['rarity'], string> = {
  Common: 'border-zinc-600',
  Uncommon: 'border-green-500',
  Rare: 'border-blue-500',
  Epic: 'border-purple-500',
  Legendary: 'border-orange-500',
};

const RARITY_BG: Record<Item['rarity'], string> = {
  Common: 'bg-zinc-900',
  Uncommon: 'bg-green-950/30',
  Rare: 'bg-blue-950/30',
  Epic: 'bg-purple-950/30',
  Legendary: 'bg-orange-950/30',
};

const TYPE_ICONS: Record<Item['type'], string> = {
  Weapon: 'M14.5 2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 6.5a2 2 0 00-2 2v1.414l-4.707 4.707',
  Armor: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
  Accessory: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  Consumable: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z',
};

export function ItemCard({
  item,
  onEquip,
  onUse,
  onDeposit,
  onWithdraw,
  isStashItem = false,
  disabled = false,
}: ItemCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMenu(true);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Item slot */}
      <button
        className={`
          relative w-14 h-14 rounded-lg border-2 ${RARITY_BORDER[item.rarity]} ${RARITY_BG[item.rarity]}
          flex flex-col items-center justify-center
          hover:brightness-125 transition-all cursor-pointer
          ${item.isEquipped ? 'ring-2 ring-yellow-500 ring-offset-1 ring-offset-zinc-900' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowMenu(!showMenu)}
        onContextMenu={handleContextMenu}
        disabled={disabled}
      >
        <svg className="w-7 h-7 text-zinc-300" fill="currentColor" viewBox="0 0 24 24">
          <path d={TYPE_ICONS[item.type]} />
        </svg>

        {/* Equipped indicator */}
        {item.isEquipped && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full" />
        )}

        {/* Stat preview */}
        {item.stats.damage && (
          <span className="absolute bottom-0.5 right-0.5 text-[9px] text-red-400 font-bold">
            +{item.stats.damage}
          </span>
        )}
        {item.stats.defense && (
          <span className="absolute bottom-0.5 right-0.5 text-[9px] text-blue-400 font-bold">
            +{item.stats.defense}
          </span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && !showMenu && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <ItemTooltip item={item} />
        </div>
      )}

      {/* Context Menu */}
      {showMenu && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden min-w-[120px]">
          {isStashItem ? (
            <button
              className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              onClick={() => { onWithdraw?.(); setShowMenu(false); }}
            >
              Withdraw
            </button>
          ) : (
            <>
              {item.type !== 'Consumable' && onEquip && (
                <button
                  className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                  onClick={() => { onEquip(); setShowMenu(false); }}
                >
                  {item.isEquipped ? 'Unequip' : 'Equip'}
                </button>
              )}
              {item.type === 'Consumable' && onUse && (
                <button
                  className="w-full px-3 py-2 text-left text-sm text-green-400 hover:bg-zinc-800 transition-colors"
                  onClick={() => { onUse(); setShowMenu(false); }}
                >
                  Use
                </button>
              )}
              {onDeposit && (
                <button
                  className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors border-t border-zinc-800"
                  onClick={() => { onDeposit(); setShowMenu(false); }}
                >
                  Deposit to Stash
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
