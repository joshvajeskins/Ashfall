import { NextRequest, NextResponse } from 'next/server';
import { executeAuthorizedDungeonAction } from '@/lib/shinami/invisibleWallet';

/**
 * POST /api/dungeon/complete-boss
 *
 * Server-authorized action to complete boss floor and defeat boss.
 * Uses Shinami Invisible Wallet for gasless execution.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerAddress, xpEarned } = body;

    if (!playerAddress) {
      return NextResponse.json(
        { error: 'Missing required field: playerAddress' },
        { status: 400 }
      );
    }

    // Boss gives more XP
    const xp = xpEarned ?? 200;

    const result = await executeAuthorizedDungeonAction(
      'complete_boss_floor',
      playerAddress,
      [xp]
    );

    return NextResponse.json({
      success: true,
      txHash: result.hash,
      bossDefeated: true,
      xpAwarded: xp,
    });
  } catch (error) {
    console.error('Error completing boss:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete boss',
      },
      { status: 500 }
    );
  }
}
