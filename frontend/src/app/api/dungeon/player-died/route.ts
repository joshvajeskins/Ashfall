import { NextRequest, NextResponse } from 'next/server';
import { executeAuthorizedDungeonAction } from '@/lib/shinami/invisibleWallet';

/**
 * POST /api/dungeon/player-died
 *
 * Server-authorized action when player dies in dungeon.
 * BURNS all pending loot and equipped items (permadeath).
 * Uses Shinami Invisible Wallet for gasless execution.
 *
 * This is called by the game server when player HP reaches 0.
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
      'player_died',
      playerAddress
    );

    return NextResponse.json({
      success: true,
      txHash: result.hash,
      permadeath: true,
      message: 'Character died. All equipped items and pending loot have been burned.',
    });
  } catch (error) {
    console.error('Error processing player death:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process player death',
      },
      { status: 500 }
    );
  }
}
