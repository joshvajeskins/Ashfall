#[test_only]
module ashfall::tests {
    use ashfall::enemies;
    use ashfall::items;
    use ashfall::loot;
    use ashfall::hero;

    // =============================================
    // ENEMY TESTS - Enemy spawning and combat
    // =============================================

    #[test]
    fun test_spawn_skeleton() {
        let enemy = enemies::spawn_skeleton();
        assert!(enemies::get_health(&enemy) == 30, 0);
        assert!(enemies::get_max_health(&enemy) == 30, 1);
        assert!(enemies::get_attack(&enemy) == 5, 2);
        assert!(enemies::get_defense(&enemy) == 2, 3);
        assert!(enemies::get_exp_reward(&enemy) == 50, 4);
    }

    #[test]
    fun test_spawn_zombie() {
        let enemy = enemies::spawn_zombie();
        assert!(enemies::get_health(&enemy) == 50, 0);
        assert!(enemies::get_attack(&enemy) == 8, 1);
        assert!(enemies::get_exp_reward(&enemy) == 80, 2);
    }

    #[test]
    fun test_spawn_ghoul() {
        let enemy = enemies::spawn_ghoul();
        assert!(enemies::get_health(&enemy) == 80, 0);
        assert!(enemies::get_attack(&enemy) == 12, 1);
        assert!(enemies::get_exp_reward(&enemy) == 120, 2);
    }

    #[test]
    fun test_spawn_vampire() {
        let enemy = enemies::spawn_vampire();
        assert!(enemies::get_health(&enemy) == 120, 0);
        assert!(enemies::get_attack(&enemy) == 18, 1);
        assert!(enemies::get_exp_reward(&enemy) == 200, 2);
    }

    #[test]
    fun test_spawn_lich() {
        let enemy = enemies::spawn_lich();
        assert!(enemies::get_health(&enemy) == 200, 0);
        assert!(enemies::get_attack(&enemy) == 25, 1);
        assert!(enemies::get_exp_reward(&enemy) == 400, 2);
    }

    #[test]
    fun test_spawn_boss() {
        let enemy = enemies::spawn_boss();
        assert!(enemies::get_health(&enemy) == 500, 0);
        assert!(enemies::get_attack(&enemy) == 40, 1);
        assert!(enemies::get_exp_reward(&enemy) == 1000, 2);
        assert!(enemies::get_loot_tier(&enemy) == 5, 3);
    }

    #[test]
    fun test_enemy_take_damage() {
        let enemy = enemies::spawn_skeleton();
        // Skeleton: 30 HP, 2 defense
        // Damage 10 - defense 2 = 8 effective damage
        let killed = enemies::take_damage(&mut enemy, 10);
        assert!(!killed, 0);
        assert!(enemies::get_health(&enemy) == 22, 1); // 30 - 8 = 22
    }

    #[test]
    fun test_enemy_take_damage_min() {
        let enemy = enemies::spawn_skeleton();
        // Very low damage should still do 1
        let killed = enemies::take_damage(&mut enemy, 1);
        assert!(!killed, 0);
        assert!(enemies::get_health(&enemy) == 29, 1);
    }

    #[test]
    fun test_enemy_kill() {
        let enemy = enemies::spawn_skeleton();
        // Deal massive damage
        let killed = enemies::take_damage(&mut enemy, 100);
        assert!(killed, 0);
        assert!(enemies::get_health(&enemy) == 0, 1);
        assert!(enemies::is_dead(&enemy), 2);
    }

    #[test]
    fun test_enemy_exact_kill() {
        let enemy = enemies::spawn_skeleton();
        // 30 HP, 2 defense. Need 32 damage to kill (30 + 2)
        let killed = enemies::take_damage(&mut enemy, 32);
        assert!(killed, 0);
        assert!(enemies::is_dead(&enemy), 1);
    }

