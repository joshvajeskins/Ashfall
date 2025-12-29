---
name: move-dev
description: Writing Move modules, testing, and deployment on Movement Network. Use for smart contract development. (project)
---

# Move Development Skill

## Movement Network Context

Movement is an Aptos-based L2 with fast finality. Move is the smart contract language.

### Key Differences from Solidity

| Aspect | Solidity | Move |
|--------|----------|------|
| Resources | Mappings | Structs stored under accounts |
| Ownership | Implicit | Explicit resource ownership |
| Reentrancy | Major concern | Prevented by design |
| Generics | Limited | First-class support |
| Testing | Foundry/Hardhat | Aptos CLI |

## BEFORE WRITING ANY CODE

### Step 1: Check Known Issues & Documentation

1. **Check `docs/issues/move/README.md`** for known pitfalls
2. **Use Context7 for documentation:** resolve library ID first, then fetch with your topic

## Project Structure

```
contracts/
├── Move.toml           # Package manifest
├── sources/
│   ├── module.move     # Main module
│   └── helpers.move    # Helper functions
├── tests/
│   └── module_tests.move
└── scripts/            # Deployment scripts
```

## Move Patterns

### Module Declaration
```move
module myapp::main {
    use std::signer;
    use aptos_framework::coin;
    use aptos_framework::event;

    // Error codes as constants
    const E_NOT_FOUND: u64 = 1;
    const E_UNAUTHORIZED: u64 = 2;

    // Structs with abilities
    struct MyResource has key, store, drop {
        id: u64,
        data: vector<u8>
    }

    // Entry functions (callable from outside)
    public entry fun create(account: &signer) { }

    // View functions (read-only)
    #[view]
    public fun get_data(addr: address): u64 { }
}
```

### Resource Management
```move
// Store under account
move_to(account, Resource { ... });

// Borrow immutable
let resource = borrow_global<Resource>(addr);

// Borrow mutable
let resource = borrow_global_mut<Resource>(addr);

// Check existence
exists<Resource>(addr)

// Remove from account
let resource = move_from<Resource>(addr);
```

### Abilities

| Ability | Meaning |
|---------|---------|
| `key` | Can be stored as top-level resource |
| `store` | Can be stored inside other resources |
| `copy` | Can be copied (duplicated) |
| `drop` | Can be dropped (destroyed implicitly) |

### Events
```move
#[event]
struct MyEvent has drop, store {
    user: address,
    amount: u64
}

public entry fun do_something(account: &signer) {
    // ... logic
    event::emit(MyEvent {
        user: signer::address_of(account),
        amount: 100
    });
}
```

### Generics for Coins
```move
public entry fun transfer<CoinType>(
    from: &signer,
    to: address,
    amount: u64
) {
    let coins = coin::withdraw<CoinType>(from, amount);
    coin::deposit(to, coins);
}
```

## CLI Commands

```bash
# Initialize project
aptos move init --name myproject

# Compile
aptos move compile

# Test
aptos move test

# Test with coverage
aptos move test --coverage

# Initialize profile for Movement
aptos init --profile movement-testnet \
  --network custom \
  --rest-url https://aptos.testnet.porto.movementlabs.xyz/v1

# Publish to Movement testnet
aptos move publish --profile movement-testnet

# Call view function
aptos move view \
  --function-id 'MODULE_ADDR::module::view_func' \
  --profile movement-testnet

# Call entry function
aptos move run \
  --function-id 'MODULE_ADDR::module::entry_func' \
  --args TYPE:VALUE \
  --profile movement-testnet
```

## Testing

```move
#[test_only]
module myapp::tests {
    use myapp::main;
    use std::signer;

    #[test(account = @0x1)]
    fun test_basic(account: &signer) {
        // Setup
        main::initialize(account);

        // Execute
        main::do_action(account);

        // Assert
        assert!(main::get_value(signer::address_of(account)) == 100, 0);
    }

    #[test(account = @0x1)]
    #[expected_failure(abort_code = main::E_NOT_FOUND)]
    fun test_failure_case(account: &signer) {
        // Should abort with E_NOT_FOUND
        main::get_nonexistent(account);
    }
}
```

## File Size Limits

- Each Move module: max 300 lines
- Split large modules into separate files
- Use helper modules for shared logic

## Security Checklist

- [ ] All abort codes documented
- [ ] Access control on sensitive functions
- [ ] No integer overflow (use checked math)
- [ ] Resource cleanup (no orphaned resources)
- [ ] Event emission for off-chain tracking
- [ ] Signer validation on entry functions

## Common Patterns

### Access Control
```move
const E_NOT_ADMIN: u64 = 100;

public entry fun admin_only(account: &signer) {
    assert!(signer::address_of(account) == @admin, E_NOT_ADMIN);
    // ... admin logic
}
```

### Initialization Guard
```move
struct Config has key {
    initialized: bool
}

public entry fun initialize(admin: &signer) {
    assert!(!exists<Config>(@myapp), E_ALREADY_INITIALIZED);
    move_to(admin, Config { initialized: true });
}
```

### Safe Math
```move
// Move has built-in overflow protection
// These will abort on overflow:
let sum = a + b;
let product = a * b;

// For explicit handling:
use aptos_std::math64;
let result = math64::min(a, b);
```
