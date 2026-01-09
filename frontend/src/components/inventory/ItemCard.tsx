'use client';

import { useState, useRef, useEffect } from 'react';
import type { Item } from '@/types';
import { ImageSlot } from '@/components/ui/ImageSlot';
import { ImageButton } from '@/components/ui/ImageButton';
import { ItemTooltip } from './ItemTooltip';
import { soundManager } from '@/game/effects/SoundManager';

interface ItemCardProps {
  item: Item;
  onEquip?: () => void;
  onUse?: () => void;
  onDeposit?: () => void;
  onWithdraw?: () => void;
  isStashItem?: boolean;
  disabled?: boolean;
}

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
    soundManager.play('menuOpen');
    setShowMenu(true);
  };

  const handleClick = () => {
    soundManager.play('buttonClick');
    setShowMenu(!showMenu);
  };

  const handleAction = (action: () => void) => {
    soundManager.play('buttonClick');
    action();
    setShowMenu(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <ImageSlot
          item={item}
          onClick={handleClick}
          onRightClick={handleContextMenu}
          isEquipped={item.isEquipped}
          disabled={disabled}
          size="md"
        />
      </div>

      {/* Tooltip */}
      {showTooltip && !showMenu && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <ItemTooltip item={item} />
        </div>
      )}

      {/* Context Menu */}
      {showMenu && (
        <div
          className="absolute top-full left-0 mt-1 z-50 min-w-[120px] overflow-hidden"
          style={{
            backgroundImage: 'url(/assets/ui/panels/panel-small.png)',
            backgroundSize: '100% 100%',
            imageRendering: 'pixelated',
          }}
        >
          <div className="p-1">
            {isStashItem ? (
              <button
                className="w-full px-3 py-2 text-left text-sm text-yellow-100 hover:brightness-125 transition-colors"
                style={{ textShadow: '1px 1px 0 #000' }}
                onClick={() => handleAction(onWithdraw!)}
              >
                Withdraw
              </button>
            ) : (
              <>
                {item.type !== 'Consumable' && onEquip && (
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-yellow-100 hover:brightness-125 transition-colors"
                    style={{ textShadow: '1px 1px 0 #000' }}
                    onClick={() => handleAction(onEquip)}
                  >
                    {item.isEquipped ? 'Unequip' : 'Equip'}
                  </button>
                )}
                {item.type === 'Consumable' && onUse && (
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-green-400 hover:brightness-125 transition-colors"
                    style={{ textShadow: '1px 1px 0 #000' }}
                    onClick={() => handleAction(onUse)}
                  >
                    Use
                  </button>
                )}
                {onDeposit && (
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-yellow-100 hover:brightness-125 transition-colors border-t border-black/30"
                    style={{ textShadow: '1px 1px 0 #000' }}
                    onClick={() => handleAction(onDeposit)}
                  >
                    Deposit
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
