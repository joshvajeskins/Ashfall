import { NextRequest, NextResponse } from 'next/server';
import { executeAuthorizedDungeonAction } from '@/lib/shinami/invisibleWallet';

/**
 * POST /api/dungeon/start-boss
 *
 * Server-authorized action to start boss encounter on floor 5.
 * Emits BossSpawned event for frontend.
 * Uses Shinami Invisible Wallet for gasless execution.
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

    const result = await executeAuthorizedDungeonAction(
      'start_boss_encounter',
      playerAddress
    );

    return NextResponse.json({
      success: true,
      txHash: result.hash,
      bossName: 'Dungeon Lord',
      message: 'Boss encounter started!',
    });
  } catch (error) {
    console.error('Error starting boss encounter:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start boss encounter',
      },
      { status: 500 }
    );
  }
}
