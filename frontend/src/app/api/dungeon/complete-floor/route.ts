import { NextRequest, NextResponse } from 'next/server';
import { executeAuthorizedDungeonAction } from '@/lib/shinami/invisibleWallet';

/**
 * POST /api/dungeon/complete-floor
 *
 * Server-authorized action to complete a dungeon floor.
 * Uses Shinami Invisible Wallet for gasless execution.
 *
 * Required: Server wallet must be registered as authorized_server on-chain.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerAddress, enemiesKilled, xpEarned } = body;

    if (!playerAddress) {
      return NextResponse.json(
        { error: 'Missing required field: playerAddress' },
        { status: 400 }
      );
    }

    // Default values if not provided
    const kills = enemiesKilled ?? 3;
    const xp = xpEarned ?? 50;

    const result = await executeAuthorizedDungeonAction(
      'complete_floor',
      playerAddress,
      [kills, xp]
    );

    return NextResponse.json({
      success: true,
      txHash: result.hash,
      floor: 'completed',
      enemiesKilled: kills,
      xpAwarded: xp,
    });
  } catch (error) {
    console.error('Error completing floor:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete floor',
      },
      { status: 500 }
    );
  }
}
