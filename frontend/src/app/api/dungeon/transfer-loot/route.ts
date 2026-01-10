import { NextRequest, NextResponse } from 'next/server';
import { executeAuthorizedCombatAction } from '@/lib/shinami/invisibleWallet';

/**
 * POST /api/dungeon/transfer-loot
 *
 * Server-authorized action to transfer pending floor loot to stash.
 * This allows players to "bank" their loot mid-dungeon for safety.
 * Uses Shinami Invisible Wallet for gasless execution.
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
      'transfer_floor_loot',
      playerAddress
    );

    return NextResponse.json({
      success: true,
      txHash: result.hash,
      message: 'Floor loot transferred to stash!',
    });
  } catch (error) {
    console.error('Error transferring floor loot:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transfer floor loot',
      },
      { status: 500 }
    );
  }
}
