'use client';

import { useEffect, useCallback, useRef } from 'react';
import { gameEvents, GAME_EVENTS } from '@/game/events/GameEvents';
import { useUIStore } from '@/stores/uiStore';
import { useGameStore } from '@/stores/gameStore';
import type { Item } from '@/types';

interface DeathEventData {
  floor: number;
  itemsLost: Item[];
}

interface LootEventData {
  items: Item[];
}

interface VictoryEventData {
  floorCleared: number;
  enemiesKilled: number;
  timeElapsed: number;
  lootGained: Item[];
}

/**
 * Hook to sync game events with React state and chain transactions.
 * Handles optimistic updates and reverts on failure.
 */
export function useChainEvents() {
  const { openDeathModal, openLootModal, openVictoryModal, addNotification } = useUIStore();
  const { addPendingLoot, incrementKills, die: handleDeath } = useGameStore();

  // Track pending transactions for optimistic updates
  const pendingTransactions = useRef<Map<string, { revert: () => void }>>(new Map());

  const handleShowDeath = useCallback((data: DeathEventData) => {
    openDeathModal(data.floor, data.itemsLost);
  }, [openDeathModal]);

  const handleShowLoot = useCallback((data: LootEventData) => {
    openLootModal(data.items);
  }, [openLootModal]);

  const handleShowVictory = useCallback((data: VictoryEventData) => {
    openVictoryModal(
      {
        floorCleared: data.floorCleared,
        enemiesKilled: data.enemiesKilled,
        timeElapsed: data.timeElapsed,
      },
      data.lootGained
    );
  }, [openVictoryModal]);

  const handleLootPickup = useCallback((data: { item: Item }) => {
    const txId = `loot-${data.item.id}-${Date.now()}`;
    const originalState = { /* capture if needed */ };

    // Optimistic update already handled by LootModal
    // This is where we'd send the chain transaction

    pendingTransactions.current.set(txId, {
      revert: () => {
        // Revert the pickup if chain fails
        addNotification({
          type: 'error',
          message: `Failed to pickup ${data.item.name}`,
          duration: 3000,
        });
      },
    });

    // Simulate chain transaction
    setTimeout(() => {
      pendingTransactions.current.delete(txId);
    }, 1000);
  }, [addNotification]);

  const handleEnemyKilled = useCallback(() => {
    incrementKills();
  }, [incrementKills]);

  const handleDeathConfirmed = useCallback(() => {
    // Death already processed, this is just for logging
    addNotification({
      type: 'info',
      message: 'Death confirmed on chain',
      duration: 2000,
    });
  }, [addNotification]);

  const handleLootTransfer = useCallback((data: { items: Item[] }) => {
    addNotification({
      type: 'success',
      message: `${data.items.length} items transferred to inventory`,
      duration: 3000,
    });
  }, [addNotification]);

  useEffect(() => {
    // UI events from Phaser - cast to any for event emitter compatibility
    gameEvents.on(GAME_EVENTS.UI_SHOW_DEATH, handleShowDeath as (...args: unknown[]) => void);
    gameEvents.on(GAME_EVENTS.UI_SHOW_LOOT, handleShowLoot as (...args: unknown[]) => void);
    gameEvents.on(GAME_EVENTS.UI_SHOW_VICTORY, handleShowVictory as (...args: unknown[]) => void);

    // Game events
    gameEvents.on(GAME_EVENTS.LOOT_PICKUP, handleLootPickup as (...args: unknown[]) => void);
    gameEvents.on(GAME_EVENTS.ENEMY_KILLED, handleEnemyKilled as (...args: unknown[]) => void);
    gameEvents.on(GAME_EVENTS.DEATH_CHAIN_CONFIRMED, handleDeathConfirmed as (...args: unknown[]) => void);
    gameEvents.on(GAME_EVENTS.LOOT_TRANSFER, handleLootTransfer as (...args: unknown[]) => void);

    return () => {
      gameEvents.off(GAME_EVENTS.UI_SHOW_DEATH, handleShowDeath as (...args: unknown[]) => void);
      gameEvents.off(GAME_EVENTS.UI_SHOW_LOOT, handleShowLoot as (...args: unknown[]) => void);
      gameEvents.off(GAME_EVENTS.UI_SHOW_VICTORY, handleShowVictory as (...args: unknown[]) => void);
      gameEvents.off(GAME_EVENTS.LOOT_PICKUP, handleLootPickup as (...args: unknown[]) => void);
      gameEvents.off(GAME_EVENTS.ENEMY_KILLED, handleEnemyKilled as (...args: unknown[]) => void);
      gameEvents.off(GAME_EVENTS.DEATH_CHAIN_CONFIRMED, handleDeathConfirmed as (...args: unknown[]) => void);
      gameEvents.off(GAME_EVENTS.LOOT_TRANSFER, handleLootTransfer as (...args: unknown[]) => void);
    };
  }, [
    handleShowDeath,
    handleShowLoot,
    handleShowVictory,
    handleLootPickup,
    handleEnemyKilled,
    handleDeathConfirmed,
    handleLootTransfer,
  ]);

  return {
    pendingTransactionsCount: pendingTransactions.current.size,
  };
}
