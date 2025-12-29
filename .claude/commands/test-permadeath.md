# Test Permadeath System

Comprehensive test of the permadeath mechanics - the core feature of MoveRogue.

## Test Scope

Target: `$ARGUMENTS` (or full permadeath flow if not specified)

## Critical Path

```
Character has items equipped
    ↓
Character HP reaches 0
    ↓
Server calls character_death on-chain
    ↓
Contract destroys equipped items
    ↓
Contract emits CharacterDied event
    ↓
Client shows death screen with lost items
    ↓
Player creates new character
    ↓
Stashed items still exist
```

## Test Cases

### 1. Move Contract Tests
```bash
cd contracts
aptos move test --filter death
aptos move test --filter destroy
aptos move test --filter permadeath
```

Key assertions:
- [ ] Equipped weapon is destroyed
- [ ] Equipped armor is destroyed
- [ ] Equipped accessory is destroyed
- [ ] Stash items are NOT affected
- [ ] CharacterDied event emitted with item IDs

### 2. Resource Verification
```move
#[test]
fun test_items_burned_on_death() {
    // Setup character with weapon
    let weapon = weapon::create(...);
    let char = character::create_with_weapon(weapon);

    // Kill character
    character::die(char);

    // Weapon should no longer exist
    // (This is enforced by Move - destroyed resources are gone)
}
```

### 3. Stash Protection Test
```move
#[test]
fun test_stash_survives_death() {
    // Deposit weapon to stash
    stash::deposit_weapon(player, weapon);

    // Kill character
    character::die(char);

    // Stash should still have weapon
    assert!(stash::weapon_count(player) == 1, 0);
}
```

### 4. E2E Flow

Using Playwright:
1. Create character
2. Equip items
3. Deposit one item to stash
4. Enter dungeon
5. Trigger death (debug command)
6. Verify death screen shows lost items
7. Create new character
8. Verify stash item still exists

## Verification

After tests pass:
- [ ] No way to duplicate items before death
- [ ] All equipped items truly destroyed
- [ ] Events properly logged
- [ ] UI correctly displays lost items
- [ ] New character starts fresh
- [ ] Stash remains intact

## Report

Document:
- All test results
- Any edge cases discovered
- Recommendations for hardening
