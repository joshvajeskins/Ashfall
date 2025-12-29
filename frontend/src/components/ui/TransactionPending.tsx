'use client';

import { LoadingSpinner } from './LoadingSpinner';

interface TransactionPendingProps {
  message?: string;
  subMessage?: string;
}

export function TransactionPending({
  message = 'Confirming transaction...',
  subMessage = 'Please wait while the blockchain confirms your action'
}: TransactionPendingProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-sm w-full mx-4 text-center">
        <div className="flex justify-center mb-4">
          <LoadingSpinner size="lg" />
        </div>
        <h3 className="text-xl font-mono text-white mb-2">{message}</h3>
        <p className="text-sm text-gray-400 font-mono">{subMessage}</p>

        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          <span className="text-xs text-yellow-500 font-mono">
            Transaction in progress
          </span>
        </div>
      </div>
    </div>
  );
}
