module ashfall::items {
    use std::string::{Self, String};
    use std::vector;
    use aptos_framework::event;
    use aptos_framework::timestamp;

    // =============================================
    // ashfall::items
    //
    // Core item types as TRUE resources (no copy/drop).
    // Items can only be moved or explicitly destroyed.
    // This guarantees no item duplication ever.
    // =============================================

    // Error codes
    const E_INVALID_RARITY: u64 = 1;
    const E_EMPTY_NAME: u64 = 2;

    // Item ID counter stored at module address
    struct ItemIdCounter has key {
        next_id: u64
    }

    // =============================================
    // RARITY - Value type (can be copied)
    // =============================================

    enum Rarity has copy, drop, store {
        Common,
        Uncommon,
        Rare,
        Epic,
        Legendary
    }

    // =============================================
    // ENCHANTMENT - Value type (can be copied)
    // =============================================

    enum Enchantment has copy, drop, store {
        Fire { bonus_damage: u64 },
        Ice { slow_percent: u64 },
        Lightning { chain_targets: u64 },
        Vampiric { lifesteal_percent: u64 },
        Vorpal { crit_chance: u64 }
    }

    // =============================================
    // WEAPON - TRUE resource (key, store only)
    // Cannot be copied or implicitly dropped
    // =============================================

    struct Weapon has key, store {
        id: u64,
        name: String,
        rarity: Rarity,
        base_damage: u64,
        attack_speed: u64,
        durability: u64,
        max_durability: u64,
        enchantments: vector<Enchantment>,
        kill_count: u64,
        created_at: u64,
        created_in_dungeon: u64
    }

    // =============================================
    // ARMOR - TRUE resource (key, store only)
    // =============================================

    struct Armor has key, store {
        id: u64,
        name: String,
        rarity: Rarity,
        defense: u64,
        magic_resist: u64,
        durability: u64,
        max_durability: u64,
        enchantments: vector<Enchantment>,
        created_at: u64
    }

    // =============================================
    // ACCESSORY - TRUE resource (key, store only)
    // =============================================

    struct Accessory has key, store {
        id: u64,
        name: String,
        rarity: Rarity,
        stat_bonus: u64,
        stat_type: u8, // 0=strength, 1=agility, 2=intelligence
        enchantments: vector<Enchantment>,
        created_at: u64
    }

    // =============================================
    // CONSUMABLE - Can be dropped (consumed on use)
    // =============================================

    struct Consumable has store, drop {
        id: u64,
        name: String,
        consumable_type: u8, // 0=health, 1=mana, 2=buff
        power: u64
    }

    // =============================================
    // EVENTS - Emitted on item creation/destruction
    // =============================================

    #[event]
    struct ItemCreated has drop, store {
        item_id: u64,
        item_type: String,
        rarity: u8,
        dungeon_id: u64
    }

    #[event]
    struct ItemDestroyed has drop, store {
        item_id: u64,
        item_type: String,
        reason: String
    }

    #[event]
    struct ItemDropped has drop, store {
        item_id: u64,
        rarity: u8,
        floor: u64
    }

    #[event]
    struct ItemPickedUp has drop, store {
        player: address,
        item_id: u64
    }

    #[event]
    struct ItemBurned has drop, store {
        item_id: u64,
        reason: u8 // 0=death, 1=crafting, 2=durability
    }

    // =============================================
    // INITIALIZATION
    // =============================================

    fun init_module(account: &signer) {
        move_to(account, ItemIdCounter { next_id: 1 });
    }

    fun get_next_id(counter: &mut ItemIdCounter): u64 {
        let id = counter.next_id;
        counter.next_id = counter.next_id + 1;
        id
    }

    // =============================================
    // DESTROY FUNCTIONS - Explicit destruction for permadeath
    // These are the ONLY way to remove items from existence
    // =============================================

    public fun destroy_weapon(weapon: Weapon) {
        destroy_weapon_with_reason(weapon, 0);
    }

