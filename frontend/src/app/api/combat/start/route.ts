import { NextRequest, NextResponse } from 'next/server';
import { executeAuthorizedCombatAction } from '@/lib/shinami/invisibleWallet';
import { combatService, heroService } from '@/lib/move/client';

/**
 * POST /api/combat/start
 *
 * Server-authorized action to start combat with an enemy.
 * Uses Shinami Invisible Wallet for gasless execution.
 *
 * Returns initial enemy intent and enemy health (for fled enemy persistence).
 *
 * Body:
 * - playerAddress: string
 * - enemyType: number (0=skeleton, 1=zombie, 2=ghoul, 3=vampire, 4=lich, 5=boss)
 * - floor: number
 * - roomId: number (for enemy health persistence on flee)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerAddress, enemyType, floor, roomId = 0 } = body;

    if (!playerAddress || enemyType === undefined || floor === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: playerAddress, enemyType, floor' },
        { status: 400 }
      );
    }

    // Check if player is already in an active combat
    try {
      const [isInCombat] = await combatService.isInCombat(playerAddress);
      if (isInCombat) {
        // Get current combat state for debugging
        const [enemyHealth, enemyMaxHealth, turn, isActive] = await combatService.getCombatState(playerAddress);
        console.log(`[combat/start] Player ${playerAddress} already in combat:`, { enemyHealth, enemyMaxHealth, turn, isActive });

        return NextResponse.json(
          {
            success: false,
            error: 'Already in combat. Please finish or flee from your current combat first.',
            alreadyInCombat: true,
            combatState: { enemyHealth, enemyMaxHealth, turn, isActive }
          },
          { status: 409 }
        );
      }
    } catch (checkError) {
      // If check fails, proceed anyway - the contract will enforce
      console.log('[combat/start] Could not check combat status, proceeding:', checkError);
    }

    const result = await executeAuthorizedCombatAction(
      'start_combat',
      playerAddress,
      [enemyType, floor, roomId]
    );

    // Fetch initial combat state including enemy intent, enemy health, and player stats
    let enemyIntent = 0;
    let enemyHealth = 0;
    let enemyMaxHealth = 0;
    let playerHealth = 0;
    let playerMaxHealth = 0;
    let playerMana = 0;
    let playerMaxMana = 0;
    try {
      const [enemyIntent_] = await combatService.getEnemyIntent(playerAddress);
      enemyIntent = enemyIntent_;
      const [health, maxHealth] = await combatService.getCombatState(playerAddress);
      enemyHealth = health;
      enemyMaxHealth = maxHealth;
      // Fetch player stats for mana sync
      const [, , hp, maxHp, mana, maxMana] = await heroService.getCharacterStats(playerAddress);
      playerHealth = hp;
      playerMaxHealth = maxHp;
      playerMana = mana;
      playerMaxMana = maxMana;
    } catch {
      // Fallback - use defaults
    }

    return NextResponse.json({
      success: true,
      txHash: result.hash,
      message: 'Combat started!',
      enemyIntent,
      enemyHealth,
      enemyMaxHealth,
      playerHealth,
      playerMaxHealth,
      playerMana,
      playerMaxMana,
    });
  } catch (error) {
    console.error('Error starting combat:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start combat',
      },
      { status: 500 }
    );
  }
}
