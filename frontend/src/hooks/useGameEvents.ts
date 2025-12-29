import { useEffect, useCallback } from 'react';
import { gameEvents, GAME_EVENTS, GameEventName } from '@/game/events/GameEvents';

type EventCallback = (...args: unknown[]) => void;

/**
 * Hook to subscribe to game events from Phaser
 */
export function useGameEvent(eventName: GameEventName, callback: EventCallback) {
  useEffect(() => {
    gameEvents.on(eventName, callback);
    return () => {
      gameEvents.off(eventName, callback);
    };
  }, [eventName, callback]);
}

/**
 * Hook to emit events to Phaser from React
 */
export function useGameEventEmitter() {
  const emit = useCallback((eventName: GameEventName, ...args: unknown[]) => {
    gameEvents.emit(eventName, ...args);
  }, []);

  return { emit, GAME_EVENTS };
}

/**
 * Hook for common game actions
 */
export function useGameActions() {
  const { emit } = useGameEventEmitter();

  const enterDungeon = useCallback(() => {
    emit(GAME_EVENTS.UI_ENTER_DUNGEON);
  }, [emit]);

  const viewStash = useCallback(() => {
    emit(GAME_EVENTS.UI_VIEW_STASH);
  }, [emit]);

  const pauseGame = useCallback(() => {
    emit(GAME_EVENTS.UI_PAUSE_GAME);
  }, [emit]);

  const resumeGame = useCallback(() => {
    emit(GAME_EVENTS.UI_RESUME_GAME);
  }, [emit]);

  return {
    enterDungeon,
    viewStash,
    pauseGame,
    resumeGame,
  };
}
