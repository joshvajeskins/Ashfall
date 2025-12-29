'use client';

import { useState } from 'react';
import type { Item } from '@/types';
import { useItemActions } from '@/hooks';
import { ItemTooltip } from './ItemTooltip';

type TransferAction = 'deposit' | 'withdraw';

interface TransferModalProps {
  item: Item;
  action: TransferAction;
  onClose: () => void;
  onComplete?: () => void;
}

const RARITY_BORDER: Record<Item['rarity'], string> = {
  Common: 'border-zinc-600',
  Uncommon: 'border-green-500',
  Rare: 'border-blue-500',
  Epic: 'border-purple-500',
  Legendary: 'border-orange-500',
};

export function TransferModal({ item, action, onClose, onComplete }: TransferModalProps) {
  const { depositToStash, withdrawFromStash, isLoading } = useItemActions();
  const [error, setError] = useState<string | null>(null);

  const isDeposit = action === 'deposit';
  const title = isDeposit ? 'Deposit to Stash' : 'Withdraw from Stash';
  const description = isDeposit
    ? 'This item will be moved to your stash where it will be safe from permadeath.'
    : 'This item will be moved to your inventory.';

  const handleConfirm = async () => {
    setError(null);
    const success = isDeposit
      ? await depositToStash(item)
      : await withdrawFromStash(item);

    if (success) {
      onComplete?.();
      onClose();
    } else {
      setError(`Failed to ${action} item`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white transition-colors"
            disabled={isLoading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Item preview */}
          <div className="flex justify-center">
            <div className={`p-4 border-2 ${RARITY_BORDER[item.rarity]} rounded-lg bg-zinc-800/50`}>
              <ItemTooltip item={item} />
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-zinc-400 text-center">
            {description}
          </p>

          {/* Warning for equipped items */}
          {isDeposit && item.isEquipped && (
            <div className="flex items-center gap-2 p-3 bg-orange-900/30 border border-orange-800/50 rounded-lg">
              <svg className="w-5 h-5 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-orange-300">
                This item is currently equipped. It will be unequipped when deposited.
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-800/50 rounded-lg">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-4 py-3 border-t border-zinc-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`
              flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors
              ${isDeposit
                ? 'text-white bg-blue-600 hover:bg-blue-500'
                : 'text-white bg-green-600 hover:bg-green-500'}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              `Confirm ${action === 'deposit' ? 'Deposit' : 'Withdraw'}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
