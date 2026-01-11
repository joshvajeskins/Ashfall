module ashfall::combat {
    use std::signer;
    use std::vector;
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use aptos_std::smart_table::{Self, SmartTable};
    use ashfall::enemies::{Self, Enemy};
    use ashfall::hero;

    // =============================================
    // ashfall::combat
    //
    // On-chain combat system with per-move transactions.
    // - Player attacks: user wallet + gas sponsorship
    // - Enemy attacks: server invisible wallet only
    // =============================================

    const E_NOT_IN_COMBAT: u64 = 1;
    const E_ALREADY_IN_COMBAT: u64 = 2;
    const E_NOT_PLAYER_TURN: u64 = 3;
    const E_NOT_ENEMY_TURN: u64 = 4;
    const E_UNAUTHORIZED: u64 = 5;
    const E_NO_CHARACTER: u64 = 6;
    const E_CHARACTER_DEAD: u64 = 7;
    const E_COMBAT_ENDED: u64 = 8;
    const E_INVALID_ENEMY_TYPE: u64 = 9;

    // Turn enum
    const TURN_PLAYER: u8 = 0;
    const TURN_ENEMY: u8 = 1;

    // Enemy intent enum
    const INTENT_ATTACK: u8 = 0;
    const INTENT_HEAVY_ATTACK: u8 = 1;
    const INTENT_DEFEND: u8 = 2;

    // Mana costs
    const HEAVY_ATTACK_MANA: u64 = 20;
    const HEAL_MANA: u64 = 30;

    // Mana restore on defend
    const DEFEND_MANA_RESTORE: u64 = 10;

    // Error codes for new actions
    const E_NOT_ENOUGH_MANA: u64 = 10;

    // =============================================
    // SERVER AUTHORIZATION
    // =============================================

    struct ServerConfig has key {
        authorized_servers: vector<address>
    }

    /// Registry to store all combat states, indexed by player address
    struct CombatRegistry has key {
        combats: SmartTable<address, CombatState>
    }

    /// Key for fled enemies: player address + floor + room_id
    struct FledEnemyKey has copy, drop, store {
        player: address,
        floor: u64,
        room_id: u64
    }

    /// Fled enemies registry - stores enemy health when player flees
    struct FledEnemiesRegistry has key {
        enemies: SmartTable<FledEnemyKey, FledEnemyState>
    }

    /// State of an enemy the player fled from
    struct FledEnemyState has copy, drop, store {
        enemy_type: u8,
        current_health: u64,
        max_health: u64
    }

    fun init_module(account: &signer) {
        let deployer = signer::address_of(account);
        move_to(account, ServerConfig {
            authorized_servers: vector[deployer]
        });
        move_to(account, CombatRegistry {
            combats: smart_table::new()
        });
        move_to(account, FledEnemiesRegistry {
            enemies: smart_table::new()
        });
    }

    public entry fun add_server(admin: &signer, server: address) acquires ServerConfig {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @ashfall, E_UNAUTHORIZED);
        let config = borrow_global_mut<ServerConfig>(@ashfall);
        vector::push_back(&mut config.authorized_servers, server);
    }

    /// Initialize the combat registry. Call once after upgrade.
    public entry fun init_registry(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @ashfall, E_UNAUTHORIZED);
        assert!(!exists<CombatRegistry>(@ashfall), E_ALREADY_IN_COMBAT);
        move_to(admin, CombatRegistry {
            combats: smart_table::new()
        });
    }

    /// Initialize the fled enemies registry. Call once after upgrade.
    public entry fun init_fled_registry(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @ashfall, E_UNAUTHORIZED);
        assert!(!exists<FledEnemiesRegistry>(@ashfall), E_ALREADY_IN_COMBAT);
        move_to(admin, FledEnemiesRegistry {
            enemies: smart_table::new()
        });
    }

    fun is_authorized_server(addr: address): bool acquires ServerConfig {
        let config = borrow_global<ServerConfig>(@ashfall);
        vector::contains(&config.authorized_servers, &addr)
    }

    // =============================================
    // COMBAT STATE - Stored in registry at @ashfall
    // =============================================

    struct CombatState has key, store, drop {
        player: address,
        enemy: Enemy,
        current_turn: u8,
        turn_count: u64,
        is_active: bool,
        started_at: u64,
        floor: u64,
        room_id: u64,
        last_damage_dealt: u64,
        last_damage_taken: u64,
        last_was_crit: bool,
        // New combat mechanics
        player_is_defending: bool,
        enemy_is_defending: bool,
        enemy_next_intent: u8  // 0=attack, 1=heavy_attack, 2=defend
    }

    // =============================================
    // EVENTS
    // =============================================

    #[event]
    struct CombatStarted has drop, store {
        player: address,
        enemy_name: vector<u8>,
        enemy_health: u64,
        floor: u64
    }

    #[event]
    struct PlayerAttacked has drop, store {
        player: address,
        damage: u64,
        was_crit: bool,
        enemy_health_remaining: u64,
        enemy_killed: bool
    }

    #[event]
    struct EnemyAttacked has drop, store {
        player: address,
        damage: u64,
        player_health_remaining: u64,
        player_killed: bool
    }

    #[event]
    struct CombatEnded has drop, store {
        player: address,
        winner: u8, // 0 = player, 1 = enemy, 2 = fled
        turns_taken: u64,
        xp_earned: u64
    }

    #[event]
    struct PlayerFled has drop, store {
        player: address,
        success: bool
    }

    #[event]
    struct PlayerDefended has drop, store {
        player: address,
        mana_restored: u64,
        new_mana: u64
    }

    #[event]
    struct PlayerHeavyAttacked has drop, store {
        player: address,
        damage: u64,
        was_crit: bool,
        enemy_health_remaining: u64,
        enemy_killed: bool,
        mana_used: u64
    }

    #[event]
    struct PlayerHealed has drop, store {
        player: address,
        amount_healed: u64,
        new_health: u64,
        mana_used: u64
    }

    #[event]
    struct EnemyIntentRevealed has drop, store {
        player: address,
        intent: u8  // 0=attack, 1=heavy_attack, 2=defend
    }

    // =============================================
    // START COMBAT - Server only
    // =============================================

    /// Start combat with a specific enemy type. Server-only.
    /// enemy_type: 0=skeleton, 1=zombie, 2=ghoul, 3=vampire, 4=lich, 5=boss
    /// room_id: Used to track fled enemies - same room means same enemy with preserved health
    public entry fun start_combat(
        server: &signer,
        player: address,
        enemy_type: u8,
        floor: u64,
        room_id: u64
    ) acquires ServerConfig, CombatRegistry, FledEnemiesRegistry {
        let server_addr = signer::address_of(server);
        assert!(is_authorized_server(server_addr), E_UNAUTHORIZED);
        assert!(hero::character_exists(player), E_NO_CHARACTER);
        assert!(hero::is_character_alive(player), E_CHARACTER_DEAD);

        // Check for fled enemy with preserved health
        let fled_registry = borrow_global_mut<FledEnemiesRegistry>(@ashfall);
        let fled_key = FledEnemyKey { player, floor, room_id };
        let (enemy, enemy_health_for_event) = if (smart_table::contains(&fled_registry.enemies, fled_key)) {
            // Resume combat with fled enemy's remaining health
            let fled_state = smart_table::remove(&mut fled_registry.enemies, fled_key);
            let fresh_enemy = spawn_enemy_by_type(fled_state.enemy_type);
            let damaged_enemy = enemies::set_health(fresh_enemy, fled_state.current_health);
            (damaged_enemy, fled_state.current_health)
        } else {
            // Spawn fresh enemy
            let fresh_enemy = spawn_enemy_by_type(enemy_type);
            let health = enemies::get_health(&fresh_enemy);
            (fresh_enemy, health)
        };

        let now = timestamp::now_seconds();

        // Generate initial enemy intent (seed from timestamp)
        let initial_intent = generate_enemy_intent(now);

        let registry = borrow_global_mut<CombatRegistry>(@ashfall);

        if (smart_table::contains(&registry.combats, player)) {
            let combat = smart_table::borrow_mut(&mut registry.combats, player);
            assert!(!combat.is_active, E_ALREADY_IN_COMBAT);

            // Reuse existing storage
            combat.player = player;
            combat.enemy = enemy;
            combat.current_turn = TURN_PLAYER;
            combat.turn_count = 0;
            combat.is_active = true;
            combat.started_at = now;
            combat.floor = floor;
            combat.room_id = room_id;
            combat.last_damage_dealt = 0;
            combat.last_damage_taken = 0;
            combat.last_was_crit = false;
            combat.player_is_defending = false;
            combat.enemy_is_defending = false;
            combat.enemy_next_intent = initial_intent;
        } else {
            smart_table::add(&mut registry.combats, player, CombatState {
                player,
                enemy,
                current_turn: TURN_PLAYER,
                turn_count: 0,
                is_active: true,
                started_at: now,
                floor,
                room_id,
                last_damage_dealt: 0,
                last_damage_taken: 0,
                last_was_crit: false,
                player_is_defending: false,
                enemy_is_defending: false,
                enemy_next_intent: initial_intent
            });
        };

        // Emit enemy intent so frontend can display it
        event::emit(EnemyIntentRevealed { player, intent: initial_intent });

        let enemy_for_event = spawn_enemy_by_type(enemy_type);
        event::emit(CombatStarted {
            player,
            enemy_name: *std::string::bytes(enemies::get_name(&enemy_for_event)),
            enemy_health: enemy_health_for_event,
            floor
        });
    }

    fun spawn_enemy_by_type(enemy_type: u8): Enemy {
        if (enemy_type == 0) { enemies::spawn_skeleton() }
        else if (enemy_type == 1) { enemies::spawn_zombie() }
        else if (enemy_type == 2) { enemies::spawn_ghoul() }
        else if (enemy_type == 3) { enemies::spawn_vampire() }
        else if (enemy_type == 4) { enemies::spawn_lich() }
        else if (enemy_type == 5) { enemies::spawn_boss() }
        else { abort E_INVALID_ENEMY_TYPE }
    }

    // =============================================
    // PLAYER ATTACK - Player wallet + gas sponsor
    // =============================================

    /// Player attacks the enemy. Called by player's wallet (gas sponsored).
    public entry fun player_attack(
        player_signer: &signer,
        seed: u64
    ) acquires CombatRegistry, FledEnemiesRegistry {
        let player = signer::address_of(player_signer);
        let registry = borrow_global_mut<CombatRegistry>(@ashfall);
        assert!(smart_table::contains(&registry.combats, player), E_NOT_IN_COMBAT);

        let combat = smart_table::borrow_mut(&mut registry.combats, player);
        assert!(combat.is_active, E_COMBAT_ENDED);
        assert!(combat.current_turn == TURN_PLAYER, E_NOT_PLAYER_TURN);

        // Calculate damage (simplified - no mutable character access here)
        let (strength, agility, _) = hero::get_base_stats(player);
        let weapon_damage = if (hero::has_weapon_equipped(player)) { 15 } else { 5 };

        let base_damage = 5u64;
        let strength_bonus = strength / 2;
        let total_damage = base_damage + weapon_damage + strength_bonus;

        // Crit check: 5% + (agility * 0.2%)
        let crit_threshold = 50 + (agility * 2);
        let crit_roll = seed % 1000;
        let was_crit = crit_roll < crit_threshold;
        let final_damage = if (was_crit) { total_damage * 2 } else { total_damage };

        // Apply damage to enemy
        let enemy_killed = enemies::take_damage(&mut combat.enemy, final_damage);
        let enemy_health_remaining = enemies::get_health(&combat.enemy);

        combat.last_damage_dealt = final_damage;
        combat.last_was_crit = was_crit;
        combat.turn_count = combat.turn_count + 1;

        // Capture floor and room_id before we emit events
        let floor = combat.floor;
        let room_id = combat.room_id;

        event::emit(PlayerAttacked {
            player,
            damage: final_damage,
            was_crit,
            enemy_health_remaining,
            enemy_killed
        });

        if (enemy_killed) {
            // Clear any fled enemy entry for this room
            let fled_registry = borrow_global_mut<FledEnemiesRegistry>(@ashfall);
            let fled_key = FledEnemyKey { player, floor, room_id };
            if (smart_table::contains(&fled_registry.enemies, fled_key)) {
                smart_table::remove(&mut fled_registry.enemies, fled_key);
            };

            // Combat ends - player wins
            let xp = enemies::get_exp_reward(&combat.enemy);
            hero::add_experience_to_player(player, xp);
            combat.is_active = false;

            event::emit(CombatEnded {
                player,
                winner: 0,
                turns_taken: combat.turn_count,
                xp_earned: xp
            });
        } else {
            // Switch to enemy turn
            combat.current_turn = TURN_ENEMY;
        }
    }

    // =============================================
    // ENEMY ATTACK - Server invisible wallet only
    // =============================================

    /// Enemy attacks the player. Server-only (invisible wallet).
    /// Now executes based on enemy_next_intent.
    public entry fun enemy_attack(
        server: &signer,
        player: address,
        seed: u64
    ) acquires ServerConfig, CombatRegistry {
        let server_addr = signer::address_of(server);
        assert!(is_authorized_server(server_addr), E_UNAUTHORIZED);
        let registry = borrow_global_mut<CombatRegistry>(@ashfall);
        assert!(smart_table::contains(&registry.combats, player), E_NOT_IN_COMBAT);

        let combat = smart_table::borrow_mut(&mut registry.combats, player);
        assert!(combat.is_active, E_COMBAT_ENDED);
        assert!(combat.current_turn == TURN_ENEMY, E_NOT_ENEMY_TURN);

        let intent = combat.enemy_next_intent;
        let enemy_attack_power = enemies::get_attack(&combat.enemy);

        // Execute based on intent
        let actual_damage = if (intent == INTENT_DEFEND) {
            // Enemy defends - no attack, sets defending flag
            combat.enemy_is_defending = true;
            0
        } else if (intent == INTENT_HEAVY_ATTACK) {
            // Heavy attack: 1.5x damage
            (enemy_attack_power * 3) / 2
        } else {
            // Normal attack
            enemy_attack_power
        };

        // Apply player defend reduction (50% if defending)
        let final_damage = if (combat.player_is_defending && actual_damage > 0) {
            actual_damage / 2
        } else {
            actual_damage
        };

        // Reset player defending status
        combat.player_is_defending = false;

        // Apply damage if not defending
        let (new_health, player_killed) = if (final_damage > 0) {
            hero::take_combat_damage_to_player(player, final_damage)
        } else {
            // Enemy defended, get current health
            let (_, _, health, _, _, _, _, _) = hero::get_character_stats(player);
            (health, false)
        };

        combat.last_damage_taken = final_damage;

        // Generate new intent for next enemy turn
        combat.enemy_next_intent = generate_enemy_intent(seed);

        if (player_killed) {
            combat.is_active = false;

            event::emit(EnemyAttacked {
                player,
                damage: final_damage,
                player_health_remaining: 0,
                player_killed: true
            });

            event::emit(CombatEnded {
                player,
                winner: 1,
                turns_taken: combat.turn_count,
                xp_earned: 0
            });
        } else {
            combat.current_turn = TURN_PLAYER;

            event::emit(EnemyAttacked {
                player,
                damage: final_damage,
                player_health_remaining: new_health,
                player_killed: false
            });

            // Emit new intent for frontend
            event::emit(EnemyIntentRevealed {
                player,
                intent: combat.enemy_next_intent
            });
        }
    }

    // =============================================
    // FLEE COMBAT - Player can try to escape
    // =============================================

    /// Player attempts to flee. 50% base chance + agility bonus.
    /// On success, stores enemy health for persistence when player returns.
    public entry fun flee_combat(
        player_signer: &signer,
        seed: u64
    ) acquires CombatRegistry, FledEnemiesRegistry {
        let player = signer::address_of(player_signer);
        let registry = borrow_global_mut<CombatRegistry>(@ashfall);
        assert!(smart_table::contains(&registry.combats, player), E_NOT_IN_COMBAT);

        let combat = smart_table::borrow_mut(&mut registry.combats, player);
        assert!(combat.is_active, E_COMBAT_ENDED);
        assert!(combat.current_turn == TURN_PLAYER, E_NOT_PLAYER_TURN);

        let (_, agility, _) = hero::get_base_stats(player);

        // 50% base + agility bonus
        let flee_threshold = 500 + (agility * 10);
        let flee_roll = seed % 1000;
        let success = flee_roll < flee_threshold;

        event::emit(PlayerFled { player, success });

        if (success) {
            // Store fled enemy state for health persistence
            let fled_registry = borrow_global_mut<FledEnemiesRegistry>(@ashfall);
            let fled_key = FledEnemyKey {
                player,
                floor: combat.floor,
                room_id: combat.room_id
            };

            let enemy_health = enemies::get_health(&combat.enemy);
            let enemy_max_health = enemies::get_max_health(&combat.enemy);
            let enemy_type = enemies::get_type_id(&combat.enemy);

            // Only store if enemy still alive (has health)
            if (enemy_health > 0) {
                if (smart_table::contains(&fled_registry.enemies, fled_key)) {
                    // Update existing entry
                    let fled_state = smart_table::borrow_mut(&mut fled_registry.enemies, fled_key);
                    fled_state.current_health = enemy_health;
                } else {
                    // Add new entry
                    smart_table::add(&mut fled_registry.enemies, fled_key, FledEnemyState {
                        enemy_type,
                        current_health: enemy_health,
                        max_health: enemy_max_health
                    });
                };
            };

            combat.is_active = false;
            event::emit(CombatEnded {
                player,
                winner: 2, // fled
                turns_taken: combat.turn_count,
                xp_earned: 0
            });
        } else {
            // Failed to flee - enemy turn
            combat.current_turn = TURN_ENEMY;
        }
    }

    // =============================================
    // PLAYER DEFEND - Reduces next incoming damage by 50% + restores mana
    // =============================================

    /// Player defends, reducing next enemy attack damage by 50%.
    /// Also restores 10 mana as a reward for defensive play.
    public entry fun player_defend(
        player_signer: &signer
    ) acquires CombatRegistry {
        let player = signer::address_of(player_signer);
        let registry = borrow_global_mut<CombatRegistry>(@ashfall);
        assert!(smart_table::contains(&registry.combats, player), E_NOT_IN_COMBAT);

        let combat = smart_table::borrow_mut(&mut registry.combats, player);
        assert!(combat.is_active, E_COMBAT_ENDED);
        assert!(combat.current_turn == TURN_PLAYER, E_NOT_PLAYER_TURN);

        combat.player_is_defending = true;
        combat.turn_count = combat.turn_count + 1;
        combat.current_turn = TURN_ENEMY;

        // Restore mana on defend (reward for defensive play)
        let (mana_restored, new_mana) = hero::restore_mana_from_player(player, DEFEND_MANA_RESTORE);

        event::emit(PlayerDefended { player, mana_restored, new_mana });
    }

    // =============================================
    // PLAYER HEAVY ATTACK - 1.5x damage, costs 20 mana
    // =============================================

    /// Player performs a heavy attack for 1.5x damage, costs 20 mana.
    public entry fun player_heavy_attack(
        player_signer: &signer,
        seed: u64
    ) acquires CombatRegistry, FledEnemiesRegistry {
        let player = signer::address_of(player_signer);
        let registry = borrow_global_mut<CombatRegistry>(@ashfall);
        assert!(smart_table::contains(&registry.combats, player), E_NOT_IN_COMBAT);

        let combat = smart_table::borrow_mut(&mut registry.combats, player);
        assert!(combat.is_active, E_COMBAT_ENDED);
        assert!(combat.current_turn == TURN_PLAYER, E_NOT_PLAYER_TURN);

        // Check and consume mana
        let has_mana = hero::use_mana_from_player(player, HEAVY_ATTACK_MANA);
        assert!(has_mana, E_NOT_ENOUGH_MANA);

        // Calculate damage (1.5x multiplier)
        // Intelligence contributes to heavy attack damage (mana-based ability)
        let (strength, agility, intelligence) = hero::get_base_stats(player);
        let weapon_damage = if (hero::has_weapon_equipped(player)) { 15 } else { 5 };

        let base_damage = 5u64;
        let strength_bonus = strength / 2;
        let int_bonus = intelligence / 2; // INT contributes to heavy attack
        let total_damage = base_damage + weapon_damage + strength_bonus + int_bonus;

        // Apply 1.5x heavy attack multiplier
        let heavy_damage = (total_damage * 3) / 2;

        // Crit check: 5% + (agility * 0.2%)
        let crit_threshold = 50 + (agility * 2);
        let crit_roll = seed % 1000;
        let was_crit = crit_roll < crit_threshold;
        let final_damage = if (was_crit) { heavy_damage * 2 } else { heavy_damage };

        // Check if enemy is defending (halves damage)
        let actual_damage = if (combat.enemy_is_defending) {
            final_damage / 2
        } else {
            final_damage
        };

        // Apply damage to enemy
        let enemy_killed = enemies::take_damage(&mut combat.enemy, actual_damage);
        let enemy_health_remaining = enemies::get_health(&combat.enemy);

        combat.last_damage_dealt = actual_damage;
        combat.last_was_crit = was_crit;
        combat.turn_count = combat.turn_count + 1;
        combat.enemy_is_defending = false; // Reset enemy defend

        // Capture floor and room_id before we emit events
        let floor = combat.floor;
        let room_id = combat.room_id;

        event::emit(PlayerHeavyAttacked {
            player,
            damage: actual_damage,
            was_crit,
            enemy_health_remaining,
            enemy_killed,
            mana_used: HEAVY_ATTACK_MANA
        });

        if (enemy_killed) {
            // Clear any fled enemy entry for this room
            let fled_registry = borrow_global_mut<FledEnemiesRegistry>(@ashfall);
            let fled_key = FledEnemyKey { player, floor, room_id };
            if (smart_table::contains(&fled_registry.enemies, fled_key)) {
                smart_table::remove(&mut fled_registry.enemies, fled_key);
            };

            let xp = enemies::get_exp_reward(&combat.enemy);
            hero::add_experience_to_player(player, xp);
            combat.is_active = false;

            event::emit(CombatEnded {
                player,
                winner: 0,
                turns_taken: combat.turn_count,
                xp_earned: xp
            });
        } else {
            combat.current_turn = TURN_ENEMY;
        }
    }

    // =============================================
    // PLAYER HEAL - Costs 30 mana, heals 30% max HP
    // =============================================

    /// Player heals for 30% of max HP, costs 30 mana.
    public entry fun player_heal(
        player_signer: &signer
    ) acquires CombatRegistry {
        let player = signer::address_of(player_signer);
        let registry = borrow_global_mut<CombatRegistry>(@ashfall);
        assert!(smart_table::contains(&registry.combats, player), E_NOT_IN_COMBAT);

        let combat = smart_table::borrow_mut(&mut registry.combats, player);
        assert!(combat.is_active, E_COMBAT_ENDED);
        assert!(combat.current_turn == TURN_PLAYER, E_NOT_PLAYER_TURN);

        // Check and consume mana
        let has_mana = hero::use_mana_from_player(player, HEAL_MANA);
        assert!(has_mana, E_NOT_ENOUGH_MANA);

        // Heal 30% of max HP + INT bonus (each point of INT adds 1% heal)
        // Mage (15 INT): 30% + 15% = 45% heal
        // Warrior (5 INT): 30% + 5% = 35% heal
        let (_, _, intelligence) = hero::get_base_stats(player);
        let heal_percent = 30 + intelligence;
        let (amount_healed, new_health) = hero::heal_player_percent(player, heal_percent);

        combat.turn_count = combat.turn_count + 1;
        combat.current_turn = TURN_ENEMY;

        event::emit(PlayerHealed {
            player,
            amount_healed,
            new_health,
            mana_used: HEAL_MANA
        });
    }

    // =============================================
    // HELPER: Generate enemy intent
    // =============================================

    fun generate_enemy_intent(seed: u64): u8 {
        // 60% attack, 25% heavy attack, 15% defend
        let roll = seed % 100;
        if (roll < 60) {
            INTENT_ATTACK
        } else if (roll < 85) {
            INTENT_HEAVY_ATTACK
        } else {
            INTENT_DEFEND
        }
    }

    // =============================================
    // VIEW FUNCTIONS
    // =============================================

    #[view]
    public fun is_in_combat(player: address): bool acquires CombatRegistry {
        let registry = borrow_global<CombatRegistry>(@ashfall);
        if (!smart_table::contains(&registry.combats, player)) { return false };
        let combat = smart_table::borrow(&registry.combats, player);
        combat.is_active
    }

    #[view]
    public fun get_combat_state(player: address): (u64, u64, u8, bool) acquires CombatRegistry {
        let registry = borrow_global<CombatRegistry>(@ashfall);
        let combat = smart_table::borrow(&registry.combats, player);
        (
            enemies::get_health(&combat.enemy),
            enemies::get_max_health(&combat.enemy),
            combat.current_turn,
            combat.is_active
        )
    }

    #[view]
    public fun get_last_combat_result(player: address): (u64, u64, bool) acquires CombatRegistry {
        let registry = borrow_global<CombatRegistry>(@ashfall);
        let combat = smart_table::borrow(&registry.combats, player);
        (combat.last_damage_dealt, combat.last_damage_taken, combat.last_was_crit)
    }

    #[view]
    public fun whose_turn(player: address): u8 acquires CombatRegistry {
        let registry = borrow_global<CombatRegistry>(@ashfall);
        let combat = smart_table::borrow(&registry.combats, player);
        combat.current_turn
    }

    #[view]
    public fun get_enemy_intent(player: address): u8 acquires CombatRegistry {
        let registry = borrow_global<CombatRegistry>(@ashfall);
        let combat = smart_table::borrow(&registry.combats, player);
        combat.enemy_next_intent
    }

    #[view]
    public fun get_combat_details(player: address): (u64, u64, u8, bool, bool, bool, u8) acquires CombatRegistry {
        let registry = borrow_global<CombatRegistry>(@ashfall);
        let combat = smart_table::borrow(&registry.combats, player);
        (
            enemies::get_health(&combat.enemy),
            enemies::get_max_health(&combat.enemy),
            combat.current_turn,
            combat.is_active,
            combat.player_is_defending,
            combat.enemy_is_defending,
            combat.enemy_next_intent
        )
    }
}
