module ashfall::hero {
    use std::signer;
    use std::option::{Self, Option};
    use aptos_framework::event;
    use ashfall::items::{Self, Weapon, Armor, Accessory, Consumable};
    use ashfall::enemies::{Self, Enemy};

    // =============================================
    // ashfall::hero
    //
    // Character system with classes, equipment, and permadeath.
    // Equipment slots hold actual resources - they MOVE, never copy.
    // On death, all equipped items are burned forever.
    // =============================================

    // Error codes
    const E_CHARACTER_EXISTS: u64 = 1;
    const E_NO_CHARACTER: u64 = 2;
    const E_CHARACTER_DEAD: u64 = 3;
    const E_INVALID_CLASS: u64 = 4;
    const E_IN_DUNGEON: u64 = 5;
    const E_NO_WEAPON_EQUIPPED: u64 = 6;
    const E_NO_ARMOR_EQUIPPED: u64 = 7;
    const E_NO_ACCESSORY_EQUIPPED: u64 = 8;

    // =============================================
    // CLASS ENUM
    // =============================================

    enum Class has copy, drop, store {
        Warrior,
        Rogue,
        Mage
    }

    // Character ID counter
    struct CharacterIdCounter has key {
        next_id: u64
    }

    // =============================================
    // CHARACTER - The core player resource
    // =============================================

    struct Character has key {
        id: u64,
        owner: address,
        class: Class,
        level: u64,
        experience: u64,
        health: u64,
        max_health: u64,
        mana: u64,
        max_mana: u64,
        strength: u64,
        agility: u64,
        intelligence: u64,
        weapon: Option<Weapon>,
        armor: Option<Armor>,
        accessory: Option<Accessory>,
        current_dungeon: Option<u64>,
        current_floor: u64,
        is_alive: bool
    }

    // =============================================
    // EVENTS
    // =============================================

    #[event]
    struct CharacterCreated has drop, store {
        character_id: u64,
        owner: address,
        class: u8
    }

    #[event]
    struct CharacterDied has drop, store {
        character_id: u64,
        owner: address,
        floor: u64,
        weapon_burned: bool,
        armor_burned: bool,
        accessory_burned: bool
    }

    #[event]
    struct LevelUp has drop, store {
        character_id: u64,
        new_level: u64,
        new_max_health: u64,
        new_max_mana: u64
    }

    #[event]
    struct WeaponEquipped has drop, store {
        character_id: u64,
        weapon_id: u64
    }

    #[event]
    struct ArmorEquipped has drop, store {
        character_id: u64,
        armor_id: u64
    }

    #[event]
    struct AccessoryEquipped has drop, store {
        character_id: u64,
        accessory_id: u64
    }

    #[event]
    struct ItemEquipped has drop, store {
        player: address,
        item_id: u64,
        slot: u8 // 0=weapon, 1=armor, 2=accessory
    }

    #[event]
    struct CombatResult has drop, store {
        character_id: u64,
        damage_dealt: u64,
        was_crit: bool,
        enemy_killed: bool,
        counterattack_damage: u64
    }

    #[event]
    struct ConsumableUsed has drop, store {
        character_id: u64,
        consumable_type: u8,
        amount_restored: u64
    }

    // =============================================
    // INITIALIZATION
    // =============================================

    fun init_module(account: &signer) {
        move_to(account, CharacterIdCounter { next_id: 1 });
    }

    // =============================================
    // CLASS CONSTRUCTORS
    // =============================================

    public fun warrior(): Class { Class::Warrior }
    public fun rogue(): Class { Class::Rogue }
    public fun mage(): Class { Class::Mage }

    fun class_to_u8(class: &Class): u8 {
        match (class) {
            Class::Warrior => 0,
            Class::Rogue => 1,
            Class::Mage => 2
        }
    }

    fun u8_to_class(class_id: u8): Class {
        if (class_id == 0) { Class::Warrior }
        else if (class_id == 1) { Class::Rogue }
        else { Class::Mage }
    }

    // =============================================
    // CHARACTER CREATION
    // =============================================

    /// Create a character. class_id: 0=Warrior, 1=Rogue, 2=Mage
    public entry fun create_character(account: &signer, class_id: u8) acquires CharacterIdCounter {
        let addr = signer::address_of(account);
        assert!(!exists<Character>(addr), E_CHARACTER_EXISTS);
        assert!(class_id <= 2, E_INVALID_CLASS);

        let counter = borrow_global_mut<CharacterIdCounter>(@ashfall);
        let id = counter.next_id;
        counter.next_id = counter.next_id + 1;

        let class = u8_to_class(class_id);
        let (max_health, max_mana, strength, agility, intelligence) = get_class_stats(&class);

        move_to(account, Character {
            id,
            owner: addr,
            class,
            level: 1,
            experience: 0,
            health: max_health,
            mana: max_mana,
            max_health,
            max_mana,
            strength,
            agility,
            intelligence,
            weapon: option::none(),
            armor: option::none(),
            accessory: option::none(),
            current_dungeon: option::none(),
            current_floor: 0,
            is_alive: true
        });

        event::emit(CharacterCreated {
            character_id: id,
            owner: addr,
            class: class_id
        });
    }

