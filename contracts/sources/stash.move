module ashfall::stash {
    use std::vector;
    use std::signer;
    use aptos_framework::event;
    use ashfall::items::{Self, Weapon, Armor, Accessory, Consumable};

    // =============================================
    // ashfall::stash
    //
    // Safe item storage (survives death):
    // - Deposit items before dungeon runs
    // - Withdraw items for loadout
    // - Limited capacity (50 items)
    // - Cannot access during dungeon run
    // =============================================

    const E_STASH_FULL: u64 = 1;
    const E_INVALID_INDEX: u64 = 3;
    const E_STASH_NOT_INITIALIZED: u64 = 4;
    const E_STASH_EXISTS: u64 = 5;

    const MAX_STASH_SIZE: u64 = 50;

    // =============================================
    // STASH - Safe storage resource
    // =============================================

    struct Stash has key {
        owner: address,
        weapons: vector<Weapon>,
        armors: vector<Armor>,
        accessories: vector<Accessory>,
        consumables: vector<Consumable>,
        gold: u64
    }

    // =============================================
    // EVENTS
    // =============================================

    #[event]
    struct StashCreated has drop, store {
        owner: address
    }

    #[event]
    struct WeaponDeposited has drop, store {
        owner: address,
        weapon_id: u64
    }

    #[event]
    struct WeaponWithdrawn has drop, store {
        owner: address,
        weapon_id: u64
    }

    #[event]
    struct ArmorDeposited has drop, store {
        owner: address,
        armor_id: u64
    }

    #[event]
    struct ArmorWithdrawn has drop, store {
        owner: address,
        armor_id: u64
    }

    #[event]
    struct AccessoryDeposited has drop, store {
        owner: address,
        accessory_id: u64
    }

    #[event]
    struct AccessoryWithdrawn has drop, store {
        owner: address,
        accessory_id: u64
    }

    #[event]
    struct ConsumableDeposited has drop, store {
        owner: address,
        consumable_type: u8
    }

    #[event]
    struct ConsumableWithdrawn has drop, store {
        owner: address,
        consumable_type: u8
    }

    #[event]
    struct GoldDeposited has drop, store {
        owner: address,
        amount: u64
    }

    #[event]
    struct GoldWithdrawn has drop, store {
        owner: address,
        amount: u64
    }

    // =============================================
    // INITIALIZATION
    // =============================================

    public entry fun init_stash(account: &signer) {
        let owner = signer::address_of(account);
        assert!(!exists<Stash>(owner), E_STASH_EXISTS);

        move_to(account, Stash {
            owner,
            weapons: vector::empty(),
            armors: vector::empty(),
            accessories: vector::empty(),
            consumables: vector::empty(),
            gold: 0
        });

        event::emit(StashCreated { owner });
    }

    // =============================================
    // HELPER - Capacity check
    // =============================================

    fun get_total_items(stash: &Stash): u64 {
        vector::length(&stash.weapons) +
        vector::length(&stash.armors) +
        vector::length(&stash.accessories) +
        vector::length(&stash.consumables)
    }

    // =============================================
    // DEPOSIT FUNCTIONS - Move items INTO stash
    // =============================================

    public fun deposit_weapon(account: &signer, weapon: Weapon) acquires Stash {
        let owner = signer::address_of(account);
        assert!(exists<Stash>(owner), E_STASH_NOT_INITIALIZED);

        let stash = borrow_global_mut<Stash>(owner);
        assert!(get_total_items(stash) < MAX_STASH_SIZE, E_STASH_FULL);

        let weapon_id = items::weapon_id(&weapon);
        vector::push_back(&mut stash.weapons, weapon);

        event::emit(WeaponDeposited { owner, weapon_id });
    }

    public fun deposit_armor(account: &signer, armor: Armor) acquires Stash {
        let owner = signer::address_of(account);
        assert!(exists<Stash>(owner), E_STASH_NOT_INITIALIZED);

        let stash = borrow_global_mut<Stash>(owner);
        assert!(get_total_items(stash) < MAX_STASH_SIZE, E_STASH_FULL);

        let armor_id = items::armor_id(&armor);
        vector::push_back(&mut stash.armors, armor);

        event::emit(ArmorDeposited { owner, armor_id });
    }

    public fun deposit_accessory(account: &signer, accessory: Accessory) acquires Stash {
        let owner = signer::address_of(account);
        assert!(exists<Stash>(owner), E_STASH_NOT_INITIALIZED);

        let stash = borrow_global_mut<Stash>(owner);
        assert!(get_total_items(stash) < MAX_STASH_SIZE, E_STASH_FULL);

        let accessory_id = items::accessory_id(&accessory);
        vector::push_back(&mut stash.accessories, accessory);

        event::emit(AccessoryDeposited { owner, accessory_id });
    }

    public fun deposit_consumable(account: &signer, consumable: Consumable) acquires Stash {
        let owner = signer::address_of(account);
        assert!(exists<Stash>(owner), E_STASH_NOT_INITIALIZED);

        let stash = borrow_global_mut<Stash>(owner);
        assert!(get_total_items(stash) < MAX_STASH_SIZE, E_STASH_FULL);

        let consumable_type = items::consumable_type(&consumable);
        vector::push_back(&mut stash.consumables, consumable);

        event::emit(ConsumableDeposited { owner, consumable_type });
    }

    public fun deposit_gold(account: &signer, amount: u64) acquires Stash {
        let owner = signer::address_of(account);
        assert!(exists<Stash>(owner), E_STASH_NOT_INITIALIZED);

        let stash = borrow_global_mut<Stash>(owner);
        stash.gold = stash.gold + amount;

        event::emit(GoldDeposited { owner, amount });
    }

    // =============================================
    // DUNGEON DEPOSIT FUNCTIONS - Server authorized
    // Used when exiting dungeon to transfer loot
    // =============================================

    public fun deposit_weapon_from_dungeon(player: address, weapon: Weapon) acquires Stash {
        assert!(exists<Stash>(player), E_STASH_NOT_INITIALIZED);

        let stash = borrow_global_mut<Stash>(player);
        assert!(get_total_items(stash) < MAX_STASH_SIZE, E_STASH_FULL);

        let weapon_id = items::weapon_id(&weapon);
        vector::push_back(&mut stash.weapons, weapon);

        event::emit(WeaponDeposited { owner: player, weapon_id });
    }

    public fun deposit_armor_from_dungeon(player: address, armor: Armor) acquires Stash {
        assert!(exists<Stash>(player), E_STASH_NOT_INITIALIZED);

        let stash = borrow_global_mut<Stash>(player);
        assert!(get_total_items(stash) < MAX_STASH_SIZE, E_STASH_FULL);

        let armor_id = items::armor_id(&armor);
        vector::push_back(&mut stash.armors, armor);

        event::emit(ArmorDeposited { owner: player, armor_id });
    }

    public fun deposit_accessory_from_dungeon(player: address, accessory: Accessory) acquires Stash {
        assert!(exists<Stash>(player), E_STASH_NOT_INITIALIZED);

        let stash = borrow_global_mut<Stash>(player);
        assert!(get_total_items(stash) < MAX_STASH_SIZE, E_STASH_FULL);

        let accessory_id = items::accessory_id(&accessory);
        vector::push_back(&mut stash.accessories, accessory);

        event::emit(AccessoryDeposited { owner: player, accessory_id });
    }

    public fun deposit_gold_from_dungeon(player: address, amount: u64) acquires Stash {
        assert!(exists<Stash>(player), E_STASH_NOT_INITIALIZED);

        let stash = borrow_global_mut<Stash>(player);
        stash.gold = stash.gold + amount;

        event::emit(GoldDeposited { owner: player, amount });
    }

    // =============================================
    // WITHDRAW FUNCTIONS - Move items OUT of stash
    // =============================================

    public fun withdraw_weapon(account: &signer, index: u64): Weapon acquires Stash {
        let owner = signer::address_of(account);
        assert!(exists<Stash>(owner), E_STASH_NOT_INITIALIZED);

        let stash = borrow_global_mut<Stash>(owner);
        assert!(index < vector::length(&stash.weapons), E_INVALID_INDEX);

        let weapon = vector::swap_remove(&mut stash.weapons, index);
        let weapon_id = items::weapon_id(&weapon);

        event::emit(WeaponWithdrawn { owner, weapon_id });
        weapon
    }

    public fun withdraw_armor(account: &signer, index: u64): Armor acquires Stash {
        let owner = signer::address_of(account);
        assert!(exists<Stash>(owner), E_STASH_NOT_INITIALIZED);

        let stash = borrow_global_mut<Stash>(owner);
        assert!(index < vector::length(&stash.armors), E_INVALID_INDEX);

        let armor = vector::swap_remove(&mut stash.armors, index);
        let armor_id = items::armor_id(&armor);

        event::emit(ArmorWithdrawn { owner, armor_id });
        armor
    }

    public fun withdraw_accessory(account: &signer, index: u64): Accessory acquires Stash {
        let owner = signer::address_of(account);
        assert!(exists<Stash>(owner), E_STASH_NOT_INITIALIZED);

        let stash = borrow_global_mut<Stash>(owner);
        assert!(index < vector::length(&stash.accessories), E_INVALID_INDEX);

        let accessory = vector::swap_remove(&mut stash.accessories, index);
        let accessory_id = items::accessory_id(&accessory);

        event::emit(AccessoryWithdrawn { owner, accessory_id });
        accessory
    }

    public fun withdraw_consumable(account: &signer, index: u64): Consumable acquires Stash {
        let owner = signer::address_of(account);
        assert!(exists<Stash>(owner), E_STASH_NOT_INITIALIZED);

        let stash = borrow_global_mut<Stash>(owner);
        assert!(index < vector::length(&stash.consumables), E_INVALID_INDEX);

        let consumable = vector::swap_remove(&mut stash.consumables, index);
        let consumable_type = items::consumable_type(&consumable);

        event::emit(ConsumableWithdrawn { owner, consumable_type });
        consumable
    }

    public fun withdraw_gold(account: &signer, amount: u64): u64 acquires Stash {
        let owner = signer::address_of(account);
        assert!(exists<Stash>(owner), E_STASH_NOT_INITIALIZED);

        let stash = borrow_global_mut<Stash>(owner);
        let withdraw = if (amount > stash.gold) { stash.gold } else { amount };
        stash.gold = stash.gold - withdraw;

        event::emit(GoldWithdrawn { owner, amount: withdraw });
        withdraw
    }

    // =============================================
    // VIEW FUNCTIONS
    // =============================================

    public fun max_stash_size(): u64 { MAX_STASH_SIZE }

    #[view]
    public fun stash_exists(owner: address): bool {
        exists<Stash>(owner)
    }

    #[view]
    public fun get_stash_counts(owner: address): (u64, u64, u64, u64, u64) acquires Stash {
        let stash = borrow_global<Stash>(owner);
        (
            vector::length(&stash.weapons),
            vector::length(&stash.armors),
            vector::length(&stash.accessories),
            vector::length(&stash.consumables),
            stash.gold
        )
    }

    #[view]
    public fun get_total_stash_items(owner: address): u64 acquires Stash {
        let stash = borrow_global<Stash>(owner);
        get_total_items(stash)
    }

    #[view]
    public fun get_stash_capacity_remaining(owner: address): u64 acquires Stash {
        let stash = borrow_global<Stash>(owner);
        MAX_STASH_SIZE - get_total_items(stash)
    }

    #[view]
    public fun get_gold(owner: address): u64 acquires Stash {
        let stash = borrow_global<Stash>(owner);
        stash.gold
    }

    #[view]
    public fun has_capacity_for(owner: address, count: u64): bool acquires Stash {
        if (!exists<Stash>(owner)) { return false };
        let stash = borrow_global<Stash>(owner);
        (MAX_STASH_SIZE - get_total_items(stash)) >= count
    }
}
