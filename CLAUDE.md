# Ashfall - Claude Code Configuration

## Project Overview
Ashfall is a browser-based roguelike dungeon crawler with on-chain item ownership built on Movement. Every item, enemy kill, and dungeon run exists on-chain using Move's resource model for true item scarcity.

## Starter Kits

### Contracts: move-slayers
**Repo:** https://github.com/movementlabsxyz/move-slayers

Structure from starter:
- `hero` module: Player stats, inventory, equipment, combat, leveling
- `enemies` module: Enemy spawning, damage, death detection
- Combat: Base 5 damage, sword power bonus, counterattacks
- Leveling: XP formula `100 * 2^(level-1)`, +20 HP/+10 mana per level
- Items: Swords (ID 0), Shields (ID 1), Armor (ID 2), Potions (ID 3)

### Frontend: TBD
**Note:** pixel-place repo is empty. Need to set up React + Phaser.js from scratch or use different starter.

## Git Configuration
```
user.name: gabrielantonyxaviour
user.email: gabrielantony56@gmail.com
```

---

## Critical Rules

### NEVER
- Mock implementations - always use real code
- Exceed file size limits (see below)
- Use `copy` on Move resources - this is impossible by design
- Skip wallet integration testing
- Hardcode addresses or private keys
- Create items without proper resource tracking

### ALWAYS
- Use Context7 MCP for documentation lookups (Move, Phaser.js, React, Privy)
- Follow Move resource patterns for game items
- Test permadeath flows thoroughly
- Use server-authoritative game state for anti-cheat
- Emit events for all on-chain state changes

---

## File Size Limits

Hard limit: **300 lines** per file

### By File Type
| File Type | Max Lines | Purpose |
|-----------|-----------|---------|
| Move modules | 250 | Smart contract logic |
| React pages | 150 | Page components |
| Game components | 200 | Phaser/Pixi scenes |
| Hooks | 200 | Custom React hooks |
| Types | 100 | TypeScript interfaces |
| Constants | 150 | Game config, enums |
| Services | 300 | API/chain interactions |
| Game logic | 250 | Combat, loot, dungeon gen |

### When to Decompose
- File exceeds limit
- 3+ useState hooks in component
- Multiple game systems in one file
- Module handles multiple resource types

---

## Context7 MCP - Required Usage

Before implementing ANYTHING, check documentation:

```
Required lookups:
- Move language: /aptos-labs/aptos-core (Movement is Move-based)
- Phaser.js: /phaserjs/phaser
- React: /facebook/react
- Privy: Check Privy docs for wallet integration
- Zustand: /pmndrs/zustand
```

### Usage Pattern
1. Resolve library ID: `mcp__context7__resolve-library-id`
2. Get docs: `mcp__context7__get-library-docs`

---

## Skills System

Invoke skills with: `Skill(skill-name)`

| Skill | Purpose |
|-------|---------|
| `code-structure` | File decomposition and size limits |
| `ui-dev` | React UI with dark theme, responsive design |
| `move-dev` | Move smart contract development |
| `game-dev` | Phaser.js game development, combat, dungeons |
| `strategy` | Strategic planning (NO CODE) |
| `playwright-testing` | E2E testing with MCP Playwright |

---

## Multi-Prompt System

### Two Strategy Commands (Parallel Development)

**`/strategy-contracts <goal>`** - Plan Move contract implementation
- Outputs to `prompts/contracts/1.md`, `prompts/contracts/2.md`, etc.
- Uses move-slayers patterns (hero, enemies modules)
- Focus: Resource safety, permadeath, item burning

**`/strategy-frontend <goal>`** - Plan frontend implementation
- Outputs to `prompts/frontend/1.md`, `prompts/frontend/2.md`, etc.
- Uses React + Phaser.js patterns
- Focus: Game rendering, UI, wallet integration

### Execution Flow
1. Run both `/strategy-contracts` and `/strategy-frontend` for parallel planning
2. Execute with `/run-prompt contracts/1` or `/run-prompt frontend/1`
3. Report completion to continue
4. Both tracks can progress independently

---

## Repository Structure

