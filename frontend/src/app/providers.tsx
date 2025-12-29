'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { MOVEMENT_TESTNET_CONFIG } from '@/lib/move/client';
import { ModalContainer } from '@/components/modals';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

export function Providers({ children }: { children: React.ReactNode }) {
  // If no Privy app ID, render children without Privy wrapper
  if (!PRIVY_APP_ID) {
    return (
      <>
        {children}
        <ModalContainer />
      </>
    );
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#ef4444',
          logo: '/logo.png',
        },
        loginMethods: ['email', 'wallet', 'google'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        supportedChains: [
          {
            id: MOVEMENT_TESTNET_CONFIG.chainId,
            name: MOVEMENT_TESTNET_CONFIG.name,
            network: 'movement-testnet',
            nativeCurrency: {
              name: 'MOVE',
              symbol: 'MOVE',
              decimals: 8,
            },
            rpcUrls: {
              default: {
                http: [MOVEMENT_TESTNET_CONFIG.rpcUrl],
              },
            },
          },
        ],
      }}
    >
      {children}
      <ModalContainer />
    </PrivyProvider>
  );
}