    fun get_class_stats(class: &Class): (u64, u64, u64, u64, u64) {
        match (class) {
            // Warrior: 150 HP, 30 mana, high strength
            Class::Warrior => (150, 30, 15, 8, 5),
            // Rogue: 100 HP, 40 mana, high agility
            Class::Rogue => (100, 40, 8, 15, 7),
            // Mage: 80 HP, 100 mana, high intelligence
            Class::Mage => (80, 100, 5, 7, 15)
        }
    }

    // =============================================
    // EQUIPMENT - Resources move in and out
    // =============================================

    public fun equip_weapon(character: &mut Character, weapon: Weapon): Option<Weapon> {
        assert!(character.is_alive, E_CHARACTER_DEAD);

        let weapon_id = items::weapon_id(&weapon);

        // Swap: put new weapon in, get old out (if any)
        let old_weapon = option::swap_or_fill(&mut character.weapon, weapon);

        event::emit(WeaponEquipped {
            character_id: character.id,
            weapon_id
        });

        event::emit(ItemEquipped {
            player: character.owner,
            item_id: weapon_id,
            slot: 0
        });

        old_weapon
    }

    public fun equip_armor(character: &mut Character, armor: Armor): Option<Armor> {
        assert!(character.is_alive, E_CHARACTER_DEAD);

        let armor_id = items::armor_id(&armor);

        // Swap: put new armor in, get old out (if any)
        let old_armor = option::swap_or_fill(&mut character.armor, armor);

        event::emit(ArmorEquipped {
            character_id: character.id,
            armor_id
        });

        event::emit(ItemEquipped {
            player: character.owner,
            item_id: armor_id,
            slot: 1
        });

        old_armor
    }

    public fun equip_accessory(character: &mut Character, accessory: Accessory): Option<Accessory> {
        assert!(character.is_alive, E_CHARACTER_DEAD);

        let accessory_id = items::accessory_id(&accessory);

        // Swap: put new accessory in, get old out (if any)
        let old_accessory = option::swap_or_fill(&mut character.accessory, accessory);

        event::emit(AccessoryEquipped {
            character_id: character.id,
            accessory_id
        });

        event::emit(ItemEquipped {
            player: character.owner,
            item_id: accessory_id,
            slot: 2
        });

        old_accessory
    }

    public fun unequip_weapon(character: &mut Character): Weapon {
        assert!(character.is_alive, E_CHARACTER_DEAD);
        assert!(option::is_some(&character.weapon), E_NO_WEAPON_EQUIPPED);
        option::extract(&mut character.weapon)
    }

    public fun unequip_armor(character: &mut Character): Armor {
        assert!(character.is_alive, E_CHARACTER_DEAD);
        assert!(option::is_some(&character.armor), E_NO_ARMOR_EQUIPPED);
        option::extract(&mut character.armor)
    }

    public fun unequip_accessory(character: &mut Character): Accessory {
        assert!(character.is_alive, E_CHARACTER_DEAD);
        assert!(option::is_some(&character.accessory), E_NO_ACCESSORY_EQUIPPED);
        option::extract(&mut character.accessory)
    }

    // =============================================
    // PERMADEATH - Burns all equipment forever
    // =============================================

    public fun character_death(character: &mut Character) {
        assert!(character.is_alive, E_CHARACTER_DEAD);

        character.is_alive = false;

        let weapon_burned = false;
        let armor_burned = false;
        let accessory_burned = false;

        // Burn equipped weapon
        if (option::is_some(&character.weapon)) {
            let weapon = option::extract(&mut character.weapon);
            items::destroy_weapon(weapon);
            weapon_burned = true;
        };

        // Burn equipped armor
        if (option::is_some(&character.armor)) {
            let armor = option::extract(&mut character.armor);
            items::destroy_armor(armor);
            armor_burned = true;
        };

        // Burn equipped accessory
        if (option::is_some(&character.accessory)) {
            let accessory = option::extract(&mut character.accessory);
            items::destroy_accessory(accessory);
            accessory_burned = true;
        };

        event::emit(CharacterDied {
            character_id: character.id,
            owner: character.owner,
            floor: character.current_floor,
            weapon_burned,
            armor_burned,
            accessory_burned
        });
    }

    // =============================================
    // LEVELING SYSTEM
    // EXP formula: 100 * 2^(level-1)
    // =============================================

