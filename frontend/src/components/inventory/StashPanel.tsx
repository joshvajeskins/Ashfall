'use client';

import type { Item } from '@/types';
import { useStash, useItemActions } from '@/hooks';
import { useUIStore } from '@/stores/uiStore';
import { ItemCard } from './ItemCard';

interface StashPanelProps {
  onClose?: () => void;
}

export function StashPanel({ onClose }: StashPanelProps) {
  const { stash, capacity, maxCapacity, isFull, canAccessStash, isLoading } = useStash();
  const { withdrawFromStash } = useItemActions();
  const { openTransferModal } = useUIStore();

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden w-full max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <h3 className="text-lg font-semibold text-white">Stash</h3>
          <span className={`text-sm ${isFull ? 'text-red-400' : 'text-zinc-500'}`}>
            ({capacity}/{maxCapacity})
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Stash locked warning */}
      {!canAccessStash && (
        <div className="px-4 py-3 bg-red-900/30 border-b border-red-800/50">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-6V7a4 4 0 00-4-4H7a4 4 0 00-4 4v4m0 0l5 5m-5-5l5-5" />
            </svg>
            <p className="text-sm text-red-400">
              Cannot access stash while in dungeon
            </p>
          </div>
        </div>
      )}

      {/* Capacity bar */}
      <div className="px-4 py-2 bg-zinc-800/50 border-b border-zinc-700">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-zinc-500">Capacity</span>
          <span className={isFull ? 'text-red-400' : 'text-zinc-400'}>
            {capacity} / {maxCapacity}
          </span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isFull ? 'bg-red-500' : capacity > maxCapacity * 0.8 ? 'bg-orange-500' : 'bg-green-500'
            }`}
            style={{ width: `${(capacity / maxCapacity) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-zinc-600 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : stash.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-zinc-500">Stash is empty</p>
            <p className="text-xs text-zinc-600 mt-1">
              Deposit items to keep them safe from permadeath
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {stash.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                isStashItem
                onWithdraw={
                  canAccessStash
                    ? () => openTransferModal(item, 'withdraw')
                    : undefined
                }
                disabled={!canAccessStash}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="px-4 py-2 bg-zinc-800/50 border-t border-zinc-700">
        <p className="text-xs text-zinc-500">
          Items in stash are safe from permadeath
        </p>
      </div>
    </div>
  );
}
