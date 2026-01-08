# Ashfall - Hackathon Submission

## Movement Hackathon 2025

---

## Project Name
**Ashfall** - A Permadeath Roguelike with True On-Chain Item Ownership

---

## Tagline
*"Every sword has a story. Every death is permanent. Your items exist on-chain—until they don't."*

---

## Problem Statement

### The Illusion of Ownership in Gaming

Traditional games and even most blockchain games fail to deliver **true item ownership**:

1. **Centralized Databases**: Items in traditional games exist only in company servers. Game shuts down? Items gone. Account banned? Items gone.

2. **NFT Games Fake Scarcity**: Most blockchain games mint NFTs but the game logic runs off-chain. The NFT is just a receipt—the actual item behavior is controlled by centralized servers.

3. **No Real Consequences**: Even "play-to-earn" games let you keep items forever. There's no risk, no tension, no meaningful decisions about what to bring into battle.

4. **Duplication Exploits**: Traditional games constantly battle item duplication bugs. Economies collapse when exploits are found.

### The Core Problem
**Players don't truly own their items, and items have no real value because there's no real risk.**

---

## Solution

### Ashfall: Move Resources as Game Items

Ashfall leverages Movement's **Move language resource model** to create the first roguelike where:

1. **Items ARE Resources**: Every weapon, armor, and accessory is a Move resource with `key` and `store` abilities—but critically, **NO `copy` ability**. This is enforced at the VM level, making duplication mathematically impossible.

2. **Permadeath Burns Items**: When your character dies in the dungeon, all equipped items are **destroyed on-chain**. Not transferred, not locked—destroyed. The resource is deconstructed and ceases to exist.

3. **Server-Authoritative Anti-Cheat**: Game outcomes are determined by the server, which signs all transactions. Players can't fake a victory or prevent their death.

4. **Stash System**: Items in your stash survive death. The strategic decision of what to risk vs. what to protect creates meaningful gameplay.

### Why This Matters

```
Traditional Game:     Die → Respawn → Keep everything
NFT Game:            Die → Respawn → Keep NFT → No consequences
Ashfall:             Die → Items BURNED FOREVER → Real loss → Real value
```

**Move's resource model isn't just a feature—it's the entire game design.**

---

## How It Works

### Game Loop

```
1. CREATE CHARACTER
   └─→ Choose class (Warrior/Rogue/Mage)
   └─→ Character minted on-chain

2. MANAGE INVENTORY
   └─→ Equip items from stash (risk them)
   └─→ Keep valuable items safe (no risk, no reward)

3. ENTER DUNGEON
   └─→ 5 floors of procedurally generated rooms
   └─→ Enemies scale with floor depth
   └─→ Loot drops based on rarity tables

4. COMBAT
   └─→ Turn-based tactical combat
   └─→ Action point system
   └─→ Equipment affects damage/defense

5. OUTCOME
   └─→ VICTORY: Pending loot transfers to stash permanently
   └─→ DEATH: ALL equipped items burned on-chain
```

### The Risk/Reward Loop

| Scenario | Risk Level | Potential Reward |
|----------|-----------|------------------|
| Enter with starter gear | Low | Common drops |
| Equip rare sword | High | +damage, faster clears, better loot |
| Bring legendary armor | Extreme | Survive longer, reach deeper floors |

**The better your gear, the more you have to lose.**

---

## Technical Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Blockchain** | Movement Network | High-throughput Move VM execution |
| **Smart Contracts** | Move Language | Resource-based item ownership |
| **Frontend** | Next.js 14 | React framework with App Router |
| **Game Engine** | Phaser.js 3 | 2D game rendering and physics |
| **Auth** | Privy | Embedded wallet, email login |
| **Gas Sponsorship** | Shinami | Users never pay gas |
| **State** | Zustand | Client-side state management |
| **Styling** | Tailwind CSS | Responsive dark theme UI |

### Smart Contract Architecture

```
contracts/sources/
├── hero.move       # Character: stats, class, equipment slots
├── enemies.move    # Enemy types: Skeleton → Lich (by floor)
├── items.move      # Weapon, Armor, Accessory, Consumable resources
├── dungeon.move    # DungeonRun state, server-authorized actions
├── loot.move       # Drop tables, floor-based rarity scaling
└── stash.move      # Safe storage (50 items, survives death)
```

