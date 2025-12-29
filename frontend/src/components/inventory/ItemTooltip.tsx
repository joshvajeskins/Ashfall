'use client';

import type { Item } from '@/types';

interface ItemTooltipProps {
  item: Item;
  className?: string;
}

const RARITY_COLORS: Record<Item['rarity'], string> = {
  Common: 'text-zinc-400',
  Uncommon: 'text-green-400',
  Rare: 'text-blue-400',
  Epic: 'text-purple-400',
  Legendary: 'text-orange-400',
};

const TYPE_ICONS: Record<Item['type'], string> = {
  Weapon: 'M14.5 2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 6.5a2 2 0 00-2 2v1.414l-4.707 4.707',
  Armor: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
  Accessory: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  Consumable: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z',
};

export function ItemTooltip({ item, className = '' }: ItemTooltipProps) {
  const hasStats = item.stats.damage || item.stats.defense || item.stats.health || item.stats.mana;

  return (
    <div className={`bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl min-w-[200px] ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center">
          <svg className="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
            <path d={TYPE_ICONS[item.type]} />
          </svg>
        </div>
        <div>
          <h4 className={`font-semibold ${RARITY_COLORS[item.rarity]}`}>{item.name}</h4>
          <p className="text-xs text-zinc-500">{item.rarity} {item.type}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-zinc-700 my-2" />

      {/* Stats */}
      {hasStats && (
        <div className="space-y-1 mb-2">
          {item.stats.damage && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Damage</span>
              <span className="text-red-400">+{item.stats.damage}</span>
            </div>
          )}
          {item.stats.defense && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Defense</span>
              <span className="text-blue-400">+{item.stats.defense}</span>
            </div>
          )}
          {item.stats.health && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Health</span>
              <span className="text-green-400">+{item.stats.health}</span>
            </div>
          )}
          {item.stats.mana && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Mana</span>
              <span className="text-cyan-400">+{item.stats.mana}</span>
            </div>
          )}
        </div>
      )}

      {/* Kill count for weapons */}
      {item.type === 'Weapon' && item.killCount > 0 && (
        <div className="flex justify-between text-sm mb-2">
          <span className="text-zinc-500">Kills</span>
          <span className="text-red-500">{item.killCount}</span>
        </div>
      )}

      {/* Enchantments */}
      {item.enchantments.length > 0 && (
        <div className="mb-2">
          {item.enchantments.map((enchant) => (
            <div key={enchant.id} className="text-xs text-purple-400">
              +{enchant.name}: {enchant.effect}
            </div>
          ))}
        </div>
      )}

      {/* Durability */}
      <div className="flex justify-between text-xs text-zinc-500">
        <span>Durability</span>
        <span className={item.durability < 30 ? 'text-red-400' : ''}>{item.durability}%</span>
      </div>

      {/* Origin */}
      {item.origin && (
        <div className="mt-2 pt-2 border-t border-zinc-800 text-xs text-zinc-600 italic">
          Found in Dungeon {item.origin.dungeonId}, Floor {item.origin.floor}
        </div>
      )}
    </div>
  );
}
