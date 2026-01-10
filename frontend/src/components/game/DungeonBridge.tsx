'use client';

import { useEffect, useCallback } from 'react';
import { gameEvents, GAME_EVENTS } from '@/game/events/GameEvents';
import { useDungeonTransaction } from '@/hooks/useDungeonTransaction';

/**
 * DungeonBridge - Bridges Phaser dungeon events to React/blockchain transactions
 *
 * Listens to events from Phaser DungeonScene:
 * - DUNGEON_ENTER: Enter dungeon on-chain
 * - FLOOR_COMPLETE: Complete floor on-chain (server)
 * - DUNGEON_COMPLETE: Complete dungeon on-chain (server)
 * - PLAYER_DIED: Handle death on-chain (server)
 * - DUNGEON_EXIT: Exit dungeon on-chain (server)
 *
 * Emits results back:
 * - DUNGEON_TX_SUCCESS: Transaction succeeded
 * - DUNGEON_TX_FAILED: Transaction failed
 */
export function DungeonBridge() {
  const {
    enterDungeon,
    triggerCompleteFloor,
    triggerCompleteBoss,
    triggerPlayerDeath,
    triggerExitDungeon,
    isPending,
  } = useDungeonTransaction();

  // Handle dungeon enter request
  const handleEnterDungeon = useCallback(
    async (data: { dungeonId: number }) => {
      console.log('[DungeonBridge] Entering dungeon on-chain:', data);

      const result = await enterDungeon(data.dungeonId);

      if (result.success) {
        gameEvents.emit(GAME_EVENTS.DUNGEON_ENTER, {
          action: 'enter_dungeon',
          txHash: result.txHash,
          dungeonId: data.dungeonId,
        });
      } else {
        console.error('[DungeonBridge] Failed to enter dungeon:', result.error);
      }
    },
    [enterDungeon]
  );

  // Handle floor complete request
  const handleFloorComplete = useCallback(
    async (data: { floor: number; enemiesKilled: number; xpEarned: number }) => {
      console.log('[DungeonBridge] Completing floor on-chain:', data);

      const result = await triggerCompleteFloor(data.enemiesKilled, data.xpEarned);

      if (result.success) {
        gameEvents.emit(GAME_EVENTS.FLOOR_COMPLETE, {
          action: 'complete_floor',
          txHash: result.txHash,
          floor: data.floor,
        });
      } else {
        console.error('[DungeonBridge] Failed to complete floor:', result.error);
      }
    },
    [triggerCompleteFloor]
  );

  // Handle boss defeat request
  const handleBossDefeated = useCallback(
    async (data: { xpEarned: number }) => {
      console.log('[DungeonBridge] Completing boss on-chain:', data);

      const result = await triggerCompleteBoss(data.xpEarned);

      if (result.success) {
        gameEvents.emit(GAME_EVENTS.BOSS_DEFEATED, {
          action: 'complete_boss',
          txHash: result.txHash,
        });
      } else {
        console.error('[DungeonBridge] Failed to complete boss:', result.error);
      }
    },
    [triggerCompleteBoss]
  );

  // Handle player death request
  const handlePlayerDied = useCallback(async () => {
    console.log('[DungeonBridge] Processing player death on-chain');

    const result = await triggerPlayerDeath();

    if (result.success) {
      gameEvents.emit(GAME_EVENTS.DEATH_CHAIN_CONFIRMED, {
        action: 'player_died',
        txHash: result.txHash,
      });
      gameEvents.emit(GAME_EVENTS.DEATH_COMPLETE, {});
    } else {
      console.error('[DungeonBridge] Failed to process death:', result.error);
    }
  }, [triggerPlayerDeath]);

  // Handle dungeon victory/exit request
  const handleDungeonVictory = useCallback(async () => {
    console.log('[DungeonBridge] Exiting dungeon successfully on-chain');

    const result = await triggerExitDungeon();

    if (result.success) {
      gameEvents.emit(GAME_EVENTS.VICTORY_COMPLETE, {
        action: 'exit_dungeon',
        txHash: result.txHash,
      });
    } else {
      console.error('[DungeonBridge] Failed to exit dungeon:', result.error);
    }
  }, [triggerExitDungeon]);

  // Subscribe to game events
  useEffect(() => {
    gameEvents.on(
      GAME_EVENTS.UI_ENTER_DUNGEON,
      handleEnterDungeon as (...args: unknown[]) => void
    );
    gameEvents.on(
      GAME_EVENTS.ROOM_CLEAR,
      handleFloorComplete as (...args: unknown[]) => void
    );
    gameEvents.on(
      GAME_EVENTS.REQUEST_BOSS_LOOT,
      handleBossDefeated as (...args: unknown[]) => void
    );
    gameEvents.on(
      GAME_EVENTS.PLAYER_DIED,
      handlePlayerDied as (...args: unknown[]) => void
    );
    gameEvents.on(
      GAME_EVENTS.DUNGEON_VICTORY,
      handleDungeonVictory as (...args: unknown[]) => void
    );

    return () => {
      gameEvents.off(
        GAME_EVENTS.UI_ENTER_DUNGEON,
        handleEnterDungeon as (...args: unknown[]) => void
      );
      gameEvents.off(
        GAME_EVENTS.ROOM_CLEAR,
        handleFloorComplete as (...args: unknown[]) => void
      );
      gameEvents.off(
        GAME_EVENTS.REQUEST_BOSS_LOOT,
        handleBossDefeated as (...args: unknown[]) => void
      );
      gameEvents.off(
        GAME_EVENTS.PLAYER_DIED,
        handlePlayerDied as (...args: unknown[]) => void
      );
      gameEvents.off(
        GAME_EVENTS.DUNGEON_VICTORY,
        handleDungeonVictory as (...args: unknown[]) => void
      );
    };
  }, [
    handleEnterDungeon,
    handleFloorComplete,
    handleBossDefeated,
    handlePlayerDied,
    handleDungeonVictory,
  ]);

  // Show pending indicator (optional - could render a loading overlay)
  if (isPending) {
    // Transaction in progress - game should show loading state
  }

  return null; // This is a logic-only component
}
