# PRD: MoveRogue — On-Chain Roguelike with True Item Ownership

## Track: Best Gaming App on Movement

---

## Executive Summary

MoveRogue is a browser-based roguelike dungeon crawler where every item, enemy kill, and dungeon run exists on-chain. Move's resource model guarantees items can never be duplicated — no item duping exploits, ever. Permadeath means burned items are truly gone, creating real scarcity and player-driven economy.

---

## Problem Statement

Web3 games fail because:
- **Crypto first, fun second:** Tokenomics over gameplay
- **Fake scarcity:** Items can be minted infinitely
- **No real ownership:** Items are just database entries with NFT wrappers
- **Cheating:** Item duplication exploits plague every game

**Move solves this:** Resources can't be copied or discarded — they must be explicitly moved or destroyed. This is the killer feature for game economies.

---

## Solution Overview

### Core Concept
Classic roguelike mechanics (permadeath, procedural dungeons, item builds) with Move's resource safety guaranteeing true digital ownership.

### Why Move Matters for Games

```move
// In Move, this is IMPOSSIBLE:
// let sword_copy = copy(sword);  // Compile error!

// Items must be explicitly moved or destroyed:
module moverogue::item {
    struct Sword has key, store {
        id: u64,
        damage: u64,
        durability: u64,
        enchantment: Option<Enchantment>
    }

    // Transfer ownership (previous owner loses it)
    public fun transfer(sword: Sword, to: address) {
        move_to(to, sword);
    }

    // Destroy item (permadeath)
    public fun destroy(sword: Sword) {
        let Sword { id: _, damage: _, durability: _, enchantment: _ } = sword;
        // Item is now gone forever
    }

    // Combine items (both consumed, new item created)
    public fun enchant(sword: Sword, gem: EnchantGem): Sword {
        let EnchantGem { enchantment } = gem;  // Gem consumed
        Sword {
            id: sword.id,
            damage: sword.damage,
            durability: sword.durability,
            enchantment: option::some(enchantment)
        }
    }
}
```

---

## Game Design

### Genre & Inspiration
- **Primary:** Roguelike (Hades, Dead Cells, Slay the Spire)
- **Secondary:** Dungeon crawler (Diablo, Path of Exile)
- **Art style:** Pixel art, dark fantasy

### Core Loop

```
1. Enter Dungeon
   └→ Select loadout from owned items

2. Explore Floors
   └→ Fight enemies → Earn loot
   └→ Find chests → Random items
   └→ Discover shops → Buy/sell

3. Boss Fight
   └→ Win → Progress + Rare drop
   └→ Die → PERMADEATH

4. Permadeath
   └→ Character deleted
   └→ ALL equipped items BURNED
   └→ Stashed items SAFE

5. Loop
   └→ Create new character
   └→ Use surviving stash items
   └→ Stronger runs over time
```

### Item System

#### Rarity Tiers
| Tier | Drop Rate | Example | On-Chain |
|------|-----------|---------|----------|
| Common | 60% | Iron Sword | Yes |
| Uncommon | 25% | Steel Sword | Yes |
| Rare | 10% | Blazing Sword | Yes |
| Epic | 4% | Dragon Slayer | Yes |
| Legendary | 1% | Excalibur | Yes (limited supply) |

#### Item Properties
```move
struct Weapon has key, store {
    id: u64,
    name: String,
    rarity: Rarity,
    base_damage: u64,
    attack_speed: u64,
    durability: u64,        // Degrades, can be repaired
    enchantments: vector<Enchantment>,
    kill_count: u64,        // Tracks history
    created_at: u64,
    created_in_dungeon: u64
}

enum Rarity has store, drop, copy {
    Common,
    Uncommon,
    Rare,
    Epic,
    Legendary
}

enum Enchantment has store, drop, copy {
    Fire { bonus_damage: u64 },
    Ice { slow_percent: u64 },
    Lightning { chain_targets: u64 },
    Vampiric { lifesteal_percent: u64 },
    Vorpal { crit_chance: u64 }
}
```

### Character System

```move
struct Character has key {
    id: u64,
    owner: address,
    class: Class,
    level: u64,
    experience: u64,
    health: u64,
    max_health: u64,
    // Equipment slots
    weapon: Option<Weapon>,
    armor: Option<Armor>,
    accessory: Option<Accessory>,
    // Stats
    strength: u64,
    agility: u64,
    intelligence: u64,
    // Run state
    current_dungeon: Option<u64>,
    current_floor: u64,
    is_alive: bool
}

enum Class has store, drop, copy {
    Warrior,   // High HP, melee focused
    Rogue,     // High crit, fast attacks
    Mage       // Spell-based, glass cannon
}
```

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Game Client                              │
│         (Phaser.js / PixiJS + React + Privy)                │
│  - Rendering & animations                                    │
│  - Input handling                                            │
│  - Local game state                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Game Server                               │
│              (Node.js + WebSocket)                          │
│  - Combat calculations                                       │
│  - Dungeon generation                                        │
│  - Anti-cheat validation                                     │
│  - State sync with chain                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Movement Smart Contracts                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐│
│  │ Character  │ │   Items    │ │  Dungeon   │ │  Market  ││
│  │  Module    │ │   Module   │ │  Module    │ │  Module  ││
│  └────────────┘ └────────────┘ └────────────┘ └──────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Move Modules