    public fun add_experience(character: &mut Character, exp: u64) {
        assert!(character.is_alive, E_CHARACTER_DEAD);

        character.experience = character.experience + exp;

        // Check for level ups
        while (character.experience >= exp_required(character.level)) {
            character.experience = character.experience - exp_required(character.level);
            level_up(character);
        };
    }

    /// Add experience to a player's character - callable by other modules
    public fun add_experience_to_player(player: address, exp: u64) acquires Character {
        let character = borrow_global_mut<Character>(player);
        add_experience(character, exp);
    }

    /// Trigger death for a player's character - callable by other modules
    public fun kill_player_character(player: address) acquires Character {
        let character = borrow_global_mut<Character>(player);
        character_death(character);
    }

    fun level_up(character: &mut Character) {
        character.level = character.level + 1;

        // +20 max HP, +10 max mana per level
        character.max_health = character.max_health + 20;
        character.max_mana = character.max_mana + 10;

        // Full heal on level up
        character.health = character.max_health;
        character.mana = character.max_mana;

        event::emit(LevelUp {
            character_id: character.id,
            new_level: character.level,
            new_max_health: character.max_health,
            new_max_mana: character.max_mana
        });
    }

    public fun exp_required(level: u64): u64 {
        // 100 * 2^(level-1)
        100 * (1u64 << ((level - 1) as u8))
    }

    // =============================================
    // COMBAT SYSTEM
    // Damage = base(5) + weapon + (strength * 0.5)
    // Crit: 5% + (agility * 0.2%)
    // =============================================

    /// Attack an enemy. Returns (damage_dealt, was_crit, enemy_killed, counterattack_damage)
    public fun attack_enemy(character: &mut Character, enemy: &mut Enemy, seed: u64): (u64, bool, bool, u64) {
        assert!(character.is_alive, E_CHARACTER_DEAD);

        // Calculate damage: base(5) + weapon + (strength / 2)
        let base_damage = 5u64;
        let weapon_damage = get_weapon_damage(character);
        let strength_bonus = character.strength / 2;
        let total_damage = base_damage + weapon_damage + strength_bonus;

        // Check for crit: 5% + (agility * 0.2%) = 5% + agility/5%
        // Using seed for deterministic pseudo-randomness
        let crit_threshold = 50 + (character.agility * 2); // out of 1000
        let crit_roll = seed % 1000;
        let was_crit = crit_roll < crit_threshold;

        let final_damage = if (was_crit) { total_damage * 2 } else { total_damage };

        // Apply damage to enemy
        let enemy_killed = enemies::take_damage(enemy, final_damage);

        // Counterattack if enemy survives
        let counterattack_damage = if (!enemy_killed) {
            let enemy_attack = enemies::get_attack(enemy);
            take_damage_with_armor(character, enemy_attack);
            enemy_attack
        } else {
            // Grant EXP for kill
            let exp = enemies::get_exp_reward(enemy);
            add_experience(character, exp);
            0
        };

        event::emit(CombatResult {
            character_id: character.id,
            damage_dealt: final_damage,
            was_crit,
            enemy_killed,
            counterattack_damage
        });

        (final_damage, was_crit, enemy_killed, counterattack_damage)
    }

    /// Take damage reduced by armor defense. Triggers death if HP reaches 0.
    public fun take_damage_with_armor(character: &mut Character, damage: u64) {
        let armor_def = get_armor_defense(character);
        let effective_damage = if (damage > armor_def) { damage - armor_def } else { 1 };

        if (character.health <= effective_damage) {
            character.health = 0;
            character_death(character);
        } else {
            character.health = character.health - effective_damage;
        }
    }

    /// Basic take damage without armor (for internal use)
    public fun take_damage(character: &mut Character, damage: u64) {
        if (character.health <= damage) {
            character.health = 0;
        } else {
            character.health = character.health - damage;
        }
    }

    /// Use a consumable item. Heals HP (type 0) or mana (type 1).
    public fun use_consumable(character: &mut Character, consumable: Consumable) {
        assert!(character.is_alive, E_CHARACTER_DEAD);

        let c_type = items::consumable_type(&consumable);
        let power = items::consumable_power(&consumable);

        if (c_type == 0) {
            // Health potion
            heal(character, power);
            event::emit(ConsumableUsed {
                character_id: character.id,
                consumable_type: 0,
                amount_restored: power
            });
        } else if (c_type == 1) {
            // Mana potion
            restore_mana(character, power);
            event::emit(ConsumableUsed {
                character_id: character.id,
                consumable_type: 1,
                amount_restored: power
            });
        };
        // Consumable is dropped (consumed) at end of function
    }

    public fun heal(character: &mut Character, amount: u64) {
        character.health = min(character.health + amount, character.max_health);
    }

