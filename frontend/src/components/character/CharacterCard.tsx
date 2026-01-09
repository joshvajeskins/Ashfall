'use client';

import type { Character } from '@/types';
import { EquipmentSlot } from './EquipmentSlot';
import { ImageBar } from '@/components/ui/ImageBar';
import { ImagePanel, PanelDivider } from '@/components/ui/ImagePanel';

interface CharacterCardProps {
  character: Character;
  onEquipmentClick?: (slot: 'weapon' | 'armor' | 'accessory') => void;
}

const CLASS_IMAGES: Record<string, string> = {
  Warrior: '/assets/characters/warrior.png',
  Rogue: '/assets/characters/rogue.png',
  Mage: '/assets/characters/mage.png',
};

const FRAME_PORTRAIT = '/assets/ui/decorative/frame-portrait.png';

function StatValue({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div
      className="flex items-center justify-between py-2"
      style={{
        paddingLeft: 12,
        paddingRight: 20,
        backgroundImage: 'url(/assets/ui/slots/slot-common.png)',
        backgroundSize: '100% 100%',
        imageRendering: 'pixelated',
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-base text-yellow-300" style={{ textShadow: '1px 1px 0 #000' }}>
          {icon}
        </span>
        <span className="text-sm text-gray-400" style={{ textShadow: '1px 1px 0 #000' }}>{label}</span>
      </div>
      <span
        className="text-lg text-white font-bold"
        style={{ textShadow: '1px 1px 0 #000' }}
      >
        {value}
      </span>
    </div>
  );
}

export function CharacterCard({ character, onEquipmentClick }: CharacterCardProps) {
  const expForNextLevel = 100 * Math.pow(2, character.level - 1);

  return (
    <ImagePanel size="large" width={500}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative w-24 h-24">
          <img
            src={FRAME_PORTRAIT}
            alt=""
            className="absolute inset-0 w-full h-full"
            style={{ imageRendering: 'pixelated' }}
          />
          <img
            src={CLASS_IMAGES[character.class]}
            alt={character.class}
            className="absolute inset-2 w-20 h-20 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3
              className="text-2xl font-bold text-yellow-100"
              style={{ textShadow: '2px 2px 0 #000' }}
            >
              {character.class}
            </h3>
            {!character.isAlive && (
              <span
                className="px-3 py-1 text-sm text-red-400 font-bold"
                style={{
                  backgroundImage: 'url(/assets/ui/slots/slot-epic.png)',
                  backgroundSize: '100% 100%',
                  imageRendering: 'pixelated',
                }}
              >
                DEAD
              </span>
            )}
          </div>
          <p
            className="text-lg text-gray-300"
            style={{ textShadow: '1px 1px 0 #000' }}
          >
            Level {character.level}
          </p>
        </div>
      </div>

      {/* HP and Mana bars */}
      <div className="space-y-3 mb-6">
        <ImageBar
          type="health"
          current={character.health}
          max={character.maxHealth}
          size="lg"
        />
        <div style={{ paddingRight: 10 }}>
          <ImageBar
            type="mana"
            current={character.mana}
            max={character.maxMana}
            size="lg"
          />
        </div>
        <div style={{ paddingRight: 20 }}>
          <ImageBar
            type="xp"
            current={character.experience}
            max={expForNextLevel}
            size="md"
          />
        </div>
      </div>

      <PanelDivider />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6 mt-4">
        <StatValue label="STR" value={character.stats.strength} icon="+" />
        <StatValue label="AGI" value={character.stats.agility} icon="~" />
        <StatValue label="INT" value={character.stats.intelligence} icon="*" />
      </div>

      <PanelDivider />

      {/* Equipment slots */}
      <div className="pt-4">
        <p
          className="text-sm text-yellow-200 mb-3"
          style={{ textShadow: '1px 1px 0 #000' }}
        >
          Equipment
        </p>
        <div className="flex gap-4 justify-center">
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
    </ImagePanel>
  );
}
