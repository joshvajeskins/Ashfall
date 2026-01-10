import { create } from 'zustand';

export interface TransactionNotification {
  id: string;
  action: string;
  txHash: string;
  status: 'pending' | 'success' | 'error';
  timestamp: number;
}

interface TransactionStore {
  notifications: TransactionNotification[];
  addPendingTransaction: (action: string, txHash: string) => string;
  confirmTransaction: (id: string) => void;
  failTransaction: (id: string) => void;
  removeTransaction: (id: string) => void;
  clearAll: () => void;
}

const EXPLORER_BASE_URL = 'https://explorer.movementnetwork.xyz/txn';
const RPC_URL = 'https://testnet.movementnetwork.xyz/v1';

export const getExplorerUrl = (txHash: string) => `${EXPLORER_BASE_URL}/${txHash}?network=testnet`;

export const truncateHash = (hash: string) => {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
};

export async function waitForTransaction(txHash: string): Promise<boolean> {
  const maxAttempts = 30;
  const pollInterval = 1000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${RPC_URL}/transactions/by_hash/${txHash}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success !== undefined) {
          return data.success;
        }
      }
    } catch {
      // Continue polling
    }
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
  return false;
}

export const useTransactionStore = create<TransactionStore>((set) => ({
  notifications: [],

  addPendingTransaction: (action, txHash) => {
    const id = crypto.randomUUID();
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          id,
          action,
          txHash,
          status: 'pending',
          timestamp: Date.now(),
        },
      ],
    }));
    return id;
  },

  confirmTransaction: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, status: 'success' as const } : n
      ),
    })),

  failTransaction: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, status: 'error' as const } : n
      ),
    })),

  removeTransaction: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearAll: () => set({ notifications: [] }),
}));

// Helper hook for adding transaction with auto-confirmation
export function useAddTransaction() {
  const { addPendingTransaction, confirmTransaction, failTransaction, removeTransaction } =
    useTransactionStore();

  return async (action: string, txHash: string) => {
    const id = addPendingTransaction(action, txHash);

    // Poll for confirmation in background
    waitForTransaction(txHash).then((success) => {
      if (success) {
        confirmTransaction(id);
        // Auto-remove after 4 seconds once confirmed
        setTimeout(() => removeTransaction(id), 4000);
      } else {
        failTransaction(id);
        // Auto-remove failed after 6 seconds
        setTimeout(() => removeTransaction(id), 6000);
      }
    });

    return id;
  };
}
