import { NextRequest, NextResponse } from 'next/server';
import { executeAuthorizedCombatAction } from '@/lib/shinami/invisibleWallet';

/**
 * POST /api/combat/start
 *
 * Server-authorized action to start combat with an enemy.
 * Uses Shinami Invisible Wallet for gasless execution.
 *
 * Body:
 * - playerAddress: string
 * - enemyType: number (0=skeleton, 1=zombie, 2=ghoul, 3=vampire, 4=lich, 5=boss)
 * - floor: number
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerAddress, enemyType, floor } = body;

    if (!playerAddress || enemyType === undefined || floor === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: playerAddress, enemyType, floor' },
        { status: 400 }
      );
    }

    const result = await executeAuthorizedCombatAction(
      'start_combat',
      playerAddress,
      [enemyType, floor]
    );

    return NextResponse.json({
      success: true,
      txHash: result.hash,
      message: 'Combat started!',
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
