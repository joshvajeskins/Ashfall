'use client';

import type { Character } from '@/types';
import { EquipmentSlot } from './EquipmentSlot';

interface CharacterCardProps {
  character: Character;
  onEquipmentClick?: (slot: 'weapon' | 'armor' | 'accessory') => void;
}

// Character class images
const CLASS_IMAGES: Record<string, string> = {
  Warrior: '/assets/characters/warrior.png',
  Rogue: '/assets/characters/rogue.png',
  Mage: '/assets/characters/mage.png',
};

const CLASS_COLORS: Record<string, string> = {
  Warrior: 'border-red-500',
  Rogue: 'border-green-500',
  Mage: 'border-blue-500',
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
        <div className={`w-14 h-14 rounded-lg bg-zinc-800 border-2 ${CLASS_COLORS[character.class]} flex items-center justify-center overflow-hidden`}>
          <img
            src={CLASS_IMAGES[character.class]}
            alt={character.class}
            className="w-12 h-12 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
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