    public fun destroy_weapon_with_reason(weapon: Weapon, reason: u8) {
        let Weapon {
            id,
            name: _,
            rarity: _,
            base_damage: _,
            attack_speed: _,
            durability: _,
            max_durability: _,
            enchantments: _,
            kill_count: _,
            created_at: _,
            created_in_dungeon: _
        } = weapon;

        event::emit(ItemDestroyed {
            item_id: id,
            item_type: string::utf8(b"Weapon"),
            reason: if (reason == 0) { string::utf8(b"permadeath") }
                    else if (reason == 1) { string::utf8(b"crafting") }
                    else { string::utf8(b"durability") }
        });

        event::emit(ItemBurned { item_id: id, reason });
    }

    public fun destroy_armor(armor: Armor) {
        destroy_armor_with_reason(armor, 0);
    }

    public fun destroy_armor_with_reason(armor: Armor, reason: u8) {
        let Armor {
            id,
            name: _,
            rarity: _,
            defense: _,
            magic_resist: _,
            durability: _,
            max_durability: _,
            enchantments: _,
            created_at: _
        } = armor;

        event::emit(ItemDestroyed {
            item_id: id,
            item_type: string::utf8(b"Armor"),
            reason: if (reason == 0) { string::utf8(b"permadeath") }
                    else if (reason == 1) { string::utf8(b"crafting") }
                    else { string::utf8(b"durability") }
        });

        event::emit(ItemBurned { item_id: id, reason });
    }

    public fun destroy_accessory(accessory: Accessory) {
        destroy_accessory_with_reason(accessory, 0);
    }

    public fun destroy_accessory_with_reason(accessory: Accessory, reason: u8) {
        let Accessory {
            id,
            name: _,
            rarity: _,
            stat_bonus: _,
            stat_type: _,
            enchantments: _,
            created_at: _
        } = accessory;

        event::emit(ItemDestroyed {
            item_id: id,
            item_type: string::utf8(b"Accessory"),
            reason: if (reason == 0) { string::utf8(b"permadeath") }
                    else if (reason == 1) { string::utf8(b"crafting") }
                    else { string::utf8(b"durability") }
        });

        event::emit(ItemBurned { item_id: id, reason });
    }

    // =============================================
    // EVENT HELPERS - For other modules to emit events
    // =============================================

    public fun emit_item_dropped(item_id: u64, rarity: u8, floor: u64) {
        event::emit(ItemDropped { item_id, rarity, floor });
    }

    public fun emit_item_picked_up(player: address, item_id: u64) {
        event::emit(ItemPickedUp { player, item_id });
    }

    // =============================================
    // FACTORY FUNCTIONS - Minting new items
    // =============================================

    public fun mint_weapon(
        counter: &mut ItemIdCounter,
        name: String,
        rarity: Rarity,
        base_damage: u64,
        attack_speed: u64,
        durability: u64,
        dungeon_id: u64
    ): Weapon {
        let id = get_next_id(counter);
        let now = timestamp::now_seconds();

        event::emit(ItemCreated {
            item_id: id,
            item_type: string::utf8(b"Weapon"),
            rarity: rarity_to_u8(&rarity),
            dungeon_id
        });

        Weapon {
            id,
            name,
            rarity,
            base_damage,
            attack_speed,
            durability,
            max_durability: durability,
            enchantments: vector::empty(),
            kill_count: 0,
            created_at: now,
            created_in_dungeon: dungeon_id
        }
    }

    public fun mint_armor(
        counter: &mut ItemIdCounter,
        name: String,
        rarity: Rarity,
        defense: u64,
        magic_resist: u64,
        durability: u64
    ): Armor {
        let id = get_next_id(counter);
        let now = timestamp::now_seconds();

        event::emit(ItemCreated {
            item_id: id,
            item_type: string::utf8(b"Armor"),
            rarity: rarity_to_u8(&rarity),
            dungeon_id: 0
        });

        Armor {
            id,
            name,
            rarity,
            defense,
            magic_resist,
            durability,
            max_durability: durability,
            enchantments: vector::empty(),
            created_at: now
        }
    }

    public fun mint_accessory(
        counter: &mut ItemIdCounter,
        name: String,
        rarity: Rarity,
        stat_bonus: u64,
        stat_type: u8
    ): Accessory {
        let id = get_next_id(counter);
        let now = timestamp::now_seconds();

        event::emit(ItemCreated {
            item_id: id,
            item_type: string::utf8(b"Accessory"),
            rarity: rarity_to_u8(&rarity),
            dungeon_id: 0
        });

        Accessory {
            id,
            name,
            rarity,
            stat_bonus,
            stat_type,
            enchantments: vector::empty(),
            created_at: now
        }
    }