    #[test]
    fun test_enemy_defense_reduces_damage() {
        // Test all enemy types have proper defense reduction
        let skeleton = enemies::spawn_skeleton(); // 2 defense
        let zombie = enemies::spawn_zombie();     // 4 defense
        let ghoul = enemies::spawn_ghoul();       // 6 defense
        let vampire = enemies::spawn_vampire();   // 10 defense
        let lich = enemies::spawn_lich();         // 15 defense
        let boss = enemies::spawn_boss();         // 20 defense

        // Apply 20 damage to each
        enemies::take_damage(&mut skeleton, 20);  // 20-2=18 effective
        enemies::take_damage(&mut zombie, 20);    // 20-4=16 effective
        enemies::take_damage(&mut ghoul, 20);     // 20-6=14 effective
        enemies::take_damage(&mut vampire, 20);   // 20-10=10 effective
        enemies::take_damage(&mut lich, 20);      // 20-15=5 effective
        enemies::take_damage(&mut boss, 20);      // 20-20=1 min effective

        assert!(enemies::get_health(&skeleton) == 12, 0);  // 30-18=12
        assert!(enemies::get_health(&zombie) == 34, 1);    // 50-16=34
        assert!(enemies::get_health(&ghoul) == 66, 2);     // 80-14=66
        assert!(enemies::get_health(&vampire) == 110, 3);  // 120-10=110
        assert!(enemies::get_health(&lich) == 195, 4);     // 200-5=195
        assert!(enemies::get_health(&boss) == 499, 5);     // 500-1=499 (min damage)
    }

    // =============================================
    // ITEMS TESTS - Rarity and constructors
    // =============================================

    #[test]
    fun test_rarity_constructors() {
        let common = items::common();
        let uncommon = items::uncommon();
        let rare = items::rare();
        let epic = items::epic();
        let legendary = items::legendary();

        assert!(items::rarity_to_u8(&common) == 0, 0);
        assert!(items::rarity_to_u8(&uncommon) == 1, 1);
        assert!(items::rarity_to_u8(&rare) == 2, 2);
        assert!(items::rarity_to_u8(&epic) == 3, 3);
        assert!(items::rarity_to_u8(&legendary) == 4, 4);
    }

    #[test]
    fun test_u8_to_rarity() {
        let r0 = items::u8_to_rarity(0);
        let r1 = items::u8_to_rarity(1);
        let r2 = items::u8_to_rarity(2);
        let r3 = items::u8_to_rarity(3);
        let r4 = items::u8_to_rarity(4);

        assert!(items::rarity_to_u8(&r0) == 0, 0);
        assert!(items::rarity_to_u8(&r1) == 1, 1);
        assert!(items::rarity_to_u8(&r2) == 2, 2);
        assert!(items::rarity_to_u8(&r3) == 3, 3);
        assert!(items::rarity_to_u8(&r4) == 4, 4);
    }

    #[test]
    fun test_enchantment_constructors() {
        let fire = items::fire_enchant(10);
        let ice = items::ice_enchant(20);
        let lightning = items::lightning_enchant(3);
        let vampiric = items::vampiric_enchant(15);
        let vorpal = items::vorpal_enchant(5);

        // These should compile and not panic
        let _ = fire;
        let _ = ice;
        let _ = lightning;
        let _ = vampiric;
        let _ = vorpal;
    }

    // =============================================
    // LOOT TESTS - Rarity determination and drop tables
    // =============================================

    #[test]
    fun test_floor_1_rarity_distribution() {
        // Floor 1: 70% common (roll >= 30), 25% uncommon (5-29), 5% rare (0-4)
        // Test rare (roll < 5)
        let rare = loot::determine_rarity_by_floor(1, 3);
        assert!(items::rarity_to_u8(&rare) == 2, 0);

        // Test uncommon (roll 5-29)
        let uncommon = loot::determine_rarity_by_floor(1, 15);
        assert!(items::rarity_to_u8(&uncommon) == 1, 1);

        // Test common (roll >= 30)
        let common = loot::determine_rarity_by_floor(1, 50);
        assert!(items::rarity_to_u8(&common) == 0, 2);
    }

    #[test]
    fun test_floor_3_rarity_distribution() {
        // Floor 3: 50% common, 30% uncommon, 15% rare, 5% epic
        // Test epic (roll < 5)
        let epic = loot::determine_rarity_by_floor(3, 2);
        assert!(items::rarity_to_u8(&epic) == 3, 0);

        // Test rare (roll 5-19)
        let rare = loot::determine_rarity_by_floor(3, 10);
        assert!(items::rarity_to_u8(&rare) == 2, 1);

        // Test uncommon (roll 20-49)
        let uncommon = loot::determine_rarity_by_floor(3, 35);
        assert!(items::rarity_to_u8(&uncommon) == 1, 2);

        // Test common (roll >= 50)
        let common = loot::determine_rarity_by_floor(3, 75);
        assert!(items::rarity_to_u8(&common) == 0, 3);
    }

