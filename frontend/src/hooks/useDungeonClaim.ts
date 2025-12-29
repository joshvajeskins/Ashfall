import { useState, useCallback } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { exitDungeonSuccess, type ExitDungeonResponse } from '@/lib/move/dungeonService';

interface UseDungeonClaimReturn {
  claimLoot: () => Promise<boolean>;
  isClaimingLoot: boolean;
  claimError: string | null;
  claimResult: ExitDungeonResponse | null;
  resetClaimState: () => void;
}

export function useDungeonClaim(): UseDungeonClaimReturn {
  const { address } = useWalletStore();
  const [isClaimingLoot, setIsClaimingLoot] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimResult, setClaimResult] = useState<ExitDungeonResponse | null>(null);

  const claimLoot = useCallback(async (): Promise<boolean> => {
    if (!address) {
      setClaimError('Wallet not connected');
      return false;
    }

    setIsClaimingLoot(true);
    setClaimError(null);
    setClaimResult(null);

    try {
      const result = await exitDungeonSuccess(address);

      setClaimResult(result);

      if (!result.success) {
        setClaimError(result.error || 'Failed to claim loot');
        return false;
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to claim loot';
      setClaimError(message);
      return false;
    } finally {
      setIsClaimingLoot(false);
    }
  }, [address]);

  const resetClaimState = useCallback(() => {
    setIsClaimingLoot(false);
    setClaimError(null);
    setClaimResult(null);
  }, []);

  return {
    claimLoot,
    isClaimingLoot,
    claimError,
    claimResult,
    resetClaimState,
  };
}
