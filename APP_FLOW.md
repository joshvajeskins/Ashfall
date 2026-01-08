# Ashfall - Application Flow

## Quick Start Testing

### Prerequisites
```bash
cd frontend && npm run dev
```
Open `http://localhost:3000`

---

## Complete Flow Test Checklist

### 1. Wallet Connection
- [ ] Open app → Click "Sign In"
- [ ] Complete Privy email authentication
- [ ] Movement wallet auto-created
- [ ] Wallet address shown in header

### 2. Character Creation
- [ ] No character? "Create Character" button appears
- [ ] Select class: Warrior / Rogue / Mage
- [ ] Transaction confirms on-chain
- [ ] Character card displays stats

### 3. Enter Dungeon
- [ ] Click "Enter Dungeon" on character card
- [ ] Phaser game canvas loads
- [ ] MenuScene shows character info
- [ ] Click "Start Dungeon"

### 4. Dungeon Gameplay
- [ ] DungeonScene loads Floor 1
- [ ] Navigate with arrow keys / WASD
- [ ] Enemies spawn in rooms
- [ ] Combat triggers on encounter
- [ ] Defeat enemy → XP + loot

### 5. Floor Progression
- [ ] Clear all enemies on floor
- [ ] `/api/dungeon/complete-floor` called
- [ ] Advance to next floor (1→5)
- [ ] Boss on Floor 5

### 6. Permadeath Test
- [ ] Let HP reach 0
- [ ] DeathScreen appears
- [ ] Items burned (chain confirmation)
- [ ] Character marked dead
- [ ] Return to character select

### 7. Victory Test
- [ ] Complete all 5 floors
- [ ] Defeat boss
- [ ] VictoryScreen shows stats
- [ ] Pending loot → Stash transfer
- [ ] Return to character select

### 8. Stash Verification
- [ ] Open Stash panel
- [ ] Items from dungeon run saved
- [ ] Gold balance updated

---

## User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          LANDING PAGE                                │
│                    (http://localhost:3000)                          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        PRIVY LOGIN                                   │
│              Email auth → Movement wallet created                    │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CHARACTER SELECT                                 │
│         ┌─────────────┐              ┌─────────────┐                │
│         │ No Character │              │  Has Char   │                │
│         │  → Create    │              │  → Card     │                │
│         └─────────────┘              └─────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASER GAME CANVAS                               │
│                                                                      │
│  BootScene → MenuScene → DungeonScene ←→ CombatScene                │
│                               │                                      │
│                    ┌──────────┴──────────┐                          │
│                    ▼                     ▼                          │
│              DeathScene            VictoryScene                      │
│           (Items burned)        (Loot to stash)                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/dungeon/complete-floor` | POST | Advance to next floor, award XP |
| `/api/dungeon/player-died` | POST | Burn items, mark character dead |
| `/api/dungeon/exit-success` | POST | Transfer pending loot to stash |
| `/api/dungeon/complete-boss` | POST | Boss defeated, award XP |
| `/api/sponsor-transaction` | POST | Gas sponsorship for user txs |

---

## State Management

### Zustand Stores

**gameStore** - Core game state
- `character` - Player stats, equipment, class
- `inventory` - Active items during run
- `stash` - Safe storage (survives death)
- `currentDungeonRun` - Floor, rooms cleared, enemies killed
- `pendingLoot` - Items collected (not yet permanent)

**uiStore** - UI state
- `activeModal` - Current modal displayed
- `deathState` - Death screen data
- `lootState` - Loot modal items

**walletStore** - Wallet info
- `address` - User's Movement wallet address

---

## Smart Contracts

| Module | Purpose |
|--------|---------|
| `hero.move` | Character creation, stats, equipment |
| `enemies.move` | Enemy types, spawning by floor |
| `items.move` | Weapons, armor, accessories, consumables |
| `dungeon.move` | Dungeon run state, server-authorized actions |
| `loot.move` | Drop tables, rarity by floor |
| `stash.move` | Safe storage (50 items max) |

---

## Key Mechanics

### Permadeath
- HP → 0 triggers death
- ALL equipped items burned on-chain
- Character marked as dead
- Must create new character

### Pending Loot System
- Items collected during run are **in-memory only**
- On death: Lost forever (never committed)
- On exit: Transferred to stash via server call
- Prevents client-side cheating

### Server-Authoritative
- All dungeon outcomes controlled by server
- Server signs transactions (Shinami Invisible Wallet)
- Users never pay gas
- Anti-cheat by design

---

## File Structure

```
frontend/src/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── providers.tsx            # Privy provider
│   └── api/dungeon/             # Server endpoints
├── components/
│   ├── character/               # Select, Create, Card
│   ├── game/GameCanvas.tsx      # Phaser wrapper
│   └── modals/                  # Death, Loot, Victory
├── game/
│   ├── scenes/                  # Boot, Menu, Dungeon, Combat, Death, Victory
│   └── systems/                 # Combat, Loot, Spawning
├── stores/                      # Zustand stores
├── lib/
│   ├── move/                    # Chain interactions
│   └── shinami/                 # Gas station
└── types/                       # TypeScript interfaces

contracts/sources/
├── hero.move
├── enemies.move
├── items.move
├── dungeon.move
├── loot.move
└── stash.move
```

---

## Troubleshooting

### Wallet not connecting
- Check Privy config in `providers.tsx`
- Verify Movement network settings

### Transaction failing
- Check Shinami API keys in `.env`
- Verify server wallet has gas

### Game not loading
- Check browser console for Phaser errors
- Verify assets loaded in BootScene

### Items not persisting
- Ensure `/api/dungeon/exit-success` called
- Check stash capacity (50 max)