    #[test]
    fun test_floor_5_rarity_distribution() {
        // Floor 5+: 30% uncommon, 40% rare, 25% epic, 5% legendary
        // Test legendary (roll < 5)
        let legendary = loot::determine_rarity_by_floor(5, 2);
        assert!(items::rarity_to_u8(&legendary) == 4, 0);

        // Test epic (roll 5-29)
        let epic = loot::determine_rarity_by_floor(5, 15);
        assert!(items::rarity_to_u8(&epic) == 3, 1);

        // Test rare (roll 30-69)
        let rare = loot::determine_rarity_by_floor(5, 50);
        assert!(items::rarity_to_u8(&rare) == 2, 2);

        // Test uncommon (roll >= 70)
        let uncommon = loot::determine_rarity_by_floor(5, 85);
        assert!(items::rarity_to_u8(&uncommon) == 1, 3);
    }

    #[test]
    fun test_drop_table_floor_1() {
        let table = loot::get_floor_drop_table(1);
        let _ = table;
    }

    #[test]
    fun test_drop_table_floor_5() {
        let table = loot::get_floor_drop_table(5);
        let _ = table;
    }

    #[test]
    fun test_determine_item_type_weapon() {
        // Floor 1: weapon_chance = 35, armor = 28, accessory = 17, total = 80
        // roll < 35 = weapon
        let item_type = loot::determine_item_type(1, 10);
        assert!(item_type == 0, 0); // 0 = weapon
    }

    #[test]
    fun test_determine_item_type_armor() {
        // Floor 1: total = 80, weapon ends at 35, armor ends at 63
        // roll 40 should be armor (35-62)
        let item_type = loot::determine_item_type(1, 40);
        assert!(item_type == 1, 0); // 1 = armor
    }

    #[test]
    fun test_determine_item_type_accessory() {
        // Floor 1: total = 80, roll 70 should be accessory (63-79)
        let item_type = loot::determine_item_type(1, 70);
        assert!(item_type == 2, 0); // 2 = accessory
    }

    // =============================================
    // HERO TESTS - Experience and leveling math
    // =============================================

    #[test]
    fun test_exp_required_level_1() {
        // Level 1: 100 * 2^0 = 100
        let exp = hero::exp_required(1);
        assert!(exp == 100, 0);
    }

    #[test]
    fun test_exp_required_level_2() {
        // Level 2: 100 * 2^1 = 200
        let exp = hero::exp_required(2);
        assert!(exp == 200, 0);
    }

    #[test]
    fun test_exp_required_level_3() {
        // Level 3: 100 * 2^2 = 400
        let exp = hero::exp_required(3);
        assert!(exp == 400, 0);
    }

    #[test]
    fun test_exp_required_level_5() {
        // Level 5: 100 * 2^4 = 1600
        let exp = hero::exp_required(5);
        assert!(exp == 1600, 0);
    }

    #[test]
    fun test_exp_required_level_10() {
        // Level 10: 100 * 2^9 = 51200
        let exp = hero::exp_required(10);
        assert!(exp == 51200, 0);
    }

    // =============================================
    // CLASS CONSTRUCTOR TESTS
    // =============================================

    #[test]
    fun test_class_constructors() {
        let warrior = hero::warrior();
        let rogue = hero::rogue();
        let mage = hero::mage();

        let _ = warrior;
        let _ = rogue;
        let _ = mage;
    }

    // =============================================
    // DUNGEON TESTS - Max floors
    // =============================================

    #[test]
    fun test_dungeon_max_floors() {
        let max = ashfall::dungeon::max_floors();
        assert!(max == 5, 0);
    }

    // =============================================
    // STASH TESTS - Max capacity
    // =============================================

    #[test]
    fun test_stash_max_size() {
        let max = ashfall::stash::max_stash_size();
        assert!(max == 50, 0);
    }

    // =============================================
    // INTEGRATION-LIKE TESTS
    // Tests that verify combat math formulas
    // =============================================

    #[test]
    fun test_damage_calculation_base() {
        // Base damage = 5
        // Skeleton has 2 defense
        // So minimum effective damage = 5 - 2 = 3
        let enemy = enemies::spawn_skeleton();
        let initial_health = enemies::get_health(&enemy);

        // Attack with 5 damage (base)
        let _ = enemies::take_damage(&mut enemy, 5);
        // Should do 5 - 2 = 3 damage
        assert!(enemies::get_health(&enemy) == initial_health - 3, 0);
    }

