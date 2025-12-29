'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState, useRef } from 'react';
import { useWalletStore } from '@/stores/walletStore';

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
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { setWallet, setConnecting, disconnect } = useWalletStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync wallet state with Zustand store
  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      setWallet(user.wallet.address);
    } else if (!authenticated) {
      disconnect();
    }
  }, [authenticated, user?.wallet?.address, setWallet, disconnect]);

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

  const displayAddress = user?.wallet?.address
    ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}`
    : 'Connected';

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
            <p className="text-xs text-zinc-500">Connected as</p>
            <p className="text-sm text-zinc-300 font-mono truncate">
              {user?.wallet?.address}
            </p>
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
