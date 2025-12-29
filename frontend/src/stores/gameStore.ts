import { create } from 'zustand';
import type { Character, Item, DungeonRun, DungeonLayout, Room } from '@/types';

interface GameState {
  // Character state
  character: Character | null;
  inventory: Item[];
  stash: Item[];

  // Dungeon state
  isInDungeon: boolean;
  currentRun: DungeonRun | null;
  dungeonLayout: DungeonLayout | null;
  currentRoomId: number;

  // Pending loot (during dungeon run, not yet permanent)
  pendingLoot: Item[];

  // Actions
  setCharacter: (character: Character | null) => void;
  updateCharacter: (updates: Partial<Character>) => void;
  setInventory: (items: Item[]) => void;
  addToInventory: (item: Item) => void;
  removeFromInventory: (itemId: number) => void;
  setStash: (items: Item[]) => void;
  enterDungeon: (dungeonId: number) => void;
  exitDungeon: () => void;
  exitDungeonSuccess: () => void;
  updateDungeonRun: (updates: Partial<DungeonRun>) => void;
  setDungeonLayout: (layout: DungeonLayout) => void;
  setCurrentRoom: (roomId: number) => void;
  clearRoom: (floorNumber: number, roomId: number) => void;
  addPendingLoot: (item: Item) => void;
  clearPendingLoot: () => void;
  transferPendingToInventory: () => void;
  incrementKills: () => void;
  die: () => void;
  reset: () => void;
}

const initialState = {
  character: null,
  inventory: [],
  stash: [],
  isInDungeon: false,
  currentRun: null,
  dungeonLayout: null,
  currentRoomId: 0,
  pendingLoot: [],
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setCharacter: (character) => set({ character }),

  updateCharacter: (updates) =>
    set((state) => ({
      character: state.character ? { ...state.character, ...updates } : null,
    })),

  setInventory: (items) => set({ inventory: items }),

  addToInventory: (item) =>
    set((state) => ({ inventory: [...state.inventory, item] })),

  removeFromInventory: (itemId) =>
    set((state) => ({
      inventory: state.inventory.filter((i) => i.id !== itemId),
    })),

  setStash: (items) => set({ stash: items }),

  enterDungeon: (dungeonId) =>
    set({
      isInDungeon: true,
      currentRun: {
        dungeonId,
        currentFloor: 1,
        roomsCleared: 0,
        enemiesKilled: 0,
        itemsFound: [],
        startedAt: Date.now(),
      },
    }),

  exitDungeon: () =>
    set({
      isInDungeon: false,
      currentRun: null,
      dungeonLayout: null,
      currentRoomId: 0,
      pendingLoot: [],
    }),

  exitDungeonSuccess: () =>
    set((state) => ({
      isInDungeon: false,
      currentRun: null,
      dungeonLayout: null,
      currentRoomId: 0,
      inventory: [...state.inventory, ...state.pendingLoot],
      pendingLoot: [],
    })),

  updateDungeonRun: (updates) =>
    set((state) => ({
      currentRun: state.currentRun ? { ...state.currentRun, ...updates } : null,
    })),

  setDungeonLayout: (layout) => set({ dungeonLayout: layout }),

  setCurrentRoom: (roomId) => set({ currentRoomId: roomId }),

  clearRoom: (floorNumber, roomId) =>
    set((state) => {
      if (!state.dungeonLayout) return {};
      const floors = state.dungeonLayout.floors.map((floor) => {
        if (floor.floorNumber !== floorNumber) return floor;
        return {
          ...floor,
          rooms: floor.rooms.map((room) =>
            room.id === roomId ? { ...room, cleared: true } : room
          ),
        };
      });
      return {
        dungeonLayout: { ...state.dungeonLayout, floors },
        currentRun: state.currentRun
          ? { ...state.currentRun, roomsCleared: state.currentRun.roomsCleared + 1 }
          : null,
      };
    }),

  addPendingLoot: (item) =>
    set((state) => ({
      pendingLoot: [...state.pendingLoot, item],
      currentRun: state.currentRun
        ? { ...state.currentRun, itemsFound: [...state.currentRun.itemsFound, item] }
        : null,
    })),

  clearPendingLoot: () => set({ pendingLoot: [] }),

  transferPendingToInventory: () =>
    set((state) => ({
      inventory: [...state.inventory, ...state.pendingLoot],
      pendingLoot: [],
    })),

  incrementKills: () =>
    set((state) => ({
      currentRun: state.currentRun
        ? { ...state.currentRun, enemiesKilled: state.currentRun.enemiesKilled + 1 }
        : null,
    })),

  die: () =>
    set((state) => ({
      character: state.character
        ? { ...state.character, isAlive: false }
        : null,
      inventory: [],
      pendingLoot: [],
      isInDungeon: false,
      currentRun: null,
      dungeonLayout: null,
      currentRoomId: 0,
    })),

  reset: () => set(initialState),
}));
