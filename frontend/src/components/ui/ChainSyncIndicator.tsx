'use client';

import { useState, useEffect } from 'react';

type SyncStatus = 'synced' | 'syncing' | 'stale' | 'error';

interface ChainSyncIndicatorProps {
  status: SyncStatus;
  lastSync?: Date;
  onRetry?: () => void;
}

export function ChainSyncIndicator({
  status,
  lastSync,
  onRetry
}: ChainSyncIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (!lastSync) return;

    const update = () => {
      const seconds = Math.floor((Date.now() - lastSync.getTime()) / 1000);
      if (seconds < 60) {
        setTimeAgo('Just now');
      } else if (seconds < 3600) {
        setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
      } else {
        setTimeAgo(`${Math.floor(seconds / 3600)}h ago`);
      }
    };

    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, [lastSync]);

  const statusConfig = {
    synced: {
      color: 'bg-green-500',
      text: 'Synced',
      textColor: 'text-green-400'
    },
    syncing: {
      color: 'bg-yellow-500 animate-pulse',
      text: 'Syncing...',
      textColor: 'text-yellow-400'
    },
    stale: {
      color: 'bg-orange-500',
      text: 'Stale',
      textColor: 'text-orange-400'
    },
    error: {
      color: 'bg-red-500',
      text: 'Error',
      textColor: 'text-red-400'
    }
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-full border border-gray-700">
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      <span className={`text-xs font-mono ${config.textColor}`}>
        {config.text}
      </span>
      {lastSync && status === 'synced' && (
        <span className="text-xs text-gray-500 font-mono">{timeAgo}</span>
      )}
      {(status === 'stale' || status === 'error') && onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-blue-400 hover:text-blue-300 font-mono underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}