    public fun restore_mana(character: &mut Character, amount: u64) {
        character.mana = min(character.mana + amount, character.max_mana);
    }

    public fun use_mana(character: &mut Character, amount: u64): bool {
        if (character.mana >= amount) {
            character.mana = character.mana - amount;
            true
        } else {
            false
        }
    }

    public fun is_dead(character: &Character): bool {
        character.health == 0 || !character.is_alive
    }

    fun min(a: u64, b: u64): u64 {
        if (a < b) { a } else { b }
    }

    // =============================================
    // DUNGEON STATE
    // =============================================

    public fun enter_dungeon(character: &mut Character, dungeon_id: u64) {
        assert!(character.is_alive, E_CHARACTER_DEAD);
        assert!(option::is_none(&character.current_dungeon), E_IN_DUNGEON);
        character.current_dungeon = option::some(dungeon_id);
        character.current_floor = 1;
    }

    public fun advance_floor(character: &mut Character) {
        character.current_floor = character.current_floor + 1;
    }

    public fun exit_dungeon(character: &mut Character) {
        character.current_dungeon = option::none();
        character.current_floor = 0;
    }

    public fun is_in_dungeon(character: &Character): bool {
        option::is_some(&character.current_dungeon)
    }

    // =============================================
    // VIEW FUNCTIONS
    // =============================================

    #[view]
    public fun get_character_stats(addr: address): (u64, u64, u64, u64, u64, u64, u64, bool) acquires Character {
        let c = borrow_global<Character>(addr);
        (c.level, c.experience, c.health, c.max_health, c.mana, c.max_mana, c.current_floor, c.is_alive)
    }

    #[view]
    public fun get_base_stats(addr: address): (u64, u64, u64) acquires Character {
        let c = borrow_global<Character>(addr);
        (c.strength, c.agility, c.intelligence)
    }

    #[view]
    public fun character_exists(addr: address): bool {
        exists<Character>(addr)
    }

    #[view]
    public fun is_character_alive(addr: address): bool acquires Character {
        let c = borrow_global<Character>(addr);
        c.is_alive
    }

    #[view]
    public fun get_character_class(addr: address): u8 acquires Character {
        let c = borrow_global<Character>(addr);
        class_to_u8(&c.class)
    }

    #[view]
    public fun has_weapon_equipped(addr: address): bool acquires Character {
        let c = borrow_global<Character>(addr);
        option::is_some(&c.weapon)
    }

    #[view]
    public fun has_armor_equipped(addr: address): bool acquires Character {
        let c = borrow_global<Character>(addr);
        option::is_some(&c.armor)
    }

    #[view]
    public fun has_accessory_equipped(addr: address): bool acquires Character {
        let c = borrow_global<Character>(addr);
        option::is_some(&c.accessory)
    }

    #[view]
    public fun get_equipment_ids(addr: address): (u64, u64, u64) acquires Character {
        let c = borrow_global<Character>(addr);
        let weapon_id = if (option::is_some(&c.weapon)) {
            items::weapon_id(option::borrow(&c.weapon))
        } else { 0 };
        let armor_id = if (option::is_some(&c.armor)) {
            items::armor_id(option::borrow(&c.armor))
        } else { 0 };
        let accessory_id = if (option::is_some(&c.accessory)) {
            items::accessory_id(option::borrow(&c.accessory))
        } else { 0 };
        (weapon_id, armor_id, accessory_id)
    }

    #[view]
    public fun is_player_in_dungeon(addr: address): bool acquires Character {
        let c = borrow_global<Character>(addr);
        option::is_some(&c.current_dungeon)
    }

    // =============================================
    // GETTERS FOR COMBAT CALCULATIONS
    // =============================================

    public fun get_strength(character: &Character): u64 { character.strength }
    public fun get_agility(character: &Character): u64 { character.agility }
    public fun get_intelligence(character: &Character): u64 { character.intelligence }
    public fun get_health(character: &Character): u64 { character.health }
    public fun get_max_health(character: &Character): u64 { character.max_health }
    public fun get_level(character: &Character): u64 { character.level }

    public fun get_weapon_damage(character: &Character): u64 {
        if (option::is_some(&character.weapon)) {
            items::weapon_damage(option::borrow(&character.weapon))
        } else {
            5 // Base unarmed damage
        }
    }

    public fun get_armor_defense(character: &Character): u64 {
        if (option::is_some(&character.armor)) {
            items::armor_defense(option::borrow(&character.armor))
        } else {
            0
        }
    }

    public fun get_accessory_bonus(character: &Character): u64 {
        if (option::is_some(&character.accessory)) {
            items::accessory_stat_bonus(option::borrow(&character.accessory))
        } else {
            0
        }
    }

}
