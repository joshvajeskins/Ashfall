import { NextResponse } from 'next/server';
import { getServerWalletAddress, isServerAuthorized } from '@/lib/shinami/invisibleWallet';

/**
 * GET /api/shinami/status
 *
 * Check Shinami integration status.
 * Returns server wallet address and configuration status.
 *
 * Useful for:
 * - Verifying Shinami keys are configured
 * - Getting server wallet address for on-chain registration
 * - Debugging integration issues
 */
export async function GET() {
  const status: Record<string, unknown> = {
    gasStation: {
      configured: !!process.env.SHINAMI_GAS_STATION_KEY,
    },
    walletServices: {
      configured: !!process.env.SHINAMI_WALLET_SERVICES_KEY,
    },
    serverWallet: {
      secretConfigured: !!process.env.SHINAMI_SERVER_WALLET_SECRET,
    },
  };

  // Try to get server wallet address if configured
  if (
    process.env.SHINAMI_WALLET_SERVICES_KEY &&
    process.env.SHINAMI_SERVER_WALLET_SECRET
  ) {
    try {
      const address = await getServerWalletAddress();
      const authorized = await isServerAuthorized();

      status.serverWallet = {
        ...status.serverWallet as object,
        address,
        // Note: This address needs to be added to authorized_servers on-chain
        registrationRequired: !authorized,
        registrationCommand: `aptos move run --function-id ${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '<CONTRACT>'}::dungeon::add_server --args address:${address}`,
      };
    } catch (error) {
      status.serverWallet = {
        ...status.serverWallet as object,
        error: error instanceof Error ? error.message : 'Failed to initialize wallet',
      };
    }
  }

  const allConfigured =
    status.gasStation &&
    (status.gasStation as { configured: boolean }).configured &&
    status.walletServices &&
    (status.walletServices as { configured: boolean }).configured &&
    status.serverWallet &&
    (status.serverWallet as { secretConfigured: boolean }).secretConfigured;

  return NextResponse.json({
    status: allConfigured ? 'ready' : 'incomplete',
    services: status,
    documentation: 'https://docs.shinami.com/docs/movement-gas-station',
  });
}
