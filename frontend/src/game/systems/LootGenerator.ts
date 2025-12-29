import type { Item, ItemRarity, ItemType, Enemy } from '@/types';

const RARITY_WEIGHTS: Record<number, Record<ItemRarity, number>> = {
  1: { Common: 70, Uncommon: 25, Rare: 5, Epic: 0, Legendary: 0 },
  2: { Common: 60, Uncommon: 28, Rare: 10, Epic: 2, Legendary: 0 },
  3: { Common: 50, Uncommon: 30, Rare: 15, Epic: 5, Legendary: 0 },
  4: { Common: 35, Uncommon: 35, Rare: 20, Epic: 8, Legendary: 2 },
  5: { Common: 0, Uncommon: 30, Rare: 40, Epic: 25, Legendary: 5 },
};

const WEAPON_NAMES: Record<number, string[]> = {
  1: ['Rusty Sword', 'Worn Dagger', 'Old Axe'],
  2: ['Steel Blade', 'Sharp Scimitar', 'Battle Mace'],
  3: ['Enchanted Sword', 'Shadow Dagger', 'War Hammer'],
  4: ['Demon Slayer', 'Soul Reaver', 'Void Cleaver'],
  5: ['Godsbane', 'Eternity Edge', 'Worldbreaker'],
};

const ARMOR_NAMES: Record<number, string[]> = {
  1: ['Leather Vest', 'Padded Tunic', 'Chain Shirt'],
  2: ['Steel Plate', 'Scale Mail', 'Reinforced Armor'],
  3: ['Knight Armor', 'Mystic Robe', 'Dragon Hide'],
  4: ['Dragonscale', 'Shadow Cloak', 'Void Plate'],
  5: ['Divine Armor', 'Titan Plate', 'Eternal Guard'],
};

const ACCESSORY_NAMES: Record<number, string[]> = {
  1: ['Copper Ring', 'Bone Amulet', 'Leather Band'],
  2: ['Silver Ring', 'Crystal Pendant', 'Enchanted Circlet'],
  3: ['Gold Band', 'Ruby Amulet', 'Arcane Talisman'],
  4: ['Dragon Ring', 'Soul Gem', 'Void Stone'],
  5: ['Divine Relic', 'Titan Core', 'Infinity Stone'],
};

let itemIdCounter = 1000;

function getRandomRarity(floor: number, seed: number): ItemRarity {
  const weights = RARITY_WEIGHTS[Math.min(floor, 5)] || RARITY_WEIGHTS[5];
  const roll = seed % 100;
  let cumulative = 0;

  for (const [rarity, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (roll < cumulative) {
      return rarity as ItemRarity;
    }
  }
  return 'Common';
}

function getRarityMultiplier(rarity: ItemRarity): number {
  const multipliers: Record<ItemRarity, number> = {
    Common: 1,
    Uncommon: 1.5,
    Rare: 2,
    Epic: 3,
    Legendary: 5,
  };
  return multipliers[rarity];
}

function getItemName(type: ItemType, floor: number, seed: number): string {
  const floorTier = Math.min(Math.ceil(floor / 1), 5);
  const names =
    type === 'Weapon'
      ? WEAPON_NAMES[floorTier]
      : type === 'Armor'
        ? ARMOR_NAMES[floorTier]
        : ACCESSORY_NAMES[floorTier];
  return names[seed % names.length];
}

export function generateLoot(floor: number, enemy: Enemy): Item[] {
  const items: Item[] = [];
  const seed = Date.now() + enemy.id;

  // Base drop chance: 40% + 5% per floor
  const dropChance = 0.4 + floor * 0.05;
  if (Math.random() > dropChance) {
    return items;
  }

  // Determine item type
  const typeRoll = seed % 100;
  let itemType: ItemType;
  if (typeRoll < 40) {
    itemType = 'Weapon';
  } else if (typeRoll < 70) {
    itemType = 'Armor';
  } else {
    itemType = 'Accessory';
  }

  const rarity = getRandomRarity(floor, seed);
  const multiplier = getRarityMultiplier(rarity);
  const baseDamage = 5 + floor * 3;
  const baseDefense = 3 + floor * 2;
  const baseBonus = 2 + floor;

  const item: Item = {
    id: itemIdCounter++,
    name: getItemName(itemType, floor, seed),
    rarity,
    type: itemType,
    stats: {},
    enchantments: [],
    durability: 50 + Math.floor(multiplier * 10),
    killCount: 0,
    origin: {
      dungeonId: 1,
      floor,
    },
  };

  if (itemType === 'Weapon') {
    item.stats.damage = Math.floor(baseDamage * multiplier);
  } else if (itemType === 'Armor') {
    item.stats.defense = Math.floor(baseDefense * multiplier);
  } else {
    // Accessory - random stat boost
    const statType = seed % 3;
    if (statType === 0) {
      item.stats.damage = Math.floor(baseBonus * multiplier * 0.5);
    } else if (statType === 1) {
      item.stats.defense = Math.floor(baseBonus * multiplier * 0.3);
    } else {
      item.stats.health = Math.floor(baseBonus * multiplier * 2);
    }
  }

  items.push(item);

  // Chance for bonus drop on higher floors
  if (floor >= 3 && Math.random() < 0.15) {
    const bonusItem = generateConsumable(floor, seed + 1);
    if (bonusItem) items.push(bonusItem);
  }

  return items;
}

function generateConsumable(floor: number, seed: number): Item | null {
  const isHealth = seed % 2 === 0;
  return {
    id: itemIdCounter++,
    name: isHealth ? 'Health Potion' : 'Mana Potion',
    rarity: 'Common',
    type: 'Consumable',
    stats: isHealth ? { health: 20 + floor * 5 } : { mana: 15 + floor * 3 },
    enchantments: [],
    durability: 1,
    killCount: 0,
    origin: { dungeonId: 1, floor },
  };
}

export function generateBossLoot(floor: number): Item[] {
  const items: Item[] = [];
  const seed = Date.now();

  // Guaranteed rare+ drop for bosses
  const guaranteedRarity: ItemRarity =
    floor >= 5 ? 'Legendary' : floor >= 3 ? 'Epic' : 'Rare';

  // Generate 1-3 items
  const itemCount = 1 + Math.floor(Math.random() * 2);

  for (let i = 0; i < itemCount; i++) {
    const typeRoll = (seed + i * 100) % 3;
    const itemType: ItemType =
      typeRoll === 0 ? 'Weapon' : typeRoll === 1 ? 'Armor' : 'Accessory';
    const rarity = i === 0 ? guaranteedRarity : getRandomRarity(floor, seed + i);
    const multiplier = getRarityMultiplier(rarity);

    const item: Item = {
      id: itemIdCounter++,
      name: getItemName(itemType, floor, seed + i),
      rarity,
      type: itemType,
      stats: {},
      enchantments: [],
      durability: 80 + Math.floor(multiplier * 15),
      killCount: 0,
      origin: { dungeonId: 1, floor },
    };

    const baseDamage = 8 + floor * 4;
    const baseDefense = 5 + floor * 3;

    if (itemType === 'Weapon') {
      item.stats.damage = Math.floor(baseDamage * multiplier);
    } else if (itemType === 'Armor') {
      item.stats.defense = Math.floor(baseDefense * multiplier);
    } else {
      item.stats.health = Math.floor(10 * multiplier);
      item.stats.mana = Math.floor(5 * multiplier);
    }

    items.push(item);
  }

  return items;
}