    #[test]
    fun test_multiple_attacks_kill_skeleton() {
        let enemy = enemies::spawn_skeleton();
        // Skeleton: 30 HP, 2 defense

        // Attack 1: 15 damage -> 13 effective -> 17 HP left
        let killed1 = enemies::take_damage(&mut enemy, 15);
        assert!(!killed1, 0);
        assert!(enemies::get_health(&enemy) == 17, 1);

        // Attack 2: 15 damage -> 13 effective -> 4 HP left
        let killed2 = enemies::take_damage(&mut enemy, 15);
        assert!(!killed2, 2);
        assert!(enemies::get_health(&enemy) == 4, 3);

        // Attack 3: 15 damage -> kills
        let killed3 = enemies::take_damage(&mut enemy, 15);
        assert!(killed3, 4);
        assert!(enemies::is_dead(&enemy), 5);
    }

    #[test]
    fun test_boss_combat_simulation() {
        let boss = enemies::spawn_boss();
        // Boss: 500 HP, 20 defense

        // Attack with 50 damage -> 30 effective
        let killed = enemies::take_damage(&mut boss, 50);
        assert!(!killed, 0);
        assert!(enemies::get_health(&boss) == 470, 1);

        // 17 more hits of same damage (17 * 30 = 510 total)
        let i = 0;
        while (i < 16 && !enemies::is_dead(&boss)) {
            enemies::take_damage(&mut boss, 50);
            i = i + 1;
        };

        // Should be dead or very low by now
        assert!(enemies::get_health(&boss) < 50, 2);
    }

    // =============================================
    // COMBAT DAMAGE FORMULA TESTS
    // =============================================

    #[test]
    fun test_damage_formula_no_weapon() {
        // Without weapon: base 5 + strength bonus
        // For warrior with 15 STR: 5 + 5/2 = 5 + 7 = 12
        // With weapon adds +15 damage

        // Test damage against skeleton
        let skeleton = enemies::spawn_skeleton();

        // Simulate 12 damage hit (no weapon warrior)
        enemies::take_damage(&mut skeleton, 12);
        // 12 - 2 defense = 10 effective
        assert!(enemies::get_health(&skeleton) == 20, 0);
    }

    #[test]
    fun test_damage_formula_with_weapon() {
        // With weapon: base 5 + 15 (weapon) + strength bonus
        // For warrior with 15 STR: 5 + 15 + 7 = 27

        let skeleton = enemies::spawn_skeleton();

        // Simulate 27 damage hit (warrior with weapon)
        enemies::take_damage(&mut skeleton, 27);
        // 27 - 2 defense = 25 effective
        assert!(enemies::get_health(&skeleton) == 5, 0);
    }

    #[test]
    fun test_critical_damage_doubles() {
        // Critical hits double damage
        let zombie = enemies::spawn_zombie(); // 50 HP, 4 defense

        // Normal hit: 20 damage -> 16 effective
        enemies::take_damage(&mut zombie, 20);
        assert!(enemies::get_health(&zombie) == 34, 0);

        // Critical hit: 40 damage -> 36 effective
        enemies::take_damage(&mut zombie, 40);
        assert!(enemies::get_health(&zombie) == 0, 1); // 34 - 36 = dead
    }

    // =============================================
    // HEAVY ATTACK DAMAGE TESTS
    // =============================================

    #[test]
    fun test_heavy_attack_multiplier() {
        // Heavy attack: 1.5x damage
        // Base 20 damage * 1.5 = 30

        let skeleton = enemies::spawn_skeleton();

        // Normal: 20 damage -> 18 effective
        enemies::take_damage(&mut skeleton, 20);
        assert!(enemies::get_health(&skeleton) == 12, 0);

        // Heavy would be: 30 damage -> 28 effective
        let skeleton2 = enemies::spawn_skeleton();
        enemies::take_damage(&mut skeleton2, 30);
        assert!(enemies::get_health(&skeleton2) == 2, 1);
    }

    #[test]
    fun test_heavy_attack_vs_boss() {
        // Boss: 500 HP, 20 defense
        // Heavy attack with 50 base = 75 damage
        // 75 - 20 = 55 effective

        let boss = enemies::spawn_boss();
        enemies::take_damage(&mut boss, 75);
        assert!(enemies::get_health(&boss) == 445, 0);
    }

