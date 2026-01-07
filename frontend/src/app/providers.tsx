'use client';

import { PrivyProvider } from '@privy-io/react-auth';
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
        loginMethods: ['email', 'google', 'twitter', 'discord', 'github'],
      }}
    >
      {children}
      <ModalContainer />
    </PrivyProvider>
  );
}