```
ashfall/
├── contracts/                 # Move smart contracts (from move-slayers)
│   ├── sources/
│   │   ├── hero.move          # Player stats, inventory, equipment, combat
│   │   ├── enemies.move       # Enemy spawning, damage, death
│   │   ├── items.move         # Weapon, armor, potions
│   │   ├── dungeon.move       # Dungeon run state, floors
│   │   ├── loot.move          # Drop tables, RNG
│   │   ├── stash.move         # Safe item storage (survives death)
│   │   └── marketplace.move   # P2P trading (post-MVP)
│   ├── Move.toml
│   └── tests/
├── frontend/                  # React + Phaser.js game client
│   ├── src/
│   │   ├── app/               # Next.js app router
│   │   ├── components/
│   │   │   ├── game/          # Phaser game components
│   │   │   ├── ui/            # React UI components
│   │   │   └── wallet/        # Privy wallet components
│   │   ├── game/              # Phaser.js game logic
│   │   │   ├── scenes/        # Game scenes
│   │   │   ├── entities/      # Characters, enemies, items
│   │   │   ├── systems/       # Combat, movement, loot
│   │   │   └── config/        # Game configuration
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/
│   │   │   ├── move/          # Move client interactions
│   │   │   └── game/          # Game state management
│   │   ├── stores/            # Zustand stores
│   │   └── types/             # TypeScript types
│   └── public/
│       └── assets/            # Pixel art sprites, sounds
├── prompts/
│   ├── contracts/             # Contract strategy prompts
│   └── frontend/              # Frontend strategy prompts
├── .claude/
│   ├── commands/
│   └── skills/
├── CLAUDE.md                  # This file
└── PRD.md                     # Product requirements
```

---

## Move Development Patterns

### Resource Safety - The Core Feature
```move
// Items are resources - they CANNOT be copied
struct Weapon has key, store {
    id: u64,
    damage: u64,
    rarity: Rarity
}

// Transfer moves ownership - previous owner loses access
public fun transfer(weapon: Weapon, to: address) {
    move_to(to, weapon);
}

// Destruction is explicit - item is gone forever
public fun destroy(weapon: Weapon) {
    let Weapon { id: _, damage: _, rarity: _ } = weapon;
}
```

### Event Emission
```move
// Always emit events for frontend tracking
#[event]
struct ItemDropped has drop, store {
    item_id: u64,
    rarity: Rarity,
    dungeon_id: u64,
    floor: u64
}

public fun drop_item(...) {
    // ... logic
    event::emit(ItemDropped { ... });
}
```

### Server Authorization
```move
// Game actions require server signature for anti-cheat
public entry fun complete_floor(
    server: &signer,
    player: address,
    result: FloorResult
) {
    assert!(is_authorized_server(signer::address_of(server)), E_UNAUTHORIZED);
    // ... process result
}
```

---

## Game Development Patterns

### Phaser Scene Structure
```typescript
// Each scene is a separate file
export class DungeonScene extends Phaser.Scene {
    private player: Player;
    private enemies: Enemy[];
    private items: Item[];

    create() {
        this.initializeFloor();
        this.setupInputHandlers();
        this.setupCamera();
    }

    update(time: number, delta: number) {
        this.handleMovement();
        this.checkCombat();
        this.updateUI();
    }
}
```

### State Management
```typescript
// Zustand store for game state
interface GameStore {
    character: Character | null;
    inventory: Item[];
    currentFloor: number;
    isInDungeon: boolean;

    // Actions
    enterDungeon: (dungeonId: number) => void;
    pickupItem: (item: Item) => void;
    die: () => void;
}
```

### Chain Integration
```typescript
// All chain calls through dedicated service
import { moveClient } from '@/lib/move';

export const heroService = {
    initialize: async () => {
        return moveClient.execute('ashfall::hero::initialize_player', []);
    },

    equipSword: async (itemId: number) => {
        return moveClient.execute('ashfall::hero::equip_sword', [itemId]);
    },

    attack: async (enemyId: number) => {
        return moveClient.execute('ashfall::hero::attack_enemy', [enemyId]);
    }
};
```

---

## Game Entities

### Character
```typescript
interface Character {
    id: number;
    owner: string;
    class: 'Warrior' | 'Rogue' | 'Mage';
    level: number;
    experience: number;
    health: number;
    maxHealth: number;
    stats: {
        strength: number;
        agility: number;
        intelligence: number;
    };
    equipment: {
        weapon?: Weapon;
        armor?: Armor;
        accessory?: Accessory;
    };
    isAlive: boolean;
}
```

### Item
```typescript
interface Item {
    id: number;
    name: string;
    rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
    type: 'Weapon' | 'Armor' | 'Accessory' | 'Consumable';
    stats: ItemStats;
    enchantments: Enchantment[];
    durability: number;
    killCount: number;
}
```