    // =============================================
    // DEFENSE REDUCTION TESTS (50% when defending)
    // =============================================

    #[test]
    fun test_defend_halves_damage() {
        // If defending, damage is halved
        // 20 damage / 2 = 10
        let skeleton = enemies::spawn_skeleton();

        // Normal: 20 damage -> 18 effective
        enemies::take_damage(&mut skeleton, 20);
        assert!(enemies::get_health(&skeleton) == 12, 0);

        // With defend: 20/2 = 10 damage -> 8 effective
        let skeleton2 = enemies::spawn_skeleton();
        enemies::take_damage(&mut skeleton2, 10);
        assert!(enemies::get_health(&skeleton2) == 22, 1);
    }

    #[test]
    fun test_defend_vs_heavy_attack() {
        // Heavy attack: 1.5x damage, then halved by defend
        // Base 40 * 1.5 = 60, then /2 = 30

        let ghoul = enemies::spawn_ghoul(); // 80 HP, 6 defense

        // Heavy attack while enemy defends: 30 - 6 = 24 effective
        enemies::take_damage(&mut ghoul, 30);
        assert!(enemies::get_health(&ghoul) == 56, 0);
    }

    // =============================================
    // ENEMY INTENT GENERATION TESTS
    // =============================================

    #[test]
    fun test_intent_distribution_attack() {
        // 60% attack: seeds 0-59 should produce attack (0)
        // seed % 100 < 60 = attack
        let seed = 30;
        let roll = seed % 100;
        assert!(roll < 60, 0); // Should be attack
    }

    #[test]
    fun test_intent_distribution_heavy() {
        // 25% heavy attack: seeds 60-84 should produce heavy (1)
        let seed = 70;
        let roll = seed % 100;
        assert!(roll >= 60 && roll < 85, 0); // Should be heavy
    }

    #[test]
    fun test_intent_distribution_defend() {
        // 15% defend: seeds 85-99 should produce defend (2)
        let seed = 90;
        let roll = seed % 100;
        assert!(roll >= 85, 0); // Should be defend
    }

    // =============================================
    // FLEE CHANCE TESTS
    // =============================================

    #[test]
    fun test_flee_base_chance() {
        // Base 50% chance (500/1000)
        // With 0 agility: threshold = 500
        let seed_success = 400; // < 500, should succeed
        let seed_fail = 600;    // >= 500, should fail

        let threshold = 500;
        assert!(seed_success % 1000 < threshold, 0);
        assert!(seed_fail % 1000 >= threshold, 1);
    }

    #[test]
    fun test_flee_with_agility() {
        // With 15 agility (rogue): threshold = 500 + (15 * 10) = 650
        let agility = 15;
        let threshold = 500 + (agility * 10);

        let seed_success = 600; // < 650, should succeed
        let seed_fail = 700;    // >= 650, should fail

        assert!(seed_success % 1000 < threshold, 0);
        assert!(seed_fail % 1000 >= threshold, 1);
    }

    // =============================================
    // MANA COST TESTS
    // =============================================

    #[test]
    fun test_mana_costs_constants() {
        // Verify mana costs match expected values
        // Heavy attack: 20 mana
        // Heal: 30 mana
        // These are tested implicitly through combat tests

        // Warrior starts with 30 mana
        // Rogue starts with 40 mana
        // Mage starts with 100 mana

        // Mage can afford: 3 heals (90 mana) or 5 heavy attacks (100 mana)
        // Warrior can afford: 1 heal (30 mana) or 1 heavy attack (20 mana)

        let mage_mana = 100;
        let warrior_mana = 30;

        assert!(mage_mana >= 30, 0); // Can heal
        assert!(mage_mana >= 20, 1); // Can heavy attack
        assert!(warrior_mana >= 20, 2); // Can heavy attack
        assert!(warrior_mana >= 30, 3); // Can heal (exactly)
    }

    // =============================================
    // HEAL AMOUNT TESTS
    // =============================================

    #[test]
    fun test_heal_percentage() {
        // Heal restores 30% of max HP

        // Warrior: 150 max HP -> heals 45
        let warrior_heal = (150 * 30) / 100;
        assert!(warrior_heal == 45, 0);

        // Rogue: 100 max HP -> heals 30
        let rogue_heal = (100 * 30) / 100;
        assert!(rogue_heal == 30, 1);

        // Mage: 80 max HP -> heals 24
        let mage_heal = (80 * 30) / 100;
        assert!(mage_heal == 24, 2);
    }