### Key Move Patterns

**Resource Definition (No Copy)**
```move
struct Weapon has key, store {
    id: u64,
    damage: u64,
    rarity: u8,
    kill_count: u64
}
// NO `copy` ability = impossible to duplicate
```

**Permadeath Item Burning**
```move
public fun burn_on_death(weapon: Weapon) {
    // Destructure = destroy forever
    let Weapon { id: _, damage: _, rarity: _, kill_count: _ } = weapon;
    // Resource no longer exists anywhere
}
```

**Server Authorization**
```move
public entry fun complete_floor(
    server: &signer,  // Only game server can call
    player: address,
    floor: u64,
    xp_earned: u64
) {
    assert!(is_authorized_server(signer::address_of(server)), E_UNAUTHORIZED);
    // Process floor completion
}
```

### Frontend Architecture

```
frontend/src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Landing + character select
│   └── api/dungeon/        # Server-authorized endpoints
├── components/
│   ├── game/               # Phaser canvas wrapper
│   ├── character/          # Creation, selection, display
│   └── modals/             # Death, loot, victory screens
├── game/
│   ├── scenes/             # Boot, Menu, Dungeon, Combat, Death, Victory
│   └── systems/            # Combat calculations, loot generation
├── stores/                 # Zustand state management
└── lib/
    ├── move/               # Chain interaction services
    └── shinami/            # Gas sponsorship integration
```

---

## Why Movement?

### 1. Move's Resource Model
Move was designed for digital assets. Resources can't be copied or dropped accidentally—they must be explicitly moved or destroyed. This is **enforced at the VM level**, not application logic.

### 2. High Throughput
Roguelikes need fast transactions for combat actions. Movement's parallel execution handles the load.

### 3. Low Latency
Sub-second finality means game state updates feel responsive.

### 4. EVM Compatibility Path
Movement's roadmap includes EVM compatibility, allowing future cross-chain item trading.

---

## Business Model

### Revenue Streams

| Stream | Description | Timeline |
|--------|-------------|----------|
| **Dungeon Tickets** | Premium dungeons with better loot tables | Launch |
| **Cosmetic Skins** | Character/weapon appearances (no gameplay advantage) | Month 2 |
| **Marketplace Fee** | 2.5% on P2P item trades | Month 3 |
| **Season Pass** | Exclusive dungeons, cosmetics, early access | Month 4 |
| **Tournament Entry** | Competitive permadeath races | Month 6 |

### Tokenomics (Future)

| Token | Purpose |
|-------|---------|
| **$ASH** | Governance, staking, marketplace currency |
| **Burn Mechanism** | Item destruction burns small $ASH amount |
| **Staking Rewards** | Stake $ASH for dungeon ticket discounts |

### Unit Economics

```
Cost per user (gas sponsorship): ~$0.001/transaction
Average transactions per session: 20
Monthly active user cost: ~$0.60

Revenue per paying user: $5-15/month
Target conversion rate: 5%
Break-even MAU: 10,000
```

---

## Competitive Analysis

| Feature | Ashfall | Loot (NFT) | Axie Infinity | Dark Forest |
|---------|---------|------------|---------------|-------------|
| True item scarcity | ✅ VM-enforced | ❌ Mintable | ❌ Breeding | ❌ N/A |
| Permadeath | ✅ Items burned | ❌ | ❌ | ✅ Planet loss |
| Gasless UX | ✅ Shinami | ❌ | ❌ | ❌ |
| Real gameplay | ✅ Roguelike | ❌ Just NFTs | ⚠️ Basic | ✅ Strategy |
| Anti-cheat | ✅ Server-auth | N/A | ⚠️ Exploited | ✅ ZK proofs |

### Unique Value Proposition
**Ashfall is the only game where blockchain technology directly enables the core gameplay mechanic (permadeath with real item loss), rather than being bolted on as a monetization layer.**

---

## Traction & Milestones

### Completed (Hackathon)
- [x] Core smart contracts deployed on Movement testnet
- [x] Character creation and class system
- [x] 5-floor dungeon with procedural generation
- [x] Turn-based combat system
- [x] Permadeath with on-chain item burning
- [x] Stash system for safe storage
- [x] Privy wallet integration
- [x] Shinami gas sponsorship
- [x] Full game loop playable