### Dungeon
```typescript
interface DungeonRun {
    dungeonId: number;
    currentFloor: number;
    roomsCleared: number;
    enemiesKilled: number;
    itemsFound: Item[];
    startedAt: number;
}
```

---

## Combat System

### Turn-Based Action Points
```typescript
const ACTION_COSTS = {
    move: 1,
    attack: 2,
    useItem: 1,
    specialAbility: 3
};

const MAX_ACTION_POINTS = 4;
```

### Damage Calculation
```typescript
const calculateDamage = (attacker: Character, defender: Entity) => {
    const baseDamage = attacker.stats.strength * 0.5;
    const weaponDamage = attacker.equipment.weapon?.stats.damage ?? 0;
    const defense = defender.defense;

    const critChance = 0.05 + (attacker.stats.agility * 0.002);
    const isCrit = Math.random() < critChance;

    const rawDamage = baseDamage + weaponDamage;
    const mitigatedDamage = Math.max(1, rawDamage - defense);

    return isCrit ? mitigatedDamage * 2 : mitigatedDamage;
};
```

---

## Permadeath Flow

### On Character Death
1. Server detects HP <= 0
2. Server calls `character_death` on-chain
3. Contract burns all equipped items
4. Contract marks character as dead
5. Event emitted with lost items
6. Frontend shows death screen
7. Player creates new character

### Stash Protection
- Items in stash are NEVER at risk
- Can only deposit/withdraw when NOT in dungeon
- Stash has limited capacity (50 items)

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `/strategy-contracts <goal>` | Plan contracts implementation (prompts/contracts/) |
| `/strategy-frontend <goal>` | Plan frontend implementation (prompts/frontend/) |
| `/run-prompt <path>` | Execute prompt (e.g., `contracts/1` or `frontend/1`) |
| `/debug` | Debug across contracts, game, server |
| `/deploy-contracts` | Deploy Move modules to Movement |
| `/test-combat` | Run combat system tests |
| `/test-permadeath` | Test item burning on death |

---

## Common Patterns

### Loot Drop Generation
```move
public fun generate_loot(seed: u64, floor: u64): vector<Item> {
    let rarity = determine_rarity(seed, floor);
    let item_type = determine_type(seed);
    // ... create item with proper resource handling
}
```

### Wallet Connection
```typescript
import { usePrivy } from '@privy-io/react-auth';

const { login, authenticated, user } = usePrivy();

// Always check authentication before chain calls
if (!authenticated) {
    await login();
}
```

### Game Loop Integration
```typescript
// Sync chain state with game state
useEffect(() => {
    if (authenticated) {
        syncCharacterFromChain();
        syncInventoryFromChain();
    }
}, [authenticated]);
```

---

## Testing Checklist

### Smart Contracts
- [ ] Character creation for all classes
- [ ] Item minting with correct rarities
- [ ] Equipment/unequip flows
- [ ] Permadeath burns items correctly
- [ ] Stash deposit/withdraw
- [ ] Cannot transfer items during dungeon run

### Game Client
- [ ] Dungeon renders correctly
- [ ] Combat calculations match server
- [ ] Item pickups sync to chain
- [ ] Death screen shows lost items
- [ ] Inventory updates in real-time

### Integration
- [ ] Wallet connects successfully
- [ ] Transactions sign and execute
- [ ] Events trigger UI updates
- [ ] Server and chain stay in sync

---

## Issues & Learnings System

### Before Starting These Tasks, Read Relevant Issues:

| Task Type | Read First |
|-----------|------------|
| UI/Frontend | `../docs/issues/ui/README.md` |
| Move contracts | `../docs/issues/move/README.md` |
| Indexing/GraphQL | `../docs/issues/indexer/README.md` |
| Movement network | `../docs/issues/movement/README.md` |

### When to Document a New Learning

**DOCUMENT if ALL of these are true:**
1. It caused repeated back-and-forth debugging (wasted user's time)
2. It's non-obvious (you wouldn't naturally avoid it)
3. It will happen again in future projects
4. The fix isn't easily searchable in official docs

**DO NOT document:**
- Basic syntax errors or typos
- Standard patterns you already know
- One-off edge cases unlikely to repeat
- Things covered in official documentation

### How to Add a Learning

1. Determine category: `ui/`, `move/`, `indexer/`, or `movement/`
2. Read the existing README.md in that folder
3. Add new issue following the template format (increment ID)
4. Keep it focused: problem → root cause → solution → prevention