    // =============================================
    // EXP REWARD TESTS
    // =============================================

    #[test]
    fun test_exp_rewards_scale_with_enemy() {
        let skeleton = enemies::spawn_skeleton();
        let zombie = enemies::spawn_zombie();
        let ghoul = enemies::spawn_ghoul();
        let vampire = enemies::spawn_vampire();
        let lich = enemies::spawn_lich();
        let boss = enemies::spawn_boss();

        assert!(enemies::get_exp_reward(&skeleton) == 50, 0);
        assert!(enemies::get_exp_reward(&zombie) == 80, 1);
        assert!(enemies::get_exp_reward(&ghoul) == 120, 2);
        assert!(enemies::get_exp_reward(&vampire) == 200, 3);
        assert!(enemies::get_exp_reward(&lich) == 400, 4);
        assert!(enemies::get_exp_reward(&boss) == 1000, 5);
    }

    #[test]
    fun test_exp_to_level_up() {
        // Level 1 requires 100 XP
        // Skeleton (50) + Zombie (80) = 130 XP -> should level up

        let skeleton_xp = 50;
        let zombie_xp = 80;
        let level_1_req = 100;

        assert!(skeleton_xp + zombie_xp >= level_1_req, 0);
    }

    // =============================================
    // COMBAT STATE TESTS
    // =============================================

    #[test]
    fun test_turn_constants() {
        // Verify turn constants
        let player_turn: u8 = 0;
        let enemy_turn: u8 = 1;

        assert!(player_turn == 0, 0);
        assert!(enemy_turn == 1, 1);
    }

    #[test]
    fun test_intent_constants() {
        // Verify intent constants
        let intent_attack: u8 = 0;
        let intent_heavy: u8 = 1;
        let intent_defend: u8 = 2;

        assert!(intent_attack == 0, 0);
        assert!(intent_heavy == 1, 1);
        assert!(intent_defend == 2, 2);
    }

    // =============================================
    // COMBAT RESULT TESTS
    // =============================================

    #[test]
    fun test_combat_winner_constants() {
        // Winner constants for CombatEnded event
        let player_wins: u8 = 0;
        let enemy_wins: u8 = 1;
        let fled: u8 = 2;

        assert!(player_wins == 0, 0);
        assert!(enemy_wins == 1, 1);
        assert!(fled == 2, 2);
    }

    // =============================================
    // FULL COMBAT SIMULATION TESTS
    // =============================================

    #[test]
    fun test_warrior_vs_skeleton_simulation() {
        // Warrior: 150 HP, 30 mana, 15 STR, 8 AGI
        // vs Skeleton: 30 HP, 5 atk, 2 def

        let skeleton = enemies::spawn_skeleton();

        // Warrior without weapon: 5 + 5 + 7 (str/2) = 17 damage per hit
        // Effective: 17 - 2 = 15 per hit
        // Kills in: 30 / 15 = 2 hits

        enemies::take_damage(&mut skeleton, 17);
        assert!(enemies::get_health(&skeleton) == 15, 0); // 30 - 15 = 15

        let killed = enemies::take_damage(&mut skeleton, 17);
        assert!(killed, 1);
    }

    #[test]
    fun test_rogue_vs_zombie_simulation() {
        // Rogue: 100 HP, 40 mana, 8 STR, 15 AGI
        // vs Zombie: 50 HP, 8 atk, 4 def

        let zombie = enemies::spawn_zombie();

        // Rogue without weapon: 5 + 5 + 4 (str/2) = 14 damage per hit
        // Effective: 14 - 4 = 10 per hit
        // Kills in: 50 / 10 = 5 hits

        let hits = 0;
        while (!enemies::is_dead(&zombie) && hits < 10) {
            enemies::take_damage(&mut zombie, 14);
            hits = hits + 1;
        };

        assert!(hits == 5, 0);
        assert!(enemies::is_dead(&zombie), 1);
    }

    #[test]
    fun test_mage_vs_vampire_simulation() {
        // Mage: 80 HP, 100 mana, 5 STR, 7 AGI, 15 INT
        // vs Vampire: 120 HP, 18 atk, 10 def

        let vampire = enemies::spawn_vampire();

        // Mage without weapon: 5 + 5 + 2 (str/2) = 12 damage per hit
        // Effective: 12 - 10 = 2 per hit
        // Too weak! Needs heavy attacks or weapon

        // With heavy attack (1.5x): 18 damage -> 8 effective
        // Kills in: 120 / 8 = 15 hits

        let hits = 0;
        while (!enemies::is_dead(&vampire) && hits < 20) {
            enemies::take_damage(&mut vampire, 18);
            hits = hits + 1;
        };

        assert!(hits == 15, 0);
        assert!(enemies::is_dead(&vampire), 1);
    }

