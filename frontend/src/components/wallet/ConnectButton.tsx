'use client';

import { usePrivy, useLogin } from '@privy-io/react-auth';
import { useCreateWallet } from '@privy-io/react-auth/extended-chains';
import { useEffect, useState } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { createMovementWallet, getMovementWallet } from '@/lib/privy-movement';
import { aptosClient } from '@/lib/move/client';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Copy, LogOut, Wallet, Check } from 'lucide-react';
import Avatar from 'boring-avatars';

export function ConnectButton() {
  const hasPrivyConfig = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!hasPrivyConfig) {
    return (
      <Button variant="outline" disabled>
        <Wallet className="size-4" />
        Wallet
      </Button>
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

  // Fetch balance
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
      await navigator.clipboard.writeText(movementWallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    logout();
  };

  if (!ready) {
    return (
      <Button variant="outline" disabled>
        <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        Loading...
      </Button>
    );
  }

  if (!authenticated) {
    return (
      <Button
        onClick={() => {
          setConnecting(true);
          login();
        }}
        className="bg-red-600 hover:bg-red-700 text-white border-red-500"
      >
        <Wallet className="size-4" />
        Connect Wallet
      </Button>
    );
  }

  if (isCreatingWallet) {
    return (
      <Button variant="outline" disabled>
        <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        Creating Wallet...
      </Button>
    );
  }

  const displayAddress = movementWallet?.address
    ? `${movementWallet.address.slice(0, 6)}...${movementWallet.address.slice(-4)}`
    : 'No Wallet';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 pl-2 pr-3">
          <Avatar
            size={24}
            name={movementWallet?.address || 'default'}
            variant="beam"
            colors={['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6']}
          />
          <div className="flex flex-col items-start">
            <span className="font-mono text-sm">{displayAddress}</span>
            <span className="text-xs text-muted-foreground">
              {balance !== null ? `${balance} MOVE` : '...'}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            <Avatar
              size={40}
              name={movementWallet?.address || 'default'}
              variant="beam"
              colors={['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6']}
            />
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">Movement Wallet</p>
              <p className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                {movementWallet?.address || 'Not created'}
              </p>
              {user?.email?.address && (
                <p className="text-xs text-muted-foreground">{user.email.address}</p>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Balance</span>
            <span className="text-sm font-medium">
              {balance !== null ? `${balance} MOVE` : 'Loading...'}
            </span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopyAddress} className="cursor-pointer">
          {copied ? (
            <Check className="size-4 text-green-500" />
          ) : (
            <Copy className="size-4" />
          )}
          {copied ? 'Copied!' : 'Copy Address'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDisconnect}
          variant="destructive"
          className="cursor-pointer"
        >
          <LogOut className="size-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
