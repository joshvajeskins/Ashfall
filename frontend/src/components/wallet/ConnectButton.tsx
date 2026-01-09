'use client';

import { usePrivy, useLogin } from '@privy-io/react-auth';
import { useCreateWallet } from '@privy-io/react-auth/extended-chains';
import { useEffect, useState } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { createMovementWallet, getMovementWallet } from '@/lib/privy-movement';
import { aptosClient } from '@/lib/move/client';
import { ImageButton } from '@/components/ui/ImageButton';
import { soundManager } from '@/game/effects/SoundManager';

export function ConnectButton() {
  const hasPrivyConfig = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!hasPrivyConfig) {
    return (
      <button
        disabled
        style={{
          padding: '8px 16px',
          opacity: 0.5,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          border: '2px solid #44403c',
          color: '#9ca3af',
          fontSize: 14,
          cursor: 'not-allowed',
        }}
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
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

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
      soundManager.play('error');
      setConnecting(false);
    },
  });

  useEffect(() => {
    if (authenticated && movementWallet?.address) {
      setWallet(movementWallet.address);
    } else if (!authenticated) {
      disconnect();
    }
  }, [authenticated, movementWallet?.address, setWallet, disconnect]);

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

  useEffect(() => {
    const fetchBalance = async () => {
      if (movementWallet?.address) {
        try {
          const resources = await aptosClient.getAccountResource({
            accountAddress: movementWallet.address,
            resourceType: '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>',
          });
          const coinValue = (resources as { coin: { value: string } }).coin.value;
          const moveBalance = (Number(coinValue) / 1e8).toFixed(4);
          setBalance(moveBalance);
        } catch {
          setBalance('0.0000');
        }
      }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [movementWallet?.address]);

  const handleCopyAddress = async () => {
    if (movementWallet?.address) {
      soundManager.play('buttonClick');
      await navigator.clipboard.writeText(movementWallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    soundManager.play('error');
    setShowDropdown(false);
    disconnect();
    logout();
  };

  if (!ready) {
    return (
      <button
        disabled
        style={{
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          border: '2px solid #44403c',
          color: '#9ca3af',
          fontSize: 14,
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            border: '2px solid #ca8a04',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        Loading...
      </button>
    );
  }

  if (!authenticated) {
    return (
      <ImageButton
        variant="primary"
        size="md"
        onClick={() => {
          setConnecting(true);
          login();
        }}
        style={{ width: 150, height: 65 }}
      >
        Connect
      </ImageButton>
    );
  }

  if (isCreatingWallet) {
    return (
      <button
        disabled
        style={{
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          border: '2px solid #44403c',
          color: '#fef3c7',
          fontSize: 14,
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            border: '2px solid #ca8a04',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        Creating...
      </button>
    );
  }

  const displayAddress = movementWallet?.address
    ? `${movementWallet.address.slice(0, 6)}...${movementWallet.address.slice(-4)}`
    : 'No Wallet';

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => {
          soundManager.play('buttonClick');
          setShowDropdown(!showDropdown);
        }}
        style={{
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          border: '2px solid #44403c',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef4444, #f97316, #eab308)',
          }}
        />
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 11, color: '#fef3c7', fontFamily: 'monospace', textShadow: '1px 1px 0 #000' }}>
            {displayAddress}
          </div>
          <div style={{ fontSize: 15, color: '#9ca3af', fontWeight: 'bold', textShadow: '1px 1px 0 #000' }}>
            {balance !== null ? `${balance} MOVE` : '...'}
          </div>
        </div>
      </button>

      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            width: 220,
            backgroundColor: '#1a1a1a',
            border: '2px solid #44403c',
            zIndex: 100,
          }}
        >
          <div style={{ padding: 12, borderBottom: '1px solid #333' }}>
            <div style={{ fontSize: 12, color: '#fef3c7', marginBottom: 4, textShadow: '1px 1px 0 #000' }}>
              Movement Wallet
            </div>
            <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace', wordBreak: 'break-all', textShadow: '1px 1px 0 #000' }}>
              {movementWallet?.address || 'Not created'}
            </div>
          </div>
          <div style={{ padding: 10, borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: '#9ca3af', textShadow: '1px 1px 0 #000' }}>Balance</span>
            <span style={{ fontSize: 15, color: '#fef3c7', fontWeight: 'bold', textShadow: '1px 1px 0 #000' }}>
              {balance !== null ? `${balance} MOVE` : '...'}
            </span>
          </div>
          <button
            onClick={handleCopyAddress}
            style={{
              width: '100%',
              padding: '8px 12px',
              textAlign: 'left',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#fef3c7',
              fontSize: 12,
              cursor: 'pointer',
              borderBottom: '1px solid #333',
            }}
          >
            {copied ? '✓ Copied!' : '📋 Copy Address'}
          </button>
          <button
            onClick={handleDisconnect}
            style={{
              width: '100%',
              padding: '8px 12px',
              textAlign: 'left',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#f87171',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            🚪 Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
