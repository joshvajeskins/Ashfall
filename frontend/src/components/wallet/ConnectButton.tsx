'use client';

import { usePrivy, useLogin } from '@privy-io/react-auth';
import { useCreateWallet } from '@privy-io/react-auth/extended-chains';
import { useEffect, useState, useRef } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { createMovementWallet, getMovementWallet } from '@/lib/privy-movement';

export function ConnectButton() {
  const hasPrivyConfig = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!hasPrivyConfig) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-zinc-800 text-zinc-500 rounded-lg cursor-not-allowed border border-zinc-700"
        title="Privy not configured"
      >
        Wallet
      </button>
    );
  }

  return <PrivyConnectButton />;
}

function PrivyConnectButton() {
  const { ready, authenticated, logout, user } = usePrivy();
  const { createWallet } = useCreateWallet();
  const { setWallet, setConnecting, disconnect } = useWalletStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get Movement wallet from user's linked accounts
  const movementWallet = getMovementWallet(user);

  const { login } = useLogin({
    onComplete: async ({ user: completedUser }) => {
      try {
        setIsCreatingWallet(true);
        await createMovementWallet(completedUser, createWallet);
      } catch (error) {
        console.error('Error creating wallet after login:', error);
      } finally {
        setIsCreatingWallet(false);
      }
    },
    onError: (error) => {
      console.error('Login failed:', error);
      setConnecting(false);
    },
  });

  // Sync wallet state with Zustand store
  useEffect(() => {
    if (authenticated && movementWallet?.address) {
      setWallet(movementWallet.address);
    } else if (!authenticated) {
      disconnect();
    }
  }, [authenticated, movementWallet?.address, setWallet, disconnect]);

  // Auto-create wallet if authenticated but no Movement wallet
  useEffect(() => {
    const ensureWallet = async () => {
      if (authenticated && user && !movementWallet && !isCreatingWallet) {
        setIsCreatingWallet(true);
        try {
          await createMovementWallet(user, createWallet);
        } catch (error) {
          console.error('Error auto-creating wallet:', error);
        } finally {
          setIsCreatingWallet(false);
        }
      }
    };
    ensureWallet();
  }, [authenticated, user, movementWallet, createWallet, isCreatingWallet]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!ready) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-zinc-800 text-zinc-500 rounded-lg cursor-not-allowed border border-zinc-700"
      >
        Loading...
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button
        onClick={() => {
          setConnecting(true);
          login();
        }}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors border border-red-500"
      >
        Connect Wallet
      </button>
    );
  }

  if (isCreatingWallet) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg border border-zinc-700 flex items-center gap-2"
      >
        <span className="animate-spin w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full"></span>
        Creating Wallet...
      </button>
    );
  }

  const displayAddress = movementWallet?.address
    ? `${movementWallet.address.slice(0, 6)}...${movementWallet.address.slice(-4)}`
    : 'No Wallet';

  const handleDisconnect = () => {
    disconnect();
    logout();
    setShowDropdown(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors border border-zinc-700"
      >
        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
        <span>{displayAddress}</span>
        <svg
          className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-zinc-700">
            <p className="text-xs text-zinc-500">Movement Wallet</p>
            <p className="text-sm text-zinc-300 font-mono truncate">
              {movementWallet?.address || 'Not created'}
            </p>
            {user?.email?.address && (
              <p className="text-xs text-zinc-500 mt-1">{user.email.address}</p>
            )}
          </div>
          <button
            onClick={handleDisconnect}
            className="w-full px-4 py-2 text-left text-red-400 hover:bg-zinc-800 transition-colors rounded-b-lg"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
