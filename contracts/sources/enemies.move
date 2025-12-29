module ashfall::enemies {
    use std::string::{Self, String};

    // =============================================
    // ashfall::enemies
    //
    // Enemy module with various enemy types by floor.
    // Enemies have copy/drop - spawned fresh each fight.
    // =============================================

    const E_ENEMY_DEAD: u64 = 1;

    struct Enemy has copy, drop, store {
        id: u64,
        name: String,
        health: u64,
        max_health: u64,
        attack: u64,
        defense: u64,
        exp_reward: u64,
        loot_tier: u64,
        floor_level: u64
    }

    // =============================================
    // SPAWN FUNCTIONS - Exact stats per enemy type
    // =============================================

    /// Skeleton: 30 HP, 5 atk, 50 EXP (floor 1)
    public fun spawn_skeleton(): Enemy {
        Enemy {
            id: 0,
            name: string::utf8(b"Skeleton"),
            health: 30,
            max_health: 30,
            attack: 5,
            defense: 2,
            exp_reward: 50,
            loot_tier: 1,
            floor_level: 1
        }
    }

    /// Zombie: 50 HP, 8 atk, 80 EXP (floor 1-2)
    public fun spawn_zombie(): Enemy {
        Enemy {
            id: 0,
            name: string::utf8(b"Zombie"),
            health: 50,
            max_health: 50,
            attack: 8,
            defense: 4,
            exp_reward: 80,
            loot_tier: 1,
            floor_level: 2
        }
    }

    /// Ghoul: 80 HP, 12 atk, 120 EXP (floor 2-3)
    public fun spawn_ghoul(): Enemy {
        Enemy {
            id: 0,
            name: string::utf8(b"Ghoul"),
            health: 80,
            max_health: 80,
            attack: 12,
            defense: 6,
            exp_reward: 120,
            loot_tier: 2,
            floor_level: 3
        }
    }

    /// Vampire: 120 HP, 18 atk, 200 EXP (floor 3-4)
    public fun spawn_vampire(): Enemy {
        Enemy {
            id: 0,
            name: string::utf8(b"Vampire"),
            health: 120,
            max_health: 120,
            attack: 18,
            defense: 10,
            exp_reward: 200,
            loot_tier: 3,
            floor_level: 4
        }
    }

    /// Lich: 200 HP, 25 atk, 400 EXP (floor 4-5)
    public fun spawn_lich(): Enemy {
        Enemy {
            id: 0,
            name: string::utf8(b"Lich"),
            health: 200,
            max_health: 200,
            attack: 25,
            defense: 15,
            exp_reward: 400,
            loot_tier: 4,
            floor_level: 5
        }
    }

    /// Boss: 500 HP, 40 atk, 1000 EXP (floor 5 boss)
    public fun spawn_boss(): Enemy {
        Enemy {
            id: 0,
            name: string::utf8(b"Dungeon Lord"),
            health: 500,
            max_health: 500,
            attack: 40,
            defense: 20,
            exp_reward: 1000,
            loot_tier: 5,
            floor_level: 5
        }
    }

    // =============================================
    // DAMAGE HANDLING
    // =============================================

    /// Apply damage to enemy. Returns true if killed.
    public fun take_damage(enemy: &mut Enemy, amount: u64): bool {
        let effective_damage = if (amount > enemy.defense) {
            amount - enemy.defense
        } else {
            1
        };

        if (enemy.health <= effective_damage) {
            enemy.health = 0;
            true
        } else {
            enemy.health = enemy.health - effective_damage;
            false
        }
    }

    // =============================================
    // GETTERS
    // =============================================

    public fun get_health(enemy: &Enemy): u64 { enemy.health }
    public fun get_max_health(enemy: &Enemy): u64 { enemy.max_health }
    public fun get_attack(enemy: &Enemy): u64 { enemy.attack }
    public fun get_defense(enemy: &Enemy): u64 { enemy.defense }
    public fun get_exp_reward(enemy: &Enemy): u64 { enemy.exp_reward }
    public fun get_loot_tier(enemy: &Enemy): u64 { enemy.loot_tier }
    public fun get_name(enemy: &Enemy): &String { &enemy.name }
    public fun is_dead(enemy: &Enemy): bool { enemy.health == 0 }
}
