#[test_only]
module ashfall::tests {
    use ashfall::enemies;
    use ashfall::items;
    use ashfall::loot;

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
        // weapon_chance: 30 + (1 * 5) = 35
        // armor_chance: 25 + (1 * 3) = 28
        // accessory_chance: 15 + (1 * 2) = 17
        // These values are checked via determine_item_type
        let _ = table;
    }

    #[test]
    fun test_drop_table_floor_5() {
        let table = loot::get_floor_drop_table(5);
        // weapon_chance: 30 + (5 * 5) = 55
        // armor_chance: 25 + (5 * 3) = 40
        // accessory_chance: 15 + (5 * 2) = 25
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
        let exp = ashfall::hero::exp_required(1);
        assert!(exp == 100, 0);
    }

    #[test]
    fun test_exp_required_level_2() {
        // Level 2: 100 * 2^1 = 200
        let exp = ashfall::hero::exp_required(2);
        assert!(exp == 200, 0);
    }

    #[test]
    fun test_exp_required_level_3() {
        // Level 3: 100 * 2^2 = 400
        let exp = ashfall::hero::exp_required(3);
        assert!(exp == 400, 0);
    }

    #[test]
    fun test_exp_required_level_5() {
        // Level 5: 100 * 2^4 = 1600
        let exp = ashfall::hero::exp_required(5);
        assert!(exp == 1600, 0);
    }

    #[test]
    fun test_exp_required_level_10() {
        // Level 10: 100 * 2^9 = 51200
        let exp = ashfall::hero::exp_required(10);
        assert!(exp == 51200, 0);
    }

    // =============================================
    // CLASS CONSTRUCTOR TESTS
    // =============================================

    #[test]
    fun test_class_constructors() {
        let warrior = ashfall::hero::warrior();
        let rogue = ashfall::hero::rogue();
        let mage = ashfall::hero::mage();

        // These should compile and not panic
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
}
