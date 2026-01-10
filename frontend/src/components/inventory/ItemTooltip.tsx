'use client';

import type { Item } from '@/types';
import { PanelDivider } from '@/components/ui/ImagePanel';

interface ItemTooltipProps {
  item: Item;
  className?: string;
}

const RARITY_COLORS: Record<Item['rarity'], string> = {
  Common: 'text-gray-400',
  Uncommon: 'text-green-400',
  Rare: 'text-blue-400',
  Epic: 'text-purple-400',
  Legendary: 'text-yellow-400',
};

const TYPE_IMAGES: Record<Item['type'], string> = {
  Weapon: '/assets/items/sword.png',
  Armor: '/assets/items/armour.png',
  Accessory: '/assets/items/ring.png',
  Consumable: '/assets/items/potion.png',
};

export function ItemTooltip({ item, className = '' }: ItemTooltipProps) {
  const hasStats = item.stats.damage || item.stats.defense || item.stats.health || item.stats.mana;

  return (
    <div
      className={`min-w-[200px] p-3 ${className}`}
      style={{
        backgroundImage: 'url(/assets/ui/panels/panel-small.png)',
        backgroundSize: '100% 100%',
        imageRendering: 'pixelated',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 flex items-center justify-center"
          style={{
            backgroundImage: 'url(/assets/ui/slots/slot-empty.png)',
            backgroundSize: '100% 100%',
            imageRendering: 'pixelated',
          }}
        >
          <img
            src={TYPE_IMAGES[item.type]}
            alt=""
            className="w-6 h-6"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        <div>
          <h4
            className={`font-bold ${RARITY_COLORS[item.rarity]}`}
            style={{ textShadow: '1px 1px 0 #000' }}
          >
            {item.name}
          </h4>
          <p
            className="text-xs text-gray-500"
            style={{ textShadow: '1px 1px 0 #000' }}
          >
            {item.rarity} {item.type}
          </p>
        </div>
      </div>

      <PanelDivider />

      {/* Stats */}
      {hasStats && (
        <div className="space-y-1 mb-2">
          {item.stats.damage && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500" style={{ textShadow: '1px 1px 0 #000' }}>
                Damage
              </span>
              <span className="text-red-400 font-bold" style={{ textShadow: '1px 1px 0 #000' }}>
                +{item.stats.damage}
              </span>
            </div>
          )}
          {item.stats.defense && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500" style={{ textShadow: '1px 1px 0 #000' }}>
                Defense
              </span>
              <span className="text-blue-400 font-bold" style={{ textShadow: '1px 1px 0 #000' }}>
                +{item.stats.defense}
              </span>
            </div>
          )}
          {item.stats.health && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500" style={{ textShadow: '1px 1px 0 #000' }}>
                Health
              </span>
              <span className="text-green-400 font-bold" style={{ textShadow: '1px 1px 0 #000' }}>
                +{item.stats.health}
              </span>
            </div>
          )}
          {item.stats.mana && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500" style={{ textShadow: '1px 1px 0 #000' }}>
                Mana
              </span>
              <span className="text-cyan-400 font-bold" style={{ textShadow: '1px 1px 0 #000' }}>
                +{item.stats.mana}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Kill count for weapons */}
      {item.type === 'Weapon' && item.killCount > 0 && (
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500" style={{ textShadow: '1px 1px 0 #000' }}>
            Kills
          </span>
          <span className="text-red-500 font-bold" style={{ textShadow: '1px 1px 0 #000' }}>
            {item.killCount}
          </span>
        </div>
      )}

      {/* Enchantments */}
      {item.enchantments.length > 0 && (
        <div className="mb-2">
          {item.enchantments.map((enchant) => (
            <div
              key={enchant.id}
              className="text-xs text-purple-400"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              +{enchant.name}: {enchant.effect}
            </div>
          ))}
        </div>
      )}

      {/* Durability */}
      <div className="flex justify-between text-xs">
        <span className="text-gray-500" style={{ textShadow: '1px 1px 0 #000' }}>
          Durability
        </span>
        <span
          className={item.durability < 30 ? 'text-red-400' : 'text-gray-400'}
          style={{ textShadow: '1px 1px 0 #000' }}
        >
          {item.durability}%
        </span>
      </div>

      {/* Origin */}
      {item.origin && (
        <div
          className="mt-2 pt-2 border-t border-black/30 text-xs text-gray-600 italic"
          style={{ textShadow: '1px 1px 0 #000' }}
        >
          Found in Dungeon {item.origin.dungeonId}, Floor {item.origin.floor}
        </div>
      )}
    </div>
  );
}