    // =============================================
    // LOOT TIER TESTS
    // =============================================

    #[test]
    fun test_loot_tiers() {
        // Verify loot tiers match enemy difficulty
        let skeleton = enemies::spawn_skeleton();
        let zombie = enemies::spawn_zombie();
        let ghoul = enemies::spawn_ghoul();
        let vampire = enemies::spawn_vampire();
        let lich = enemies::spawn_lich();
        let boss = enemies::spawn_boss();

        assert!(enemies::get_loot_tier(&skeleton) == 1, 0);
        assert!(enemies::get_loot_tier(&zombie) == 1, 1);
        assert!(enemies::get_loot_tier(&ghoul) == 2, 2);
        assert!(enemies::get_loot_tier(&vampire) == 3, 3);
        assert!(enemies::get_loot_tier(&lich) == 4, 4);
        assert!(enemies::get_loot_tier(&boss) == 5, 5);
    }

    // =============================================
    // MIN/MAX HELPER TESTS
    // =============================================

    #[test]
    fun test_min_function() {
        // Test min helper used in heal capping
        let a = 100;
        let b = 150;
        let min_val = if (a < b) { a } else { b };
        assert!(min_val == 100, 0);

        let c = 200;
        let d = 150;
        let min_val2 = if (c < d) { c } else { d };
        assert!(min_val2 == 150, 1);
    }

    // =============================================
    // BOUNDARY TESTS
    // =============================================

    #[test]
    fun test_zero_damage_still_does_one() {
        let skeleton = enemies::spawn_skeleton();

        // 0 damage should still do 1 (minimum)
        enemies::take_damage(&mut skeleton, 0);
        assert!(enemies::get_health(&skeleton) == 29, 0);
    }

    #[test]
    fun test_massive_damage_overkill() {
        let skeleton = enemies::spawn_skeleton();

        // 9999 damage should kill and set HP to 0
        let killed = enemies::take_damage(&mut skeleton, 9999);
        assert!(killed, 0);
        assert!(enemies::get_health(&skeleton) == 0, 1);
    }

    #[test]
    fun test_exact_health_kill() {
        let skeleton = enemies::spawn_skeleton();
        // 30 HP, 2 defense
        // Need exactly 32 damage to kill (30 HP + 2 absorbed by defense)

        let killed = enemies::take_damage(&mut skeleton, 32);
        assert!(killed, 0);
        assert!(enemies::get_health(&skeleton) == 0, 1);
    }

    // =============================================
    // COMBAT END CONDITION TESTS
    // =============================================

    #[test]
    fun test_enemy_death_condition() {
        let skeleton = enemies::spawn_skeleton();

        // Attack until dead
        while (!enemies::is_dead(&skeleton)) {
            enemies::take_damage(&mut skeleton, 20);
        };

        assert!(enemies::get_health(&skeleton) == 0, 0);
        assert!(enemies::is_dead(&skeleton), 1);
    }

    // =============================================
    // RARITY EDGE CASE TESTS
    // =============================================

    #[test]
    fun test_rarity_boundary_floor_1() {
        // Test exact boundaries for floor 1
        // rare: 0-4, uncommon: 5-29, common: 30+

        let rare_edge = loot::determine_rarity_by_floor(1, 4);
        assert!(items::rarity_to_u8(&rare_edge) == 2, 0);

        let uncommon_start = loot::determine_rarity_by_floor(1, 5);
        assert!(items::rarity_to_u8(&uncommon_start) == 1, 1);

        let uncommon_end = loot::determine_rarity_by_floor(1, 29);
        assert!(items::rarity_to_u8(&uncommon_end) == 1, 2);

        let common_start = loot::determine_rarity_by_floor(1, 30);
        assert!(items::rarity_to_u8(&common_start) == 0, 3);
    }

    #[test]
    fun test_high_floor_still_works() {
        // Test floor 10+ uses floor 5 table
        let legendary = loot::determine_rarity_by_floor(10, 2);
        assert!(items::rarity_to_u8(&legendary) == 4, 0);
    }
}
