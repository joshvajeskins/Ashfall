import { NextResponse } from 'next/server';
import { getServerWalletAddress, isServerAuthorized } from '@/lib/shinami/invisibleWallet';
import { CONTRACT_ADDRESS } from '@/lib/contract';

/**
 * GET /api/shinami/status
 *
 * Check Shinami integration status.
 * Returns server wallet address and configuration status.
 *
 * Useful for:
 * - Verifying Shinami key is configured
 * - Getting server wallet address for on-chain registration
 * - Debugging integration issues
 */
export async function GET() {
  const shinamiKeyConfigured = !!process.env.SHINAMI_KEY;
  const serverSecretConfigured = !!process.env.SHINAMI_SERVER_WALLET_SECRET;

  const status: Record<string, unknown> = {
    shinamiKey: {
      configured: shinamiKeyConfigured,
    },
    serverWallet: {
      secretConfigured: serverSecretConfigured,
    },
  };

  // Try to get server wallet address if configured
  if (shinamiKeyConfigured && serverSecretConfigured) {
    try {
      const address = await getServerWalletAddress();
      const authorized = await isServerAuthorized();

      status.serverWallet = {
        ...status.serverWallet as object,
        address,
        // Note: This address needs to be added to authorized_servers on-chain
        registrationRequired: !authorized,
        registrationCommand: `aptos move run --function-id ${CONTRACT_ADDRESS}::dungeon::add_server --args address:${address}`,
      };
    } catch (error) {
      status.serverWallet = {
        ...status.serverWallet as object,
        error: error instanceof Error ? error.message : 'Failed to initialize wallet',
      };
    }
  }

  const allConfigured = shinamiKeyConfigured && serverSecretConfigured;

  return NextResponse.json({
    status: allConfigured ? 'ready' : 'incomplete',
    services: status,
    documentation: 'https://docs.shinami.com/docs/movement-gas-station',
  });
}
