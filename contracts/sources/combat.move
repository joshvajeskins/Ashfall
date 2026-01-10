module ashfall::combat {
    use std::signer;
    use std::vector;
    use aptos_framework::event;
    use aptos_framework::timestamp;
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
    // COMBAT STATE - Stored per player
    // =============================================

    struct CombatState has key {
        player: address,
        enemy: Enemy,
        current_turn: u8,
        turn_count: u64,
        is_active: bool,
        started_at: u64,
        floor: u64,
        last_damage_dealt: u64,
        last_damage_taken: u64,
        last_was_crit: bool
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

    // =============================================
    // START COMBAT - Server only
    // =============================================

    /// Start combat with a specific enemy type. Server-only.
    /// enemy_type: 0=skeleton, 1=zombie, 2=ghoul, 3=vampire, 4=lich, 5=boss
    public entry fun start_combat(
        server: &signer,
        player: address,
        enemy_type: u8,
        floor: u64
    ) acquires ServerConfig, CombatState {
        let server_addr = signer::address_of(server);
        assert!(is_authorized_server(server_addr), E_UNAUTHORIZED);
        assert!(hero::character_exists(player), E_NO_CHARACTER);
        assert!(hero::is_character_alive(player), E_CHARACTER_DEAD);

        // Spawn enemy based on type
        let enemy = spawn_enemy_by_type(enemy_type);

        let now = timestamp::now_seconds();

        if (exists<CombatState>(player)) {
            let combat = borrow_global_mut<CombatState>(player);
            assert!(!combat.is_active, E_ALREADY_IN_COMBAT);

            // Reuse existing storage
            combat.player = player;
            combat.enemy = enemy;
            combat.current_turn = TURN_PLAYER;
            combat.turn_count = 0;
            combat.is_active = true;
            combat.started_at = now;
            combat.floor = floor;
            combat.last_damage_dealt = 0;
            combat.last_damage_taken = 0;
            combat.last_was_crit = false;
        } else {
            move_to(server, CombatState {
                player,
                enemy,
                current_turn: TURN_PLAYER,
                turn_count: 0,
                is_active: true,
                started_at: now,
                floor,
                last_damage_dealt: 0,
                last_damage_taken: 0,
                last_was_crit: false
            });
        };

        let enemy_for_event = spawn_enemy_by_type(enemy_type);
        event::emit(CombatStarted {
            player,
            enemy_name: *std::string::bytes(enemies::get_name(&enemy_for_event)),
            enemy_health: enemies::get_health(&enemy_for_event),
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
    ) acquires CombatState {
        let player = signer::address_of(player_signer);
        assert!(exists<CombatState>(player), E_NOT_IN_COMBAT);

        let combat = borrow_global_mut<CombatState>(player);
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

        event::emit(PlayerAttacked {
            player,
            damage: final_damage,
            was_crit,
            enemy_health_remaining,
            enemy_killed
        });

        if (enemy_killed) {
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
    public entry fun enemy_attack(
        server: &signer,
        player: address
    ) acquires ServerConfig, CombatState {
        let server_addr = signer::address_of(server);
        assert!(is_authorized_server(server_addr), E_UNAUTHORIZED);
        assert!(exists<CombatState>(player), E_NOT_IN_COMBAT);

        let combat = borrow_global_mut<CombatState>(player);
        assert!(combat.is_active, E_COMBAT_ENDED);
        assert!(combat.current_turn == TURN_ENEMY, E_NOT_ENEMY_TURN);

        let enemy_attack_power = enemies::get_attack(&combat.enemy);

        // Apply damage to player via hero module (handles armor reduction)
        let (new_health, player_killed) = hero::take_combat_damage_to_player(player, enemy_attack_power);

        combat.last_damage_taken = enemy_attack_power;

        if (player_killed) {
            combat.is_active = false;

            event::emit(EnemyAttacked {
                player,
                damage: enemy_attack_power,
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
                damage: enemy_attack_power,
                player_health_remaining: new_health,
                player_killed: false
            });
        }
    }

    // =============================================
    // FLEE COMBAT - Player can try to escape
    // =============================================

    /// Player attempts to flee. 50% base chance + agility bonus.
    public entry fun flee_combat(
        player_signer: &signer,
        seed: u64
    ) acquires CombatState {
        let player = signer::address_of(player_signer);
        assert!(exists<CombatState>(player), E_NOT_IN_COMBAT);

        let combat = borrow_global_mut<CombatState>(player);
        assert!(combat.is_active, E_COMBAT_ENDED);
        assert!(combat.current_turn == TURN_PLAYER, E_NOT_PLAYER_TURN);

        let (_, agility, _) = hero::get_base_stats(player);

        // 50% base + agility bonus
        let flee_threshold = 500 + (agility * 10);
        let flee_roll = seed % 1000;
        let success = flee_roll < flee_threshold;

        event::emit(PlayerFled { player, success });

        if (success) {
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
    // VIEW FUNCTIONS
    // =============================================

    #[view]
    public fun is_in_combat(player: address): bool acquires CombatState {
        if (!exists<CombatState>(player)) { return false };
        let combat = borrow_global<CombatState>(player);
        combat.is_active
    }

    #[view]
    public fun get_combat_state(player: address): (u64, u64, u8, bool) acquires CombatState {
        let combat = borrow_global<CombatState>(player);
        (
            enemies::get_health(&combat.enemy),
            enemies::get_max_health(&combat.enemy),
            combat.current_turn,
            combat.is_active
        )
    }

    #[view]
    public fun get_last_combat_result(player: address): (u64, u64, bool) acquires CombatState {
        let combat = borrow_global<CombatState>(player);
        (combat.last_damage_dealt, combat.last_damage_taken, combat.last_was_crit)
    }

    #[view]
    public fun whose_turn(player: address): u8 acquires CombatState {
        let combat = borrow_global<CombatState>(player);
        combat.current_turn
    }
}
