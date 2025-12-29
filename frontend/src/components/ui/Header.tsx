'use client';

import { ConnectButton } from '@/components/wallet/ConnectButton';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-red-500">Ashfall</h1>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
            Testnet
          </span>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}
