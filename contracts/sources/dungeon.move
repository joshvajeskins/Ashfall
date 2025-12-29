module ashfall::dungeon {
    use std::signer;
    use std::string;
    use std::vector;
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use ashfall::items::{Self, Weapon, Armor, Accessory};
    use ashfall::hero;
    use ashfall::stash;

    // =============================================
    // ashfall::dungeon
    //
    // Dungeon run state management:
    // - Enter/exit dungeon with character locking
    // - Floor progression with server auth
    // - Pending loot collection
    // - Death handling burns all loot
    // =============================================

    const E_NOT_IN_DUNGEON: u64 = 1;
    const E_ALREADY_IN_DUNGEON: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;
    const E_INVALID_FLOOR: u64 = 4;
    const E_CHARACTER_DEAD: u64 = 5;
    const E_NO_CHARACTER: u64 = 6;
    const E_RUN_NOT_ACTIVE: u64 = 7;

    const MAX_FLOORS: u64 = 5;

    // =============================================
    // SERVER AUTHORIZATION
    // =============================================

    struct ServerConfig has key {
        authorized_servers: vector<address>
    }

    fun init_module(account: &signer) {
        let deployer = signer::address_of(account);
        move_to(account, ServerConfig {
            authorized_servers: vector[deployer]
        });
    }

    public entry fun add_server(admin: &signer, server: address) acquires ServerConfig {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @ashfall, E_UNAUTHORIZED);
        let config = borrow_global_mut<ServerConfig>(@ashfall);
        vector::push_back(&mut config.authorized_servers, server);
    }

    fun is_authorized_server(addr: address): bool acquires ServerConfig {
        let config = borrow_global<ServerConfig>(@ashfall);
        vector::contains(&config.authorized_servers, &addr)
    }

    // =============================================
    // PENDING LOOT - Items found but not yet claimed
    // =============================================

    struct PendingLoot has store {
        weapons: vector<Weapon>,
        armors: vector<Armor>,
        accessories: vector<Accessory>,
        gold: u64
    }

    // =============================================
    // DUNGEON RUN - Active run state
    // =============================================

    struct DungeonRun has key {
        dungeon_id: u64,
        player: address,
        current_floor: u64,
        rooms_cleared: u64,
        enemies_killed: u64,
        started_at: u64,
        is_active: bool,
        pending_loot: PendingLoot
    }

    struct FloorResult has copy, drop, store {
        floor: u64,
        enemies_killed: u64,
        chests_opened: u64,
        xp_earned: u64,
        completed: bool
    }

    // =============================================
    // EVENTS
    // =============================================

    #[event]
    struct DungeonEntered has drop, store {
        player: address,
        dungeon_id: u64,
        timestamp: u64
    }

    #[event]
    struct FloorCompleted has drop, store {
        player: address,
        dungeon_id: u64,
        floor: u64,
        enemies_killed: u64,
        xp_earned: u64
    }

    #[event]
    struct DungeonCompleted has drop, store {
        player: address,
        dungeon_id: u64,
        total_floors: u64,
        total_kills: u64,
        weapons_claimed: u64,
        armors_claimed: u64
    }

    #[event]
    struct PlayerDied has drop, store {
        player: address,
        dungeon_id: u64,
        floor_reached: u64,
        items_burned: u64
    }

    #[event]
    struct LootAdded has drop, store {
        player: address,
        item_type: u8,
        floor: u64
    }

    #[event]
    struct BossSpawned has drop, store {
        player: address,
        dungeon_id: u64,
        boss_name: string::String
    }

    #[event]
    struct BossDefeated has drop, store {
        player: address,
        dungeon_id: u64,
        xp_earned: u64
    }

    // =============================================
    // ENTER DUNGEON
    // =============================================

    public entry fun enter_dungeon(
        account: &signer,
        dungeon_id: u64
    ) acquires DungeonRun {
        let player = signer::address_of(account);

        assert!(hero::character_exists(player), E_NO_CHARACTER);
        assert!(hero::is_character_alive(player), E_CHARACTER_DEAD);

        // Check not already in dungeon
        if (exists<DungeonRun>(player)) {
            let run = borrow_global<DungeonRun>(player);
            assert!(!run.is_active, E_ALREADY_IN_DUNGEON);
        };

        let now = timestamp::now_seconds();

        // Create or update dungeon run
        if (exists<DungeonRun>(player)) {
            let run = borrow_global_mut<DungeonRun>(player);
            run.dungeon_id = dungeon_id;
            run.player = player;
            run.current_floor = 1;
            run.rooms_cleared = 0;
            run.enemies_killed = 0;
            run.started_at = now;
            run.is_active = true;
            // Clear any leftover pending loot (shouldn't exist but handle edge case)
            while (!vector::is_empty(&run.pending_loot.weapons)) {
                let weapon = vector::pop_back(&mut run.pending_loot.weapons);
                items::destroy_weapon(weapon);
            };
            while (!vector::is_empty(&run.pending_loot.armors)) {
                let armor = vector::pop_back(&mut run.pending_loot.armors);
                items::destroy_armor(armor);
            };
            while (!vector::is_empty(&run.pending_loot.accessories)) {
                let acc = vector::pop_back(&mut run.pending_loot.accessories);
                items::destroy_accessory(acc);
            };
            run.pending_loot.gold = 0;
        } else {
            move_to(account, DungeonRun {
                dungeon_id,
                player,
                current_floor: 1,
                rooms_cleared: 0,
                enemies_killed: 0,
                started_at: now,
                is_active: true,
                pending_loot: PendingLoot {
                    weapons: vector::empty(),
                    armors: vector::empty(),
                    accessories: vector::empty(),
                    gold: 0
                }
            });
        };

        event::emit(DungeonEntered {
            player,
            dungeon_id,
            timestamp: now
        });
    }

    // =============================================
    // COMPLETE FLOOR - Server authorized
    // =============================================

    public entry fun complete_floor(
        server: &signer,
        player: address,
        enemies_killed: u64,
        xp_earned: u64
    ) acquires ServerConfig, DungeonRun {
        let server_addr = signer::address_of(server);
        assert!(is_authorized_server(server_addr), E_UNAUTHORIZED);

        assert!(exists<DungeonRun>(player), E_NOT_IN_DUNGEON);
        let run = borrow_global_mut<DungeonRun>(player);
        assert!(run.is_active, E_RUN_NOT_ACTIVE);

        // Update run stats
        run.enemies_killed = run.enemies_killed + enemies_killed;
        run.rooms_cleared = run.rooms_cleared + 1;

        let dungeon_id = run.dungeon_id;
        let floor = run.current_floor;

        // Advance floor
        run.current_floor = run.current_floor + 1;

        // Award XP to character via hero module
        hero::add_experience_to_player(player, xp_earned);

        event::emit(FloorCompleted {
            player,
            dungeon_id,
            floor,
            enemies_killed,
            xp_earned
        });
    }

    // =============================================
    // COMPLETE BOSS FLOOR - Final floor with boss
    // =============================================

    public entry fun complete_boss_floor(
        server: &signer,
        player: address,
        xp_earned: u64
    ) acquires ServerConfig, DungeonRun {
        let server_addr = signer::address_of(server);
        assert!(is_authorized_server(server_addr), E_UNAUTHORIZED);

        assert!(exists<DungeonRun>(player), E_NOT_IN_DUNGEON);
        let run = borrow_global_mut<DungeonRun>(player);
        assert!(run.is_active, E_RUN_NOT_ACTIVE);
        assert!(run.current_floor == MAX_FLOORS, E_INVALID_FLOOR);

        let dungeon_id = run.dungeon_id;

        // Boss gives extra kills credit
        run.enemies_killed = run.enemies_killed + 1;
        run.rooms_cleared = run.rooms_cleared + 1;

        // Award boss XP
        hero::add_experience_to_player(player, xp_earned);

        event::emit(BossDefeated {
            player,
            dungeon_id,
            xp_earned
        });

        // Floor completion event
        event::emit(FloorCompleted {
            player,
            dungeon_id,
            floor: MAX_FLOORS,
            enemies_killed: 1,
            xp_earned
        });
    }

    // =============================================
    // START BOSS ENCOUNTER - Emit boss spawn event
    // =============================================

    public entry fun start_boss_encounter(
        server: &signer,
        player: address
    ) acquires ServerConfig, DungeonRun {
        let server_addr = signer::address_of(server);
        assert!(is_authorized_server(server_addr), E_UNAUTHORIZED);

        assert!(exists<DungeonRun>(player), E_NOT_IN_DUNGEON);
        let run = borrow_global<DungeonRun>(player);
        assert!(run.is_active, E_RUN_NOT_ACTIVE);
        assert!(run.current_floor == MAX_FLOORS, E_INVALID_FLOOR);

        event::emit(BossSpawned {
            player,
            dungeon_id: run.dungeon_id,
            boss_name: string::utf8(b"Dungeon Lord")
        });
    }

    // =============================================
    // ADD LOOT - Server adds items to pending loot
    // =============================================

    public fun add_pending_weapon(
        server: &signer,
        player: address,
        weapon: Weapon
    ) acquires ServerConfig, DungeonRun {
        let server_addr = signer::address_of(server);
        assert!(is_authorized_server(server_addr), E_UNAUTHORIZED);
        assert!(exists<DungeonRun>(player), E_NOT_IN_DUNGEON);

        let run = borrow_global_mut<DungeonRun>(player);
        assert!(run.is_active, E_RUN_NOT_ACTIVE);

        let floor = run.current_floor;
        vector::push_back(&mut run.pending_loot.weapons, weapon);

        event::emit(LootAdded { player, item_type: 0, floor });
    }

    public fun add_pending_armor(
        server: &signer,
        player: address,
        armor: Armor
    ) acquires ServerConfig, DungeonRun {
        let server_addr = signer::address_of(server);
        assert!(is_authorized_server(server_addr), E_UNAUTHORIZED);
        assert!(exists<DungeonRun>(player), E_NOT_IN_DUNGEON);

        let run = borrow_global_mut<DungeonRun>(player);
        assert!(run.is_active, E_RUN_NOT_ACTIVE);

        let floor = run.current_floor;
        vector::push_back(&mut run.pending_loot.armors, armor);

        event::emit(LootAdded { player, item_type: 1, floor });
    }

    public fun add_pending_accessory(
        server: &signer,
        player: address,
        accessory: Accessory
    ) acquires ServerConfig, DungeonRun {
        let server_addr = signer::address_of(server);
        assert!(is_authorized_server(server_addr), E_UNAUTHORIZED);
        assert!(exists<DungeonRun>(player), E_NOT_IN_DUNGEON);

        let run = borrow_global_mut<DungeonRun>(player);
        assert!(run.is_active, E_RUN_NOT_ACTIVE);

        let floor = run.current_floor;
        vector::push_back(&mut run.pending_loot.accessories, accessory);

        event::emit(LootAdded { player, item_type: 2, floor });
    }

    // =============================================
    // EXIT DUNGEON SUCCESS - Transfer pending loot
    // =============================================

    public entry fun exit_dungeon_success(
        server: &signer,
        player: address
    ) acquires ServerConfig, DungeonRun {
        let server_addr = signer::address_of(server);
        assert!(is_authorized_server(server_addr), E_UNAUTHORIZED);
        assert!(exists<DungeonRun>(player), E_NOT_IN_DUNGEON);

        let run = borrow_global_mut<DungeonRun>(player);
        assert!(run.is_active, E_RUN_NOT_ACTIVE);

        let dungeon_id = run.dungeon_id;
        let total_floors = run.current_floor;
        let total_kills = run.enemies_killed;

        // Count items for event
        let weapons_claimed = vector::length(&run.pending_loot.weapons);
        let armors_claimed = vector::length(&run.pending_loot.armors);

        run.is_active = false;

        // Transfer pending loot to player's stash
        // Check if player has stash initialized
        if (stash::stash_exists(player)) {
            // Transfer weapons to stash
            while (!vector::is_empty(&run.pending_loot.weapons)) {
                let weapon = vector::pop_back(&mut run.pending_loot.weapons);
                // Check capacity before each deposit
                if (stash::has_capacity_for(player, 1)) {
                    stash::deposit_weapon_from_dungeon(player, weapon);
                } else {
                    // Stash full - item is lost (emit event for frontend)
                    items::destroy_weapon(weapon);
                }
            };

            // Transfer armors to stash
            while (!vector::is_empty(&run.pending_loot.armors)) {
                let armor = vector::pop_back(&mut run.pending_loot.armors);
                if (stash::has_capacity_for(player, 1)) {
                    stash::deposit_armor_from_dungeon(player, armor);
                } else {
                    items::destroy_armor(armor);
                }
            };

            // Transfer accessories to stash
            while (!vector::is_empty(&run.pending_loot.accessories)) {
                let acc = vector::pop_back(&mut run.pending_loot.accessories);
                if (stash::has_capacity_for(player, 1)) {
                    stash::deposit_accessory_from_dungeon(player, acc);
                } else {
                    items::destroy_accessory(acc);
                }
            };

            // Transfer gold
            let gold = run.pending_loot.gold;
            if (gold > 0) {
                stash::deposit_gold_from_dungeon(player, gold);
            };
        } else {
            // No stash initialized - destroy all items (shouldn't happen but handle edge case)
            while (!vector::is_empty(&run.pending_loot.weapons)) {
                let weapon = vector::pop_back(&mut run.pending_loot.weapons);
                items::destroy_weapon(weapon);
            };
            while (!vector::is_empty(&run.pending_loot.armors)) {
                let armor = vector::pop_back(&mut run.pending_loot.armors);
                items::destroy_armor(armor);
            };
            while (!vector::is_empty(&run.pending_loot.accessories)) {
                let acc = vector::pop_back(&mut run.pending_loot.accessories);
                items::destroy_accessory(acc);
            };
        };
        run.pending_loot.gold = 0;

        event::emit(DungeonCompleted {
            player,
            dungeon_id,
            total_floors,
            total_kills,
            weapons_claimed,
            armors_claimed
        });
    }

    // =============================================
    // PLAYER DIED - Burn all pending loot and equipped
    // =============================================

    public entry fun player_died(
        server: &signer,
        player: address
    ) acquires ServerConfig, DungeonRun {
        let server_addr = signer::address_of(server);
        assert!(is_authorized_server(server_addr), E_UNAUTHORIZED);
        assert!(exists<DungeonRun>(player), E_NOT_IN_DUNGEON);

        let run = borrow_global_mut<DungeonRun>(player);
        assert!(run.is_active, E_RUN_NOT_ACTIVE);

        let dungeon_id = run.dungeon_id;
        let floor_reached = run.current_floor;

        // Count items to burn for event
        let items_burned = vector::length(&run.pending_loot.weapons) +
            vector::length(&run.pending_loot.armors) +
            vector::length(&run.pending_loot.accessories);

        // BURN all pending weapons
        while (!vector::is_empty(&run.pending_loot.weapons)) {
            let weapon = vector::pop_back(&mut run.pending_loot.weapons);
            items::destroy_weapon(weapon);
        };

        // BURN all pending armor
        while (!vector::is_empty(&run.pending_loot.armors)) {
            let armor = vector::pop_back(&mut run.pending_loot.armors);
            items::destroy_armor(armor);
        };

        // BURN all pending accessories
        while (!vector::is_empty(&run.pending_loot.accessories)) {
            let acc = vector::pop_back(&mut run.pending_loot.accessories);
            items::destroy_accessory(acc);
        };

        run.pending_loot.gold = 0;
        run.is_active = false;

        // Call character_death to burn equipped items via hero module
        hero::kill_player_character(player);

        event::emit(PlayerDied {
            player,
            dungeon_id,
            floor_reached,
            items_burned
        });
    }

    // =============================================
    // VIEW FUNCTIONS
    // =============================================

    public fun max_floors(): u64 { MAX_FLOORS }

    #[view]
    public fun is_in_dungeon(player: address): bool acquires DungeonRun {
        if (!exists<DungeonRun>(player)) {
            return false
        };
        let run = borrow_global<DungeonRun>(player);
        run.is_active
    }

    #[view]
    public fun get_current_floor(player: address): u64 acquires DungeonRun {
        let run = borrow_global<DungeonRun>(player);
        run.current_floor
    }

    #[view]
    public fun get_run_stats(player: address): (u64, u64, u64, u64) acquires DungeonRun {
        let run = borrow_global<DungeonRun>(player);
        (run.dungeon_id, run.current_floor, run.enemies_killed, run.rooms_cleared)
    }

    #[view]
    public fun get_pending_loot_counts(player: address): (u64, u64, u64, u64) acquires DungeonRun {
        let run = borrow_global<DungeonRun>(player);
        (
            vector::length(&run.pending_loot.weapons),
            vector::length(&run.pending_loot.armors),
            vector::length(&run.pending_loot.accessories),
            run.pending_loot.gold
        )
    }

    // =============================================
    // BOSS FLOOR DETECTION
    // =============================================

    public fun is_boss_floor(floor: u64): bool {
        floor == MAX_FLOORS // Floor 5 is boss floor
    }

    #[view]
    public fun is_on_boss_floor(player: address): bool acquires DungeonRun {
        if (!exists<DungeonRun>(player)) { return false };
        let run = borrow_global<DungeonRun>(player);
        run.is_active && run.current_floor == MAX_FLOORS
    }
}
