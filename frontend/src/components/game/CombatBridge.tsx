'use client';

import { useEffect, useCallback, useRef } from 'react';
import { gameEvents, GAME_EVENTS } from '@/game/events/GameEvents';
import { useCombatTransaction } from '@/hooks/useCombatTransaction';

/**
 * CombatBridge - Bridges Phaser game events to React/blockchain transactions
 *
 * Listens to events from Phaser CombatScene:
 * - COMBAT_START_REQUEST: Start combat on-chain
 * - PLAYER_ATTACK_REQUEST: Player attacks (user wallet)
 * - PLAYER_FLEE_REQUEST: Player flees (user wallet)
 * - ENEMY_ATTACK_REQUEST: Enemy attacks (server wallet)
 *
 * Emits results back:
 * - COMBAT_TX_SUCCESS: Transaction succeeded
 * - COMBAT_TX_FAILED: Transaction failed
 */
export function CombatBridge() {
  const {
    initiateCombat,
    playerAttack,
    playerFlee,
    playerDefend,
    playerHeavyAttack,
    playerHeal,
    triggerEnemyAttack,
    pickupItem,
    isPending,
  } = useCombatTransaction();

  // Guard against duplicate enemy attack requests
  const enemyAttackInProgress = useRef(false);

  // Handle combat start request
  const handleCombatStartRequest = useCallback(
    async (data: { enemyType: number; floor: number; roomId: number }) => {
      console.log('[CombatBridge] Starting combat on-chain:', data);

      // Reset enemy attack guard for new combat
      enemyAttackInProgress.current = false;

      const result = await initiateCombat(data.enemyType, data.floor, data.roomId);

      if (result.success) {
        gameEvents.emit(GAME_EVENTS.COMBAT_TX_SUCCESS, {
          action: 'start_combat',
          txHash: result.txHash,
          enemyIntent: result.enemyIntent, // Pass on-chain intent
          combatState: result.combatState, // Pass enemy health (for fled enemy persistence)
          playerStats: {
            health: result.playerHealth,
            maxHealth: result.playerMaxHealth,
            mana: result.playerMana,
            maxMana: result.playerMaxMana,
          },
        });
      } else if (result.alreadyInCombat && result.combatState) {
        // Already in combat - emit success with existing state to resume combat
        console.log('[CombatBridge] Already in combat, resuming with existing state:', result.combatState);
        gameEvents.emit(GAME_EVENTS.COMBAT_TX_SUCCESS, {
          action: 'start_combat',
          txHash: 'resumed', // Indicate this is a resumed combat
          enemyIntent: result.enemyIntent,
          combatState: result.combatState,
          resumed: true,
        });
      } else {
        gameEvents.emit(GAME_EVENTS.COMBAT_TX_FAILED, {
          action: 'start_combat',
          error: result.error,
        });
      }
    },
    [initiateCombat]
  );

  // Handle player attack request
  const handlePlayerAttackRequest = useCallback(async () => {
    console.log('[CombatBridge] Player attacking on-chain');

    const result = await playerAttack();

    if (result.success) {
      gameEvents.emit(GAME_EVENTS.COMBAT_TX_SUCCESS, {
        action: 'player_attack',
        txHash: result.txHash,
        combatState: result.combatState, // Include on-chain combat state
      });
    } else {
      gameEvents.emit(GAME_EVENTS.COMBAT_TX_FAILED, {
        action: 'player_attack',
        error: result.error,
      });
    }
  }, [playerAttack]);

  // Handle player flee request
  const handlePlayerFleeRequest = useCallback(async () => {
    console.log('[CombatBridge] Player fleeing on-chain');

    const result = await playerFlee();

    if (result.success) {
      gameEvents.emit(GAME_EVENTS.COMBAT_TX_SUCCESS, {
        action: 'flee',
        txHash: result.txHash,
      });
    } else {
      gameEvents.emit(GAME_EVENTS.COMBAT_TX_FAILED, {
        action: 'flee',
        error: result.error,
      });
    }
  }, [playerFlee]);

  // Handle enemy attack request - with deduplication guard
  const handleEnemyAttackRequest = useCallback(async () => {
    // Prevent duplicate enemy attack requests
    if (enemyAttackInProgress.current) {
      console.log('[CombatBridge] Enemy attack already in progress, ignoring duplicate request');
      return;
    }

    enemyAttackInProgress.current = true;
    console.log('[CombatBridge] Enemy attacking on-chain');

    try {
      const result = await triggerEnemyAttack();

      if (result.success) {
        gameEvents.emit(GAME_EVENTS.COMBAT_TX_SUCCESS, {
          action: 'enemy_attack',
          txHash: result.txHash,
          enemyIntent: result.enemyIntent, // Pass on-chain intent for next turn
        });
      } else {
        gameEvents.emit(GAME_EVENTS.COMBAT_TX_FAILED, {
          action: 'enemy_attack',
          error: result.error,
        });
      }
    } finally {
      enemyAttackInProgress.current = false;
    }
  }, [triggerEnemyAttack]);

  // Handle player defend request
  const handlePlayerDefendRequest = useCallback(async () => {
    console.log('[CombatBridge] Player defending on-chain');

    const result = await playerDefend();

    if (result.success) {
      gameEvents.emit(GAME_EVENTS.COMBAT_TX_SUCCESS, {
        action: 'player_defend',
        txHash: result.txHash,
      });
    } else {
      gameEvents.emit(GAME_EVENTS.COMBAT_TX_FAILED, {
        action: 'player_defend',
        error: result.error,
      });
    }
  }, [playerDefend]);

  // Handle player heavy attack request
  const handlePlayerHeavyAttackRequest = useCallback(async () => {
    console.log('[CombatBridge] Player heavy attacking on-chain');

    const result = await playerHeavyAttack();

    if (result.success) {
      gameEvents.emit(GAME_EVENTS.COMBAT_TX_SUCCESS, {
        action: 'player_heavy_attack',
        txHash: result.txHash,
        combatState: result.combatState, // Include on-chain combat state
      });
    } else {
      gameEvents.emit(GAME_EVENTS.COMBAT_TX_FAILED, {
        action: 'player_heavy_attack',
        error: result.error,
      });
    }
  }, [playerHeavyAttack]);

  // Handle player heal request
  const handlePlayerHealRequest = useCallback(async () => {
    console.log('[CombatBridge] Player healing on-chain');

    const result = await playerHeal();

    if (result.success) {
      gameEvents.emit(GAME_EVENTS.COMBAT_TX_SUCCESS, {
        action: 'player_heal',
        txHash: result.txHash,
      });
    } else {
      gameEvents.emit(GAME_EVENTS.COMBAT_TX_FAILED, {
        action: 'player_heal',
        error: result.error,
      });
    }
  }, [playerHeal]);

  // Handle item pickup request
  const handleItemPickupRequest = useCallback(
    async (data: {
      itemType: number; // 0=weapon, 1=armor, 2=accessory, 3=consumable
      floor: number;
      enemyTier?: number;
      consumableType?: number;
      power?: number;
    }) => {
      console.log('[CombatBridge] Picking up item on-chain:', data);

      const result = await pickupItem(
        data.itemType,
        data.floor,
        data.enemyTier || 1,
        data.consumableType || 0,
        data.power || 50
      );

      if (result.success) {
        gameEvents.emit(GAME_EVENTS.ITEM_PICKUP_TX_SUCCESS, {
          itemType: data.itemType,
          txHash: result.txHash,
        });
      } else {
        gameEvents.emit(GAME_EVENTS.ITEM_PICKUP_TX_FAILED, {
          itemType: data.itemType,
          error: result.error,
        });
      }
    },
    [pickupItem]
  );

  // Subscribe to game events
  useEffect(() => {
    gameEvents.on(
      GAME_EVENTS.COMBAT_START_REQUEST,
      handleCombatStartRequest as (...args: unknown[]) => void
    );
    gameEvents.on(
      GAME_EVENTS.PLAYER_ATTACK_REQUEST,
      handlePlayerAttackRequest as (...args: unknown[]) => void
    );
    gameEvents.on(
      GAME_EVENTS.PLAYER_FLEE_REQUEST,
      handlePlayerFleeRequest as (...args: unknown[]) => void
    );
    gameEvents.on(
      GAME_EVENTS.ENEMY_ATTACK_REQUEST,
      handleEnemyAttackRequest as (...args: unknown[]) => void
    );
    gameEvents.on(
      GAME_EVENTS.PLAYER_DEFEND_REQUEST,
      handlePlayerDefendRequest as (...args: unknown[]) => void
    );
    gameEvents.on(
      GAME_EVENTS.PLAYER_HEAVY_ATTACK_REQUEST,
      handlePlayerHeavyAttackRequest as (...args: unknown[]) => void
    );
    gameEvents.on(
      GAME_EVENTS.PLAYER_HEAL_REQUEST,
      handlePlayerHealRequest as (...args: unknown[]) => void
    );
    gameEvents.on(
      GAME_EVENTS.ITEM_PICKUP_REQUEST,
      handleItemPickupRequest as (...args: unknown[]) => void
    );

    return () => {
      gameEvents.off(
        GAME_EVENTS.COMBAT_START_REQUEST,
        handleCombatStartRequest as (...args: unknown[]) => void
      );
      gameEvents.off(
        GAME_EVENTS.PLAYER_ATTACK_REQUEST,
        handlePlayerAttackRequest as (...args: unknown[]) => void
      );
      gameEvents.off(
        GAME_EVENTS.PLAYER_FLEE_REQUEST,
        handlePlayerFleeRequest as (...args: unknown[]) => void
      );
      gameEvents.off(
        GAME_EVENTS.ENEMY_ATTACK_REQUEST,
        handleEnemyAttackRequest as (...args: unknown[]) => void
      );
      gameEvents.off(
        GAME_EVENTS.PLAYER_DEFEND_REQUEST,
        handlePlayerDefendRequest as (...args: unknown[]) => void
      );
      gameEvents.off(
        GAME_EVENTS.PLAYER_HEAVY_ATTACK_REQUEST,
        handlePlayerHeavyAttackRequest as (...args: unknown[]) => void
      );
      gameEvents.off(
        GAME_EVENTS.PLAYER_HEAL_REQUEST,
        handlePlayerHealRequest as (...args: unknown[]) => void
      );
      gameEvents.off(
        GAME_EVENTS.ITEM_PICKUP_REQUEST,
        handleItemPickupRequest as (...args: unknown[]) => void
      );
    };
  }, [
    handleCombatStartRequest,
    handlePlayerAttackRequest,
    handlePlayerFleeRequest,
    handleEnemyAttackRequest,
    handlePlayerDefendRequest,
    handlePlayerHeavyAttackRequest,
    handlePlayerHealRequest,
    handleItemPickupRequest,
  ]);

  // Show pending indicator (optional - could render a loading overlay)
  if (isPending) {
    // Transaction in progress - game should show loading state
  }

  return null; // This is a logic-only component
}
