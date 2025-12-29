import { create } from 'zustand';

export interface TransactionPayload {
  function: string;
  typeArguments: string[];
  functionArguments: (string | number)[];
}

type SignAndSubmitFn = (payload: TransactionPayload) => Promise<string>;

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  signAndSubmit: SignAndSubmitFn | null;

  // Actions
  setWallet: (address: string | null) => void;
  setConnecting: (isConnecting: boolean) => void;
  setSignAndSubmit: (fn: SignAndSubmitFn | null) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  isConnected: false,
  isConnecting: false,
  signAndSubmit: null,

  setWallet: (address) =>
    set({
      address,
      isConnected: !!address,
      isConnecting: false,
    }),

  setConnecting: (isConnecting) => set({ isConnecting }),

  setSignAndSubmit: (fn) => set({ signAndSubmit: fn }),

  disconnect: () =>
    set({
      address: null,
      isConnected: false,
      isConnecting: false,
      signAndSubmit: null,
    }),
}));
