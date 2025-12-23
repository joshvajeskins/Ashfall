import { NextRequest, NextResponse } from 'next/server';
import { heroService, stashService, dungeonService } from '@/lib/move/client';

/**
 * GET /api/character/sync
 *
 * Fetches full character state from chain before entering dungeon.
 * Consolidates multiple view function calls into a single API response.
 *
 * Query params:
 * - address: string (player wallet address)
 */
export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Missing required query param: address' },
        { status: 400 }
      );
    }

    // Check if character exists first
    const [exists] = await heroService.characterExists(address);
    if (!exists) {
      return NextResponse.json(
        { error: 'Character does not exist', exists: false },
        { status: 404 }
      );
    }

    // Fetch all character data in parallel
    const [
      characterStats,
      baseStats,
      characterClass,
      equipmentIds,
      isAlive,
    ] = await Promise.all([
      heroService.getCharacterStats(address),
      heroService.getBaseStats(address),
      heroService.getCharacterClass(address),
      heroService.getEquipmentIds(address),
      heroService.isCharacterAlive(address),
    ]);

    // Destructure character stats
    // Returns: (level, exp, health, max_health, mana, max_mana, current_floor, is_alive_from_stats)
    const [level, experience, health, maxHealth, mana, maxMana, currentFloor] = characterStats;

    // Destructure base stats
    const [strength, agility, intelligence] = baseStats;

    // Get class name
    const classMap: Record<number, string> = {
      0: 'Warrior',
      1: 'Rogue',
      2: 'Mage',
    };
    const className = classMap[characterClass[0]] || 'Warrior';

    // Destructure equipment IDs
    const [weaponId, armorId, accessoryId] = equipmentIds;

    // Optionally fetch stash data if exists
    let stashData = null;
    try {
      const [stashExists] = await stashService.stashExists(address);
      if (stashExists) {
        const [stashCounts] = await Promise.all([
          stashService.getStashCounts(address),
        ]);
        stashData = {
          weapons: stashCounts[0],
          armors: stashCounts[1],
          accessories: stashCounts[2],
          consumables: stashCounts[3],
          gold: stashCounts[4],
        };
      }
    } catch {
      // Stash might not be initialized
    }

    // Check if already in dungeon
    let dungeonData = null;
    try {
      const [inDungeon] = await dungeonService.isInDungeon(address);
      if (inDungeon) {
        const runStats = await dungeonService.getRunStats(address);
        dungeonData = {
          inDungeon: true,
          dungeonId: runStats[0],
          currentFloor: runStats[1],
          enemiesKilled: runStats[2],
          roomsCleared: runStats[3],
        };
      }
    } catch {
      // Not in dungeon
    }

    return NextResponse.json({
      success: true,
      character: {
        level,
        experience,
        health,
        maxHealth,
        mana,
        maxMana,
        currentFloor,
        isAlive: isAlive[0],
        class: className,
        stats: {
          strength,
          agility,
          intelligence,
        },
        equipment: {
          weaponId,
          armorId,
          accessoryId,
        },
      },
      stash: stashData,
      dungeon: dungeonData,
    });
  } catch (error) {
    console.error('Error syncing character:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync character',
      },
      { status: 500 }
    );
  }
}
