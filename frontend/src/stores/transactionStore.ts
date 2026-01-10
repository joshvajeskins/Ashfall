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
  addTransaction: (action: string, txHash: string, status?: 'pending' | 'success' | 'error') => void;
  removeTransaction: (id: string) => void;
  clearAll: () => void;
}

const EXPLORER_BASE_URL = 'https://explorer.movementnetwork.xyz/txn';

export const getExplorerUrl = (txHash: string) => `${EXPLORER_BASE_URL}/${txHash}?network=testnet`;

export const truncateHash = (hash: string) => {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
};

export const useTransactionStore = create<TransactionStore>((set) => ({
  notifications: [],

  addTransaction: (action, txHash, status = 'success') =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          id: crypto.randomUUID(),
          action,
          txHash,
          status,
          timestamp: Date.now(),
        },
      ],
    })),

  removeTransaction: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearAll: () => set({ notifications: [] }),
}));