### Post-Hackathon Roadmap

**Month 1-2: Polish**
- Sound effects and music
- Additional enemy types
- More item variety
- Mobile responsiveness

**Month 3: Economy**
- P2P marketplace
- Item enchanting system
- Guild system

**Month 4-6: Expansion**
- New dungeon biomes
- Boss raids (multiplayer)
- Leaderboards and seasons
- Tournament mode

**Month 7-12: Scale**
- Mainnet launch
- $ASH token launch
- Cross-chain bridges
- Mobile native apps

---

## Future Scope

### Technical Roadmap

1. **Multiplayer Dungeons**: Co-op runs where party wipes burn everyone's items
2. **PvP Arena**: Stake items, winner takes all
3. **Procedural Item Generation**: On-chain randomness for unique item stats
4. **Achievement NFTs**: Non-tradeable badges for accomplishments
5. **Replay System**: On-chain action log for verifiable speedruns

### Game Content Roadmap

1. **New Classes**: Paladin, Necromancer, Archer
2. **Biomes**: Ice caves, volcanic depths, eldritch realms
3. **World Bosses**: Server-wide events with legendary drops
4. **Crafting**: Combine items to create new ones (burns originals)
5. **Seasons**: Time-limited dungeons with exclusive loot

### Ecosystem Integration

1. **Movement DeFi**: Use items as collateral for loans
2. **Cross-Game Items**: Partner games can import Ashfall items
3. **Creator Tools**: User-generated dungeons with revenue share

---

## Team

| Role | Background |
|------|------------|
| **Full-Stack Developer** | Smart contracts, frontend, game systems |

*Built during Movement Hackathon 2025*

---

## Demo

### Live Demo
[Link to deployed application]

### Video Walkthrough
[Link to demo video]

### Test Instructions
1. Visit app URL
2. Sign in with email (Privy)
3. Create a character
4. Enter the dungeon
5. Try to survive (or don't—watch your items burn!)

---

## Technical Achievements

### 1. Zero-Gas UX
Players never see a gas prompt. Shinami Invisible Wallet + Gas Station handles everything server-side.

### 2. True Resource Scarcity
Not a single item can be duplicated. Move VM enforces this at the bytecode level.

### 3. Server-Authoritative Anti-Cheat
All game outcomes determined by server. Client is purely for rendering.

### 4. Seamless Web3 Onboarding
Email login → automatic wallet creation → immediate gameplay. No seed phrases, no extensions.

### 5. Responsive Real-Time Game
Phaser.js delivers 60fps gameplay while maintaining blockchain state sync.

---

## Challenges Overcome

### 1. Move Resource Handling
**Problem**: Resources can't be copied, so passing items between functions required careful ownership tracking.
**Solution**: Used references and explicit move semantics throughout the codebase.

### 2. Gas Sponsorship Integration
**Problem**: Shinami SDK had limited Move/Movement examples.
**Solution**: Built custom integration layer with proper Ed25519 signature handling.

### 3. State Synchronization
**Problem**: Game state must match chain state without constant RPC calls.
**Solution**: Event-driven updates with optimistic UI and chain confirmation.

### 4. Permadeath UX
**Problem**: Permanent item loss could feel frustrating.
**Solution**: Clear warnings, stash system for protection, and satisfying death animations.

---

## Links

| Resource | URL |
|----------|-----|
| GitHub Repository | [repo-url] |
| Live Demo | [demo-url] |
| Demo Video | [video-url] |
| Smart Contracts | [explorer-url] |

---

## Contact

**Project**: Ashfall
**Event**: Movement Hackathon 2025
**Email**: [contact-email]
**Twitter**: [twitter-handle]

---

## Appendix: Contract Addresses

```
Movement Testnet:

Hero Module:     0x...
Enemies Module:  0x...
Items Module:    0x...
Dungeon Module:  0x...
Loot Module:     0x...
Stash Module:    0x...
```

---

## Summary

Ashfall demonstrates that **blockchain technology can be a core game mechanic, not just a monetization layer**.

Move's resource model enables true digital scarcity—items that genuinely cannot be duplicated and can be permanently destroyed. This creates real stakes, real value, and real emotional investment in gameplay.

**We didn't build a game with NFTs. We built a game that could only exist on Movement.**
