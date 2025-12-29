'use client';

import { usePrivy } from '@privy-io/react-auth';
import { CharacterSelect } from '@/components/character';
import { useUIStore } from '@/stores/uiStore';

function AuthenticatedHome() {
  const { ready, authenticated, user, login } = usePrivy();
  const { openModal } = useUIStore();

  if (!ready) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-red-500">Ashfall</h1>
          <p className="text-lg text-zinc-400 mt-2">
            A roguelike dungeon crawler with true item ownership.
          </p>
        </div>

        {!authenticated ? (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 text-center">
              <p className="text-zinc-400 mb-4">
                Connect your wallet to begin your adventure.
              </p>
              <button
                onClick={login}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Connect Wallet
              </button>
            </div>
            <Features />
          </div>
        ) : (
          <CharacterSelect
            onSelect={() => {
              // Navigate to dungeon or start game
              console.log('Entering dungeon...');
            }}
            onEquipmentClick={(slot) => {
              openModal('inventory');
              console.log('Open inventory for slot:', slot);
            }}
          />
        )}

        <div className="pt-4 text-center text-xs text-zinc-700">
          Built on Movement Network
        </div>
      </div>
    </div>
  );
}

function Features() {
  return (
    <div className="flex flex-col gap-3 text-sm text-zinc-600">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
        <span>Permadeath - death means losing your items</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
        <span>True ownership - items are on-chain NFTs</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
        <span>Procedural dungeons - every run is unique</span>
      </div>
    </div>
  );
}

function UnconfiguredHome() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-5xl font-bold text-red-500">Ashfall</h1>
        <p className="text-xl text-zinc-400">
          A roguelike dungeon crawler with true item ownership on Movement.
        </p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-left">
          <h2 className="text-lg font-semibold text-zinc-200 mb-3">
            Setup Required
          </h2>
          <p className="text-zinc-400 text-sm mb-4">
            To enable wallet connection, add your Privy App ID:
          </p>
          <code className="block bg-zinc-950 p-3 rounded text-sm text-zinc-300">
            NEXT_PUBLIC_PRIVY_APP_ID=your-app-id
          </code>
          <p className="text-zinc-500 text-xs mt-3">
            Get your App ID from{' '}
            <a
              href="https://dashboard.privy.io"
              className="text-red-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              dashboard.privy.io
            </a>
          </p>
        </div>
        <Features />
        <div className="pt-8 text-xs text-zinc-700">
          Built on Movement Network
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const hasPrivyConfig = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!hasPrivyConfig) {
    return <UnconfiguredHome />;
  }

  return <AuthenticatedHome />;
}
