import { NextRequest, NextResponse } from 'next/server';
import { executeAuthorizedCombatAction } from '@/lib/shinami/invisibleWallet';

/**
 * POST /api/combat/enemy-attack
 *
 * Server-authorized action for enemy to attack player.
 * Uses Shinami Invisible Wallet for gasless execution.
 * ONLY the server can trigger enemy attacks - prevents cheating.
 *
 * Body:
 * - playerAddress: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerAddress } = body;

    if (!playerAddress) {
      return NextResponse.json(
        { error: 'Missing required field: playerAddress' },
        { status: 400 }
      );
    }

    const result = await executeAuthorizedCombatAction(
      'enemy_attack',
      playerAddress
    );

    return NextResponse.json({
      success: true,
      txHash: result.hash,
      message: 'Enemy attacked!',
    });
  } catch (error) {
    console.error('Error executing enemy attack:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute enemy attack',
      },
      { status: 500 }
    );
  }
}
