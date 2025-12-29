import { create } from 'zustand';
import type { Item } from '@/types';

type ModalType =
  | 'character-create'
  | 'inventory'
  | 'stash'
  | 'transfer'
  | 'death'
  | 'loot'
  | 'victory'
  | 'settings'
  | null;

type TransferAction = 'deposit' | 'withdraw';

interface TransferState {
  item: Item | null;
  action: TransferAction;
}

interface DeathState {
  floorReached: number;
  itemsLost: Item[];
  isChainConfirmed: boolean;
}

interface LootState {
  items: Item[];
  autoPickup: boolean;
}

interface VictoryState {
  floorCleared: number;
  enemiesKilled: number;
  timeElapsed: number;
  lootGained: Item[];
}

interface UIState {
  // Loading states
  isLoading: boolean;
  loadingMessage: string;

  // Modal states
  activeModal: ModalType;

  // Transfer state
  transferState: TransferState;

  // Death/Loot/Victory states
  deathState: DeathState;
  lootState: LootState;
  victoryState: VictoryState;

  // Game UI states
  showInventory: boolean;
  showMinimap: boolean;
  showStats: boolean;

  // Notifications
  notifications: Notification[];

  // Actions
  setLoading: (isLoading: boolean, message?: string) => void;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
  openTransferModal: (item: Item, action: TransferAction) => void;
  openDeathModal: (floor: number, itemsLost: Item[]) => void;
  setDeathChainConfirmed: () => void;
  openLootModal: (items: Item[]) => void;
  setAutoPickup: (enabled: boolean) => void;
  openVictoryModal: (stats: Omit<VictoryState, 'lootGained'>, loot: Item[]) => void;
  toggleInventory: () => void;
  toggleMinimap: () => void;
  toggleStats: () => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
}

const initialDeathState: DeathState = {
  floorReached: 0,
  itemsLost: [],
  isChainConfirmed: false,
};

const initialLootState: LootState = {
  items: [],
  autoPickup: false,
};

const initialVictoryState: VictoryState = {
  floorCleared: 0,
  enemiesKilled: 0,
  timeElapsed: 0,
  lootGained: [],
};

export const useUIStore = create<UIState>((set) => ({
  isLoading: false,
  loadingMessage: '',
  activeModal: null,
  transferState: { item: null, action: 'deposit' },
  deathState: initialDeathState,
  lootState: initialLootState,
  victoryState: initialVictoryState,
  showInventory: false,
  showMinimap: true,
  showStats: true,
  notifications: [],

  setLoading: (isLoading, message = '') =>
    set({ isLoading, loadingMessage: message }),

  openModal: (modal) => set({ activeModal: modal }),

  closeModal: () => set({
    activeModal: null,
    transferState: { item: null, action: 'deposit' },
    deathState: initialDeathState,
    lootState: initialLootState,
    victoryState: initialVictoryState,
  }),

  openTransferModal: (item, action) =>
    set({ activeModal: 'transfer', transferState: { item, action } }),

  openDeathModal: (floor, itemsLost) =>
    set({
      activeModal: 'death',
      deathState: { floorReached: floor, itemsLost, isChainConfirmed: false },
    }),

  setDeathChainConfirmed: () =>
    set((state) => ({
      deathState: { ...state.deathState, isChainConfirmed: true },
    })),

  openLootModal: (items) =>
    set({ activeModal: 'loot', lootState: { items, autoPickup: false } }),

  setAutoPickup: (enabled) =>
    set((state) => ({ lootState: { ...state.lootState, autoPickup: enabled } })),

  openVictoryModal: (stats, loot) =>
    set({
      activeModal: 'victory',
      victoryState: { ...stats, lootGained: loot },
    }),

  toggleInventory: () =>
    set((state) => ({ showInventory: !state.showInventory })),

  toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),

  toggleStats: () => set((state) => ({ showStats: !state.showStats })),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { ...notification, id: crypto.randomUUID() },
      ],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),
}));
