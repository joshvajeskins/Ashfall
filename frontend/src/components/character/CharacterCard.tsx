'use client';

import type { Character } from '@/types';
import { EquipmentSlot } from './EquipmentSlot';

interface CharacterCardProps {
  character: Character;
  onEquipmentClick?: (slot: 'weapon' | 'armor' | 'accessory') => void;
}

const CLASS_ICONS: Record<string, string> = {
  Warrior: 'M12 2a2 2 0 012 2v1h3a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h3V4a2 2 0 012-2z',
  Rogue: 'M12 2L4 6v12l8 4 8-4V6l-8-4zm0 2.5L17 7v6l-5 2.5L7 13V7l5-2.5z',
  Mage: 'M12 3L4 9v12h16V9l-8-6zm0 2.5l6 4.5v8H6v-8l6-4.5z',
};

const CLASS_COLORS: Record<string, string> = {
  Warrior: 'text-red-500',
  Rogue: 'text-green-500',
  Mage: 'text-blue-500',
};

function StatBar({ label, current, max, color }: {
  label: string;
  current: number;
  max: number;
  color: string;
}) {
  const percentage = Math.min(100, (current / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-300">{current}/{max}</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function StatValue({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="flex items-center gap-2 bg-zinc-800/50 rounded px-2 py-1">
      <span className="text-xs text-zinc-500">{icon}</span>
      <div className="flex flex-col">
        <span className="text-xs text-zinc-500">{label}</span>
        <span className="text-sm text-zinc-200 font-medium">{value}</span>
      </div>
    </div>
  );
}

export function CharacterCard({ character, onEquipmentClick }: CharacterCardProps) {
  const expForNextLevel = 100 * Math.pow(2, character.level - 1);
  const expProgress = (character.experience / expForNextLevel) * 100;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center ${CLASS_COLORS[character.class]}`}>
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d={CLASS_ICONS[character.class]} />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{character.class}</h3>
            {!character.isAlive && (
              <span className="px-2 py-0.5 text-xs bg-red-900 text-red-400 rounded">DEAD</span>
            )}
          </div>
          <p className="text-sm text-zinc-400">Level {character.level}</p>
        </div>
      </div>

      {/* HP and Mana bars */}
      <div className="space-y-2">
        <StatBar
          label="HP"
          current={character.health}
          max={character.maxHealth}
          color="bg-red-600"
        />
        <StatBar
          label="Mana"
          current={character.mana}
          max={character.maxMana}
          color="bg-blue-600"
        />
      </div>

      {/* Experience bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-400">Experience</span>
          <span className="text-zinc-300">{character.experience}/{expForNextLevel}</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-500 transition-all duration-300"
            style={{ width: `${expProgress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatValue label="STR" value={character.stats.strength} icon="+" />
        <StatValue label="AGI" value={character.stats.agility} icon="~" />
        <StatValue label="INT" value={character.stats.intelligence} icon="*" />
      </div>

      {/* Equipment slots */}
      <div className="pt-2 border-t border-zinc-800">
        <p className="text-xs text-zinc-500 mb-2">Equipment</p>
        <div className="flex gap-2 justify-center">
          <EquipmentSlot
            slotType="weapon"
            item={character.equipment.weapon}
            onClick={() => onEquipmentClick?.('weapon')}
          />
          <EquipmentSlot
            slotType="armor"
            item={character.equipment.armor}
            onClick={() => onEquipmentClick?.('armor')}
          />
          <EquipmentSlot
            slotType="accessory"
            item={character.equipment.accessory}
            onClick={() => onEquipmentClick?.('accessory')}
          />
        </div>
      </div>
    </div>
  );
}
