'use client';

import { useState } from 'react';
import { ImagePanel, PanelDivider } from './ImagePanel';
import { ImageButton } from './ImageButton';
import { soundManager } from '@/game/effects/SoundManager';

interface GuideSection {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'overview',
    title: 'Welcome to Ashfall',
    icon: '/assets/ui/icons/icon-scroll.png',
    content: (
      <div className="space-y-4">
        <p className="text-gray-300">
          Ashfall is a <span className="text-yellow-400 font-bold">permadeath roguelike</span> where
          every item exists on the blockchain. When you die, equipped items are{' '}
          <span className="text-red-400 font-bold">burned forever</span>.
        </p>
        <div className="bg-black/30 rounded p-3 border border-yellow-900/50">
          <h4 className="text-yellow-200 font-bold mb-2">Core Loop:</h4>
          <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside">
            <li>Create a character (Warrior, Rogue, or Mage)</li>
            <li>Enter the dungeon and fight enemies</li>
            <li>Collect loot - better drops on deeper floors</li>
            <li>Defeat the boss on Floor 5 to win</li>
            <li>Deposit valuable items to your Stash for safety</li>
          </ol>
        </div>
        <p className="text-orange-400 text-sm italic">
          Warning: Death is permanent. Protect your best items in the Stash!
        </p>
      </div>
    ),
  },
  {
    id: 'classes',
    title: 'Character Classes',
    icon: '/assets/characters/warrior.png',
    content: (
      <div className="space-y-3">
        {/* Warrior */}
        <div className="bg-red-900/20 rounded p-3 border border-red-800/50">
          <div className="flex items-center gap-2 mb-2">
            <img src="/assets/characters/warrior.png" alt="Warrior" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
            <h4 className="text-red-300 font-bold">Warrior</h4>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-300">
            <div><span className="text-red-400">HP:</span> 150</div>
            <div><span className="text-blue-400">Mana:</span> 30</div>
            <div><span className="text-yellow-400">STR:</span> 15</div>
          </div>
          <p className="text-gray-400 text-sm mt-2">Tank with high damage. Low mana limits special moves.</p>
        </div>
        {/* Rogue */}
        <div className="bg-green-900/20 rounded p-3 border border-green-800/50">
          <div className="flex items-center gap-2 mb-2">
            <img src="/assets/characters/rogue.png" alt="Rogue" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
            <h4 className="text-green-300 font-bold">Rogue</h4>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-300">
            <div><span className="text-red-400">HP:</span> 100</div>
            <div><span className="text-blue-400">Mana:</span> 40</div>
            <div><span className="text-yellow-400">AGI:</span> 15</div>
          </div>
          <p className="text-gray-400 text-sm mt-2">High crit chance & flee success. Glass cannon playstyle.</p>
        </div>
        {/* Mage */}
        <div className="bg-purple-900/20 rounded p-3 border border-purple-800/50">
          <div className="flex items-center gap-2 mb-2">
            <img src="/assets/characters/mage.png" alt="Mage" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
            <h4 className="text-purple-300 font-bold">Mage</h4>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-300">
            <div><span className="text-red-400">HP:</span> 80</div>
            <div><span className="text-blue-400">Mana:</span> 100</div>
            <div><span className="text-yellow-400">INT:</span> 15</div>
          </div>
          <p className="text-gray-400 text-sm mt-2">Fragile but can spam Heavy Attack & Heal with huge mana pool.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'combat',
    title: 'Combat Actions',
    icon: '/assets/items/sword.png',
    content: (
      <div className="space-y-2">
        <p className="text-gray-300 text-sm mb-3">
          Combat is turn-based. Each turn you choose one action:
        </p>
        {/* Attack */}
        <div className="flex items-start gap-3 bg-black/30 rounded p-2">
          <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-xl">⚔️</span>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm">Attack</h4>
            <p className="text-gray-400 text-xs">Base damage + weapon + strength bonus. Can crit for 2x!</p>
            <p className="text-blue-400 text-xs">Cost: Free</p>
          </div>
        </div>
        {/* Heavy Attack */}
        <div className="flex items-start gap-3 bg-black/30 rounded p-2">
          <div className="w-10 h-10 bg-orange-900/50 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-xl">💥</span>
          </div>
          <div>
            <h4 className="text-orange-300 font-bold text-sm">Heavy Attack</h4>
            <p className="text-gray-400 text-xs">1.5x damage multiplier. Still can crit!</p>
            <p className="text-blue-400 text-xs">Cost: 20 Mana</p>
          </div>
        </div>
        {/* Defend */}
        <div className="flex items-start gap-3 bg-black/30 rounded p-2">
          <div className="w-10 h-10 bg-blue-900/50 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🛡️</span>
          </div>
          <div>
            <h4 className="text-blue-300 font-bold text-sm">Defend</h4>
            <p className="text-gray-400 text-xs">Reduce next incoming damage by 50%.</p>
            <p className="text-blue-400 text-xs">Cost: Free</p>
          </div>
        </div>
        {/* Heal */}
        <div className="flex items-start gap-3 bg-black/30 rounded p-2">
          <div className="w-10 h-10 bg-green-900/50 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-xl">💚</span>
          </div>
          <div>
            <h4 className="text-green-300 font-bold text-sm">Heal</h4>
            <p className="text-gray-400 text-xs">Restore 30% of your max HP.</p>
            <p className="text-blue-400 text-xs">Cost: 30 Mana</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'intent',
    title: 'Enemy Intent System',
    icon: '/assets/enemies/skeleton.png',
    content: (
      <div className="space-y-3">
        <p className="text-gray-300 text-sm">
          Before each enemy turn, you can see what they&apos;re planning. Use this to your advantage!
        </p>
        <div className="bg-black/30 rounded p-3">
          <div className="space-y-3">
            {/* Attack Intent */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-900/50 rounded flex items-center justify-center">
                <span className="text-2xl">⚔️</span>
              </div>
              <div>
                <h4 className="text-white font-bold">Attack (60%)</h4>
                <p className="text-gray-400 text-sm">Normal damage. Safe to attack back.</p>
              </div>
            </div>
            {/* Heavy Intent */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-900/50 rounded flex items-center justify-center">
                <span className="text-2xl">💥</span>
              </div>
              <div>
                <h4 className="text-orange-300 font-bold">Heavy Attack (25%)</h4>
                <p className="text-gray-400 text-sm">1.5x damage! Consider defending.</p>
              </div>
            </div>
            {/* Defend Intent */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-900/50 rounded flex items-center justify-center">
                <span className="text-2xl">🛡️</span>
              </div>
              <div>
                <h4 className="text-blue-300 font-bold">Defend (15%)</h4>
                <p className="text-gray-400 text-sm">Your damage halved. Save heavy attack!</p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-yellow-400 text-sm italic">
          Pro tip: Defend when you see Heavy Attack coming!
        </p>
      </div>
    ),
  },
  {
    id: 'loot',
    title: 'Loot & Rarity',
    icon: '/assets/items/gold.png',
    content: (
      <div className="space-y-3">
        <p className="text-gray-300 text-sm">
          Deeper floors have better drop rates. Boss loot is always high quality!
        </p>
        {/* Rarity colors */}
        <div className="grid grid-cols-5 gap-1 text-center text-xs">
          <div className="bg-zinc-700 rounded p-2">
            <div className="text-zinc-300 font-bold">Common</div>
          </div>
          <div className="bg-green-900/50 rounded p-2">
            <div className="text-green-400 font-bold">Uncommon</div>
          </div>
          <div className="bg-blue-900/50 rounded p-2">
            <div className="text-blue-400 font-bold">Rare</div>
          </div>
          <div className="bg-purple-900/50 rounded p-2">
            <div className="text-purple-400 font-bold">Epic</div>
          </div>
          <div className="bg-orange-900/50 rounded p-2">
            <div className="text-orange-400 font-bold">Legend</div>
          </div>
        </div>
        {/* Drop table */}
        <div className="bg-black/30 rounded p-3">
          <h4 className="text-yellow-200 font-bold mb-2 text-sm">Drop Rates by Floor:</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-gray-300">
              <span>Floor 1-2:</span>
              <span>Mostly Common/Uncommon</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Floor 3-4:</span>
              <span>Rare + Epic possible</span>
            </div>
            <div className="flex justify-between text-yellow-300">
              <span>Floor 5+:</span>
              <span>No Commons! Legendary 5%</span>
            </div>
            <div className="flex justify-between text-orange-300 font-bold">
              <span>Boss:</span>
              <span>30% Epic, 5% Legendary!</span>
            </div>
          </div>
        </div>
        {/* Item types */}
        <div className="flex justify-around text-center text-xs">
          <div>
            <img src="/assets/items/sword.png" alt="" className="w-8 h-8 mx-auto" style={{ imageRendering: 'pixelated' }} />
            <div className="text-gray-400">Weapon</div>
          </div>
          <div>
            <img src="/assets/items/armour.png" alt="" className="w-8 h-8 mx-auto" style={{ imageRendering: 'pixelated' }} />
            <div className="text-gray-400">Armor</div>
          </div>
          <div>
            <img src="/assets/items/ring.png" alt="" className="w-8 h-8 mx-auto" style={{ imageRendering: 'pixelated' }} />
            <div className="text-gray-400">Accessory</div>
          </div>
          <div>
            <img src="/assets/items/potion.png" alt="" className="w-8 h-8 mx-auto" style={{ imageRendering: 'pixelated' }} />
            <div className="text-gray-400">Potion</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'stash',
    title: 'Permadeath & Stash',
    icon: '/assets/environment/skull.png',
    content: (
      <div className="space-y-3">
        <div className="bg-red-900/30 rounded p-3 border border-red-800/50">
          <h4 className="text-red-400 font-bold mb-2">When You Die:</h4>
          <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
            <li>Character is marked as <span className="text-red-400">dead</span></li>
            <li>All <span className="text-red-400">equipped items</span> are burned forever</li>
            <li>Items in <span className="text-red-400">inventory</span> are lost</li>
            <li>Must create a <span className="text-yellow-400">new character</span></li>
          </ul>
        </div>
        <div className="bg-green-900/30 rounded p-3 border border-green-800/50">
          <h4 className="text-green-400 font-bold mb-2">Your Stash is SAFE!</h4>
          <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
            <li>Items in Stash <span className="text-green-400">survive death</span></li>
            <li>Can only access <span className="text-yellow-400">outside dungeon</span></li>
            <li>Max capacity: <span className="text-yellow-400">50 items</span></li>
          </ul>
        </div>
        <div className="bg-yellow-900/30 rounded p-3 border border-yellow-800/50">
          <h4 className="text-yellow-400 font-bold mb-2">Pro Tips:</h4>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• Deposit legendary items before boss fights!</li>
            <li>• Keep backup equipment in stash</li>
            <li>• New characters can use stashed gear</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'enemies',
    title: 'Dungeon Enemies',
    icon: '/assets/enemies/goblin.png',
    content: (
      <div className="space-y-2">
        <p className="text-gray-300 text-sm mb-2">
          Each floor has tougher enemies. The boss awaits on Floor 5!
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'Skeleton', floor: '1', color: 'gray', img: '/assets/enemies/skeleton.png' },
            { name: 'Zombie', floor: '1-2', color: 'green', img: '/assets/enemies/zombie.png' },
            { name: 'Ghoul', floor: '2-3', color: 'purple', img: '/assets/enemies/ghoul.png' },
            { name: 'Vampire', floor: '3-4', color: 'red', img: '/assets/enemies/vampire.png' },
            { name: 'Lich', floor: '4', color: 'blue', img: '/assets/enemies/lich.png' },
            { name: 'Dragon', floor: '5', color: 'orange', img: '/assets/enemies/dragon.png' },
          ].map((enemy) => (
            <div
              key={enemy.name}
              className={`bg-${enemy.color}-900/20 rounded p-2 border border-${enemy.color}-800/30 flex items-center gap-2`}
              style={{ backgroundColor: `rgba(var(--${enemy.color}-900), 0.2)` }}
            >
              <img src={enemy.img} alt={enemy.name} className="w-10 h-10" style={{ imageRendering: 'pixelated' }} />
              <div>
                <div className="text-white text-sm font-bold">{enemy.name}</div>
                <div className="text-gray-400 text-xs">Floor {enemy.floor}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-orange-900/30 rounded p-2 border border-orange-800/50 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">👑</span>
            <div>
              <div className="text-orange-300 font-bold text-sm">Dungeon Lord (Boss)</div>
              <div className="text-gray-400 text-xs">Floor 5 - Defeat to win! Guaranteed epic+ loot.</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'leveling',
    title: 'Leveling Up',
    icon: '/assets/ui/icons/icon-xp.png',
    content: (
      <div className="space-y-3">
        <p className="text-gray-300 text-sm">
          Kill enemies to earn XP. Level up for permanent stat boosts!
        </p>
        <div className="bg-black/30 rounded p-3">
          <h4 className="text-yellow-200 font-bold mb-2 text-sm">XP Required per Level:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Level 2:</span>
              <span className="text-yellow-400">100 XP</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Level 3:</span>
              <span className="text-yellow-400">200 XP</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Level 4:</span>
              <span className="text-yellow-400">400 XP</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Level 5:</span>
              <span className="text-yellow-400">800 XP</span>
            </div>
          </div>
        </div>
        <div className="bg-green-900/30 rounded p-3 border border-green-800/50">
          <h4 className="text-green-400 font-bold mb-2 text-sm">Level Up Bonuses:</h4>
          <div className="space-y-1 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <span className="text-red-400">❤️</span>
              <span>+20 Max HP per level</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400">💧</span>
              <span>+10 Max Mana per level</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✨</span>
              <span>Full heal on level up!</span>
            </div>
          </div>
        </div>
        <p className="text-yellow-400 text-sm italic">
          Tip: Time your kills to level up when low HP for a free heal!
        </p>
      </div>
    ),
  },
];

interface GameGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GameGuide({ isOpen, onClose }: GameGuideProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen) return null;

  const currentSection = GUIDE_SECTIONS[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === GUIDE_SECTIONS.length - 1;

  const goNext = () => {
    if (!isLast) {
      soundManager.play('buttonClick');
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (!isFirst) {
      soundManager.play('buttonClick');
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleClose = () => {
    soundManager.play('error');
    setCurrentIndex(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg">
        <ImagePanel size="large">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <img
                src={currentSection.icon}
                alt=""
                className="w-6 h-6"
                style={{ imageRendering: 'pixelated' }}
              />
              <h3
                className="text-lg font-bold text-yellow-100"
                style={{ textShadow: '2px 2px 0 #000' }}
              >
                {currentSection.title}
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="w-6 h-6 hover:brightness-125 transition-all"
            >
              <img
                src="/assets/ui/icons/icon-close.png"
                alt="Close"
                className="w-full h-full"
                style={{ imageRendering: 'pixelated' }}
              />
            </button>
          </div>

          {/* Page indicator */}
          <div className="flex justify-center gap-1 mb-3">
            {GUIDE_SECTIONS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  soundManager.play('buttonClick');
                  setCurrentIndex(idx);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'bg-yellow-400 w-4'
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>

          <PanelDivider />

          {/* Content */}
          <div className="min-h-[320px] max-h-[400px] overflow-y-auto py-2 pr-1">
            {currentSection.content}
          </div>

          <PanelDivider />

          {/* Navigation */}
          <div className="flex items-center justify-between mt-3">
            <ImageButton
              variant="secondary"
              size="sm"
              onClick={goPrev}
              disabled={isFirst}
              soundType="cancel"
            >
              ← Previous
            </ImageButton>

            <span
              className="text-gray-400 text-sm"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              {currentIndex + 1} / {GUIDE_SECTIONS.length}
            </span>

            {isLast ? (
              <ImageButton variant="primary" size="sm" onClick={handleClose}>
                Got it!
              </ImageButton>
            ) : (
              <ImageButton variant="primary" size="sm" onClick={goNext}>
                Next →
              </ImageButton>
            )}
          </div>
        </ImagePanel>
      </div>
    </div>
  );
}
