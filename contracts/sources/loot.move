module ashfall::loot {
    use std::string;
    use ashfall::items::{Self, Rarity, Weapon, Armor, Accessory, ItemIdCounter};

    // =============================================
    // ashfall::loot
    //
    // Loot generation with floor-based rarity scaling.
    // Higher floors = better drop chances.
    // =============================================

    const E_INVALID_DROP_TYPE: u64 = 1;

    // Item types for drop selection
    const ITEM_WEAPON: u64 = 0;
    const ITEM_ARMOR: u64 = 1;
    const ITEM_ACCESSORY: u64 = 2;

    struct DropTable has copy, drop, store {
        floor: u64,
        weapon_chance: u64,
        armor_chance: u64,
        accessory_chance: u64,
        consumable_chance: u64
    }

    public fun get_floor_drop_table(floor: u64): DropTable {
        DropTable {
            floor,
            weapon_chance: 30 + (floor * 5),
            armor_chance: 25 + (floor * 3),
            accessory_chance: 15 + (floor * 2),
            consumable_chance: 30
        }
    }

    // =============================================
    // RARITY BY FLOOR
    // Floor 1: 70% common, 25% uncommon, 5% rare
    // Floor 3: 50% common, 30% uncommon, 15% rare, 5% epic
    // Floor 5: 30% uncommon, 40% rare, 25% epic, 5% legendary
    // =============================================

    public fun determine_rarity_by_floor(floor: u64, seed: u64): Rarity {
        let roll = seed % 100;

        if (floor <= 1) {
            // Floor 1: 70% common, 25% uncommon, 5% rare
            if (roll < 5) { items::rare() }
            else if (roll < 30) { items::uncommon() }
            else { items::common() }
        } else if (floor <= 2) {
            // Floor 2: 60% common, 28% uncommon, 10% rare, 2% epic
            if (roll < 2) { items::epic() }
            else if (roll < 12) { items::rare() }
            else if (roll < 40) { items::uncommon() }
            else { items::common() }
        } else if (floor <= 3) {
            // Floor 3: 50% common, 30% uncommon, 15% rare, 5% epic
            if (roll < 5) { items::epic() }
            else if (roll < 20) { items::rare() }
            else if (roll < 50) { items::uncommon() }
            else { items::common() }
        } else if (floor <= 4) {
            // Floor 4: 35% common, 35% uncommon, 20% rare, 8% epic, 2% legendary
            if (roll < 2) { items::legendary() }
            else if (roll < 10) { items::epic() }
            else if (roll < 30) { items::rare() }
            else if (roll < 65) { items::uncommon() }
            else { items::common() }
        } else {
            // Floor 5+: 30% uncommon, 40% rare, 25% epic, 5% legendary
            if (roll < 5) { items::legendary() }
            else if (roll < 30) { items::epic() }
            else if (roll < 70) { items::rare() }
            else { items::uncommon() }
        }
    }

    // =============================================
    // BOSS LOOT - 5% legendary guaranteed
    // Floor 5 boss: 5% legendary, 30% epic, 45% rare, 20% uncommon
    // =============================================

    public fun determine_boss_rarity(seed: u64): Rarity {
        let roll = seed % 100;

        if (roll < 5) { items::legendary() }       // 5% legendary (guaranteed minimum)
        else if (roll < 35) { items::epic() }      // 30% epic
        else if (roll < 80) { items::rare() }      // 45% rare
        else { items::uncommon() }                  // 20% uncommon (no common from boss)
    }

    /// Generate boss weapon - always high quality
    public fun generate_boss_weapon(
        counter: &mut ItemIdCounter,
        seed: u64,
        dungeon_id: u64
    ): Weapon {
        let rarity = determine_boss_rarity(seed);
        let rarity_mult = get_rarity_multiplier(&rarity);

        // Boss weapons have higher base damage
        let base_damage = 20 + (5 * 3); // floor 5 equivalent + bonus
        let final_damage = base_damage * rarity_mult / 10;

        let name = string::utf8(b"Dungeon Lord's Blade");
        let attack_speed = 12 + (seed % 3);
        let durability = 80 + (rarity_mult * 15);

        items::mint_weapon(counter, name, rarity, final_damage, attack_speed, durability, dungeon_id)
    }

    /// Generate boss armor - always high quality
    public fun generate_boss_armor(
        counter: &mut ItemIdCounter,
        seed: u64
    ): Armor {
        let rarity = determine_boss_rarity(seed);
        let rarity_mult = get_rarity_multiplier(&rarity);

        let base_defense = 15;
        let final_defense = base_defense * rarity_mult / 10;
        let magic_resist = final_defense / 2;

        let name = string::utf8(b"Dungeon Lord's Plate");
        let durability = 100 + (rarity_mult * 15);

        items::mint_armor(counter, name, rarity, final_defense, magic_resist, durability)
    }

    /// Generate boss accessory - always high quality
    public fun generate_boss_accessory(
        counter: &mut ItemIdCounter,
        seed: u64
    ): Accessory {
        let rarity = determine_boss_rarity(seed);
        let rarity_mult = get_rarity_multiplier(&rarity);

        let base_bonus = 10;
        let final_bonus = base_bonus * rarity_mult / 10;

        let name = string::utf8(b"Dungeon Lord's Signet");
        let stat_type = ((seed / 100) % 3) as u8;

        items::mint_accessory(counter, name, rarity, final_bonus, stat_type)
    }

    // =============================================
    // ITEM GENERATION
    // =============================================

    /// Generate a weapon based on floor and rarity
    public fun generate_weapon(
        counter: &mut ItemIdCounter,
        floor: u64,
        enemy_tier: u64,
        seed: u64,
        dungeon_id: u64
    ): Weapon {
        let rarity = determine_rarity_by_floor(floor, seed);
        let rarity_mult = get_rarity_multiplier(&rarity);

        // Base damage scales with floor and rarity
        let base_damage = 5 + (floor * 3) + (enemy_tier * 2);
        let final_damage = base_damage * rarity_mult / 10;

        let name = get_weapon_name(floor, seed);
        let attack_speed = 10 + (seed % 5);
        let durability = 50 + (rarity_mult * 10);

        items::mint_weapon(counter, name, rarity, final_damage, attack_speed, durability, dungeon_id)
    }

    /// Generate armor based on floor and rarity
    public fun generate_armor(
        counter: &mut ItemIdCounter,
        floor: u64,
        enemy_tier: u64,
        seed: u64
    ): Armor {
        let rarity = determine_rarity_by_floor(floor, seed);
        let rarity_mult = get_rarity_multiplier(&rarity);

        // Defense scales with floor and rarity
        let base_defense = 3 + (floor * 2) + enemy_tier;
        let final_defense = base_defense * rarity_mult / 10;
        let magic_resist = final_defense / 2;

        let name = get_armor_name(floor, seed);
        let durability = 60 + (rarity_mult * 10);

        items::mint_armor(counter, name, rarity, final_defense, magic_resist, durability)
    }

    /// Generate accessory based on floor and rarity
    public fun generate_accessory(
        counter: &mut ItemIdCounter,
        floor: u64,
        enemy_tier: u64,
        seed: u64
    ): Accessory {
        let rarity = determine_rarity_by_floor(floor, seed);
        let rarity_mult = get_rarity_multiplier(&rarity);

        // Stat bonus scales with floor and rarity
        let base_bonus = 2 + floor + enemy_tier;
        let final_bonus = base_bonus * rarity_mult / 10;

        let name = get_accessory_name(floor, seed);
        let stat_type = ((seed / 100) % 3) as u8; // 0=str, 1=agi, 2=int

        items::mint_accessory(counter, name, rarity, final_bonus, stat_type)
    }

    // =============================================
    // HELPER FUNCTIONS
    // =============================================

    fun get_rarity_multiplier(rarity: &Rarity): u64 {
        let r = items::rarity_to_u8(rarity);
        if (r == 0) { 10 }       // Common: 1x
        else if (r == 1) { 15 }  // Uncommon: 1.5x
        else if (r == 2) { 20 }  // Rare: 2x
        else if (r == 3) { 30 }  // Epic: 3x
        else { 50 }              // Legendary: 5x
    }

    fun get_weapon_name(floor: u64, seed: u64): std::string::String {
        let names = if (floor <= 2) {
            if (seed % 3 == 0) { b"Rusty Sword" }
            else if (seed % 3 == 1) { b"Worn Dagger" }
            else { b"Old Axe" }
        } else if (floor <= 4) {
            if (seed % 3 == 0) { b"Steel Blade" }
            else if (seed % 3 == 1) { b"Sharp Scimitar" }
            else { b"Battle Mace" }
        } else {
            if (seed % 3 == 0) { b"Demon Slayer" }
            else if (seed % 3 == 1) { b"Soul Reaver" }
            else { b"Void Cleaver" }
        };
        string::utf8(names)
    }

    fun get_armor_name(floor: u64, seed: u64): std::string::String {
        let names = if (floor <= 2) {
            if (seed % 3 == 0) { b"Leather Vest" }
            else if (seed % 3 == 1) { b"Padded Tunic" }
            else { b"Chain Shirt" }
        } else if (floor <= 4) {
            if (seed % 3 == 0) { b"Steel Plate" }
            else if (seed % 3 == 1) { b"Scale Mail" }
            else { b"Reinforced Armor" }
        } else {
            if (seed % 3 == 0) { b"Dragonscale" }
            else if (seed % 3 == 1) { b"Shadow Cloak" }
            else { b"Void Plate" }
        };
        string::utf8(names)
    }

    fun get_accessory_name(floor: u64, seed: u64): std::string::String {
        let names = if (floor <= 2) {
            if (seed % 3 == 0) { b"Copper Ring" }
            else if (seed % 3 == 1) { b"Bone Amulet" }
            else { b"Leather Band" }
        } else if (floor <= 4) {
            if (seed % 3 == 0) { b"Silver Ring" }
            else if (seed % 3 == 1) { b"Crystal Pendant" }
            else { b"Enchanted Circlet" }
        } else {
            if (seed % 3 == 0) { b"Dragon Ring" }
            else if (seed % 3 == 1) { b"Soul Gem" }
            else { b"Void Stone" }
        };
        string::utf8(names)
    }

    /// Determine which item type drops (0=weapon, 1=armor, 2=accessory)
    public fun determine_item_type(floor: u64, seed: u64): u64 {
        let table = get_floor_drop_table(floor);
        let total = table.weapon_chance + table.armor_chance + table.accessory_chance;
        let roll = seed % total;

        if (roll < table.weapon_chance) {
            ITEM_WEAPON
        } else if (roll < table.weapon_chance + table.armor_chance) {
            ITEM_ARMOR
        } else {
            ITEM_ACCESSORY
        }
    }

    /// Boss always drops 2 items - determine types
    public fun determine_boss_drop_types(seed: u64): (u64, u64) {
        let type1 = seed % 3; // 0=weapon, 1=armor, 2=accessory
        let type2 = (seed / 3) % 3;

        // Ensure variety - if same, offset second
        if (type1 == type2) {
            type2 = (type2 + 1) % 3;
        };

        (type1, type2)
    }
}
