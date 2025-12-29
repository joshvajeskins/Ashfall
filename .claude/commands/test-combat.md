# Test Combat System

Run combat system tests across all layers.

## Test Scope

Target: `$ARGUMENTS` (or full combat system if not specified)

## Test Layers

### 1. Move Contract Tests
```bash
cd contracts
aptos move test --filter combat
aptos move test --filter damage
aptos move test --filter character
```

Expected tests:
- `test_damage_calculation`
- `test_critical_hit`
- `test_defense_mitigation`
- `test_permadeath_on_zero_hp`

### 2. Server Logic Tests
```bash
cd server
npm test -- --grep "combat"
```

Expected tests:
- Combat calculation matches Move logic
- Turn system alternates correctly
- Death triggers chain call

### 3. Client Unit Tests
```bash
cd frontend
npm test -- --grep "CombatSystem"
```

Expected tests:
- Damage numbers display
- Health bars update
- Death screen triggers

### 4. E2E Test
Use Playwright to test full flow:
1. Enter dungeon
2. Find enemy
3. Attack enemy
4. Verify damage applied
5. Kill enemy
6. Verify loot drops

## Report

Summary of:
- Tests passed/failed
- Coverage gaps identified
- Issues found