```
sources/
├── character.move      # Character creation, death, leveling
├── items/
│   ├── weapon.move     # Weapon types and mechanics
│   ├── armor.move      # Armor types and mechanics
│   ├── accessory.move  # Rings, amulets, etc.
│   ├── consumable.move # Potions, scrolls
│   └── crafting.move   # Item combination
├── dungeon/
│   ├── run.move        # Dungeon run state
│   ├── floor.move      # Floor progression
│   ├── loot.move       # Drop tables, RNG
│   └── boss.move       # Boss encounters
├── economy/
│   ├── marketplace.move # P2P trading
│   ├── shop.move       # NPC shops
│   └── gold.move       # Currency
└── stash.move          # Safe item storage
```

### Key Contract Functions

```move
module moverogue::dungeon {

    // Start a dungeon run
    public entry fun enter_dungeon(
        player: &signer,
        character_id: u64,
        dungeon_id: u64
    ) acquires Character, DungeonState {
        let character = borrow_global_mut<Character>(signer::address_of(player));
        assert!(character.is_alive, E_CHARACTER_DEAD);
        assert!(option::is_none(&character.current_dungeon), E_ALREADY_IN_DUNGEON);

        character.current_dungeon = option::some(dungeon_id);
        character.current_floor = 1;

        // Lock equipped items (can't trade during run)
        // ...
    }

    // Complete a floor (called by game server with proof)
    public entry fun complete_floor(
        server: &signer,
        player: address,
        floor_result: FloorResult
    ) acquires Character, DungeonState {
        assert!(is_authorized_server(signer::address_of(server)), E_UNAUTHORIZED);

        let character = borrow_global_mut<Character>(player);

        // Award loot
        let loot = generate_loot(floor_result.enemies_killed, floor_result.chests_opened);
        move_loot_to_player(player, loot);

        // Progress
        character.current_floor = character.current_floor + 1;
        character.experience = character.experience + floor_result.xp_earned;
    }

    // Character dies - PERMADEATH
    public entry fun character_death(
        server: &signer,
        player: address
    ) acquires Character {
        assert!(is_authorized_server(signer::address_of(server)), E_UNAUTHORIZED);

        let character = borrow_global_mut<Character>(player);
        character.is_alive = false;

        // BURN ALL EQUIPPED ITEMS
        if (option::is_some(&character.weapon)) {
            let weapon = option::extract(&mut character.weapon);
            destroy_weapon(weapon);  // Gone forever
        }
        // ... same for armor, accessory

        // Emit death event
        emit(CharacterDeath {
            character_id: character.id,
            floor_reached: character.current_floor,
            items_lost: get_equipped_item_ids(character)
        });
    }
}
```

### Stash System (Safe Storage)

```move
module moverogue::stash {

    const MAX_STASH_SIZE: u64 = 50;

    struct Stash has key {
        owner: address,
        weapons: vector<Weapon>,
        armors: vector<Armor>,
        accessories: vector<Accessory>,
        consumables: vector<Consumable>,
        gold: u64
    }

    // Deposit item BEFORE entering dungeon
    public entry fun deposit_weapon(
        player: &signer,
        weapon: Weapon
    ) acquires Stash, Character {
        let character = borrow_global<Character>(signer::address_of(player));
        assert!(option::is_none(&character.current_dungeon), E_IN_DUNGEON);

        let stash = borrow_global_mut<Stash>(signer::address_of(player));
        assert!(vector::length(&stash.weapons) < MAX_STASH_SIZE, E_STASH_FULL);

        vector::push_back(&mut stash.weapons, weapon);
    }

    // Withdraw item (equip for next run)
    public entry fun withdraw_weapon(
        player: &signer,
        weapon_index: u64
    ): Weapon acquires Stash, Character {
        // ... validation
        vector::remove(&mut stash.weapons, weapon_index)
    }
}
```

---

## Feature Specifications

### MVP (Hackathon Scope)

| Feature | Priority | Effort |
|---------|----------|--------|
| Character creation (3 classes) | P0 | Low |
| Basic dungeon (5 floors) | P0 | Medium |
| Combat system (click to attack) | P0 | Medium |
| 10 weapon types | P0 | Low |
| Item drops & pickup | P0 | Medium |
| Permadeath (item burning) | P0 | Low |
| Stash system | P0 | Low |
| Privy wallet integration | P0 | Low |

### Post-MVP

