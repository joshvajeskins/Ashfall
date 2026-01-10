'use client';

import dynamic from 'next/dynamic';
import { ModalContainer } from '@/components/modals';
import { TransactionToast } from '@/components/ui/TransactionToast';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

// Dynamically import PrivyProvider with SSR disabled to avoid hydration errors
// caused by Privy's internal invalid HTML nesting (<div> inside <p>)
const PrivyProviderWrapper = dynamic(
  () =>
    import('@privy-io/react-auth').then(({ PrivyProvider }) => {
      return function PrivyWrapper({ children }: { children: React.ReactNode }) {
        return (
          <PrivyProvider
            appId={PRIVY_APP_ID}
            config={{
              appearance: {
                theme: 'dark',
                accentColor: '#ef4444',
                logo: '/ashfall-logo-text.png',
              },
              loginMethods: ['email'],
            }}
          >
            {children}
          </PrivyProvider>
        );
      };
    }),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  // If no Privy app ID, render children without Privy wrapper
  if (!PRIVY_APP_ID) {
    return (
      <>
        {children}
        <ModalContainer />
        <TransactionToast />
      </>
    );
  }

  return (
    <PrivyProviderWrapper>
      {children}
      <ModalContainer />
      <TransactionToast />
    </PrivyProviderWrapper>
  );
}