    public fun mint_consumable(
        counter: &mut ItemIdCounter,
        name: String,
        consumable_type: u8,
        power: u64
    ): Consumable {
        let id = get_next_id(counter);

        Consumable {
            id,
            name,
            consumable_type,
            power
        }
    }

    // =============================================
    // HELPER FUNCTIONS
    // =============================================

    public fun rarity_to_u8(rarity: &Rarity): u8 {
        match (rarity) {
            Rarity::Common => 0,
            Rarity::Uncommon => 1,
            Rarity::Rare => 2,
            Rarity::Epic => 3,
            Rarity::Legendary => 4
        }
    }

    public fun u8_to_rarity(value: u8): Rarity {
        if (value == 0) { Rarity::Common }
        else if (value == 1) { Rarity::Uncommon }
        else if (value == 2) { Rarity::Rare }
        else if (value == 3) { Rarity::Epic }
        else { Rarity::Legendary }
    }

    // =============================================
    // GETTERS - Read item properties
    // =============================================

    // Weapon getters
    public fun weapon_id(weapon: &Weapon): u64 { weapon.id }
    public fun weapon_name(weapon: &Weapon): &String { &weapon.name }
    public fun weapon_rarity(weapon: &Weapon): &Rarity { &weapon.rarity }
    public fun weapon_damage(weapon: &Weapon): u64 { weapon.base_damage }
    public fun weapon_kill_count(weapon: &Weapon): u64 { weapon.kill_count }

    // Armor getters
    public fun armor_id(armor: &Armor): u64 { armor.id }
    public fun armor_defense(armor: &Armor): u64 { armor.defense }
    public fun armor_rarity(armor: &Armor): &Rarity { &armor.rarity }

    // Accessory getters
    public fun accessory_id(accessory: &Accessory): u64 { accessory.id }
    public fun accessory_stat_bonus(accessory: &Accessory): u64 { accessory.stat_bonus }

    // Consumable getters
    public fun consumable_power(consumable: &Consumable): u64 { consumable.power }
    public fun consumable_type(consumable: &Consumable): u8 { consumable.consumable_type }

    // =============================================
    // MUTATORS - Modify item properties
    // =============================================

    public fun increment_kill_count(weapon: &mut Weapon) {
        weapon.kill_count = weapon.kill_count + 1;
    }

    public fun reduce_durability(weapon: &mut Weapon, amount: u64) {
        if (weapon.durability > amount) {
            weapon.durability = weapon.durability - amount;
        } else {
            weapon.durability = 0;
        }
    }

    public fun add_weapon_enchantment(weapon: &mut Weapon, enchantment: Enchantment) {
        vector::push_back(&mut weapon.enchantments, enchantment);
    }

    public fun add_armor_enchantment(armor: &mut Armor, enchantment: Enchantment) {
        vector::push_back(&mut armor.enchantments, enchantment);
    }

    // =============================================
    // RARITY CONSTRUCTORS - For external use
    // =============================================

    public fun common(): Rarity { Rarity::Common }
    public fun uncommon(): Rarity { Rarity::Uncommon }
    public fun rare(): Rarity { Rarity::Rare }
    public fun epic(): Rarity { Rarity::Epic }
    public fun legendary(): Rarity { Rarity::Legendary }

    // =============================================
    // ENCHANTMENT CONSTRUCTORS
    // =============================================

    public fun fire_enchant(bonus_damage: u64): Enchantment {
        Enchantment::Fire { bonus_damage }
    }

    public fun ice_enchant(slow_percent: u64): Enchantment {
        Enchantment::Ice { slow_percent }
    }

    public fun lightning_enchant(chain_targets: u64): Enchantment {
        Enchantment::Lightning { chain_targets }
    }

    public fun vampiric_enchant(lifesteal_percent: u64): Enchantment {
        Enchantment::Vampiric { lifesteal_percent }
    }

    public fun vorpal_enchant(crit_chance: u64): Enchantment {
        Enchantment::Vorpal { crit_chance }
    }
}
