import { NextRequest, NextResponse } from 'next/server';
import { executeAuthorizedDungeonAction } from '@/lib/shinami/invisibleWallet';

/**
 * POST /api/dungeon/exit-success
 *
 * Server-authorized action to successfully exit dungeon and claim loot.
 * Transfers all pending loot to player's stash.
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
      'exit_dungeon_success',
      playerAddress
    );

    return NextResponse.json({
      success: true,
      txHash: result.hash,
      itemsClaimed: {
        // These would ideally be parsed from transaction events
        weapons: 0,
        armors: 0,
        accessories: 0,
        gold: 0,
      },
    });
  } catch (error) {
    console.error('Error exiting dungeon:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to exit dungeon',
      },
      { status: 500 }
    );
  }
}