| Feature | Priority | Effort |
|---------|----------|--------|
| P2P marketplace | P1 | Medium |
| Item crafting/enchanting | P1 | Medium |
| More dungeon types | P1 | Medium |
| Boss fights | P1 | High |
| PvP arena | P2 | High |
| Guilds/clans | P2 | Medium |
| Seasonal leagues | P2 | Medium |

---

## Economy Design

### Currency: GOLD
- Earned from dungeon runs
- Used in NPC shops
- NOT a token (just in-game currency)

### Item Economy

```
┌─────────────────────────────────────────────────────────────┐
│                    Item Supply                               │
│                                                              │
│  Generation:           Destruction:                         │
│  - Dungeon drops       - Permadeath (burn equipped)         │
│  - Boss kills          - Crafting (consume ingredients)     │
│  - Crafting            - Durability breakdown               │
│                                                              │
│  Supply is naturally deflationary:                          │
│  Deaths > Drops over time → Items become scarcer            │
└─────────────────────────────────────────────────────────────┘
```

### Marketplace Fees
- 5% fee on all P2P trades
- Paid in MOVE token
- Revenue to treasury

---

## Gameplay Details

### Dungeon Structure

```
Dungeon: Crypt of the Fallen King

Floor 1: ████████████████ [Skeletons, Zombies]
         └─ 3-5 rooms, easy enemies

Floor 2: ████████████████ [Ghouls, Wraiths]
         └─ 4-6 rooms, medium enemies

Floor 3: ████████████████ [Vampires, Liches]
         └─ 5-7 rooms, hard enemies

Floor 4: ████████████████ [Elite Guards]
         └─ 6-8 rooms, very hard

Floor 5: ████████████████ [BOSS: Fallen King]
         └─ Boss room only
         └─ Legendary drop chance: 5%
```

### Combat System

```
Turn-based with action points:

Player Turn:
├─ Move (1 AP)
├─ Attack (2 AP)
├─ Use Item (1 AP)
├─ Special Ability (3 AP)
└─ End Turn

Enemy Turn:
└─ AI-controlled actions

Stats:
- Attack = Base Damage + Weapon Damage + (Strength * 0.5)
- Defense = Base Defense + Armor Rating + (Agility * 0.3)
- Crit Chance = 5% + (Agility * 0.2%)
- Spell Power = Base + Staff Power + (Intelligence * 0.7)
```

---

## Technical Requirements

### Frontend
- **Game Engine:** Phaser.js or PixiJS
- **UI Framework:** React (inventory, menus)
- **Wallet:** Privy embedded wallet
- **State:** Zustand for local state
- **Assets:** Pixel art (16x16 or 32x32 tiles)

### Backend
- **Server:** Node.js + Express + WebSocket
- **Database:** PostgreSQL (game state backup)
- **Anti-cheat:** Server-authoritative combat
- **Indexer:** Movement GraphQL for item/character queries

### Smart Contracts
- **Language:** Move 2.0
- **Pattern:** Server-signed transactions for game actions
- **Security:** Move Prover for item invariants

---

## Success Metrics

### Hackathon
| Metric | Target |
|--------|--------|
| Playable demo | Yes |
| 5-floor dungeon complete | Yes |
| Item drops working | Yes |
| Permadeath burns items | Yes |
| Fun to play (subjective) | Yes |

### Post-Launch
| Metric | Month 1 | Month 3 |
|--------|---------|---------|
| Players | 1,000 | 10,000 |
| Dungeon runs | 10,000 | 100,000 |
| Items created | 50,000 | 500,000 |
| Items burned | 10,000 | 100,000 |
| Marketplace volume | $5,000 | $100,000 |

---

## Development Timeline

### Week 1: Core Systems
- [ ] Character & item Move modules
- [ ] Basic combat logic (server)
- [ ] Dungeon generation
- [ ] Phaser setup

### Week 2: Game Client
- [ ] Movement & rendering
- [ ] Combat UI
- [ ] Inventory system
- [ ] Wallet integration

### Week 3: Integration
- [ ] Chain ↔ server sync
- [ ] Item drops on-chain
- [ ] Permadeath flow
- [ ] Stash system

### Week 4: Polish
- [ ] Art assets
- [ ] Sound effects
- [ ] Bug fixes
- [ ] Demo video

---

## Appendix

### Inspiration & References
- **Hades:** Run-based progression, tight combat
- **Slay the Spire:** Strategic item builds
- **Dark Souls:** Meaningful death penalty
- **Loot (NFT):** On-chain item generation

### Why This Wins

1. **Showcases Move's killer feature:** Resource safety isn't just marketing — it fundamentally changes game design.

2. **Actually fun:** Roguelikes have proven market fit. Web3 is the differentiator, not the core loop.

3. **Clear revenue:** Marketplace fees, cosmetics, battle passes.

4. **Extensible:** Foundation for MMO, PvP, guilds.

### Team Requirements
- 1 Game developer (Phaser/Pixi experience)
- 1 Move developer
- 1 Backend developer
- 1 Artist (pixel art)
