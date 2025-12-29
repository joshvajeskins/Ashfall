/**
 * Game Events - Communication layer between Phaser and React
 * Phaser emits events, React listens and triggers chain transactions
 */

type GameEventCallback = (...args: unknown[]) => void;

interface EventListeners {
  [event: string]: GameEventCallback[];
}

class GameEventEmitter {
  private listeners: EventListeners = {};

  on(event: string, callback: GameEventCallback): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: GameEventCallback): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  emit(event: string, ...args: unknown[]): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => callback(...args));
  }

  removeAllListeners(event?: string): void {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}

// Singleton instance for global access
export const gameEvents = new GameEventEmitter();

// Event name constants
export const GAME_EVENTS = {
  // Scene transitions
  SCENE_READY: 'scene:ready',
  SCENE_CHANGE: 'scene:change',

  // Player actions
  PLAYER_MOVE: 'player:move',
  PLAYER_ATTACK: 'player:attack',
  PLAYER_USE_ITEM: 'player:useItem',
  PLAYER_FLEE: 'player:flee',
  PLAYER_DIED: 'player:died',

  // Combat events
  COMBAT_START: 'combat:start',
  COMBAT_END: 'combat:end',
  COMBAT_DAMAGE: 'combat:damage',
  COMBAT_TURN_CHANGE: 'combat:turnChange',

  // Dungeon events
  DUNGEON_ENTER: 'dungeon:enter',
  DUNGEON_EXIT: 'dungeon:exit',
  DUNGEON_COMPLETE: 'dungeon:complete',
  FLOOR_COMPLETE: 'floor:complete',
  ROOM_ENTER: 'room:enter',
  ROOM_CLEAR: 'room:clear',
  ROOM_TRANSITION: 'room:transition',

  // Item events
  ITEM_PICKUP: 'item:pickup',
  ITEM_DROP: 'item:drop',
  ITEM_EQUIP: 'item:equip',
  ITEM_UNEQUIP: 'item:unequip',

  // Enemy events
  ENEMY_SPAWN: 'enemy:spawn',
  ENEMY_KILLED: 'enemy:killed',
  ENEMY_ENCOUNTERED: 'enemy:encountered',

  // Death events
  DEATH_SEQUENCE_START: 'death:sequenceStart',
  DEATH_CHAIN_PENDING: 'death:chainPending',
  DEATH_CHAIN_CONFIRMED: 'death:chainConfirmed',
  DEATH_COMPLETE: 'death:complete',

  // Loot events
  LOOT_DROPPED: 'loot:dropped',
  LOOT_PICKUP: 'loot:pickup',
  LOOT_TRANSFER: 'loot:transfer',

  // Boss events
  BOSS_APPROACHING: 'boss:approaching',
  BOSS_SPAWNED: 'boss:spawned',
  BOSS_DEFEATED: 'boss:defeated',
  REQUEST_BOSS_LOOT: 'boss:requestLoot',

  // Victory events
  DUNGEON_VICTORY: 'dungeon:victory',
  VICTORY_COMPLETE: 'victory:complete',

  // UI events (React -> Phaser)
  UI_ENTER_DUNGEON: 'ui:enterDungeon',
  UI_VIEW_STASH: 'ui:viewStash',
  UI_RESUME_GAME: 'ui:resumeGame',
  UI_PAUSE_GAME: 'ui:pauseGame',
  UI_SHOW_LOOT: 'ui:showLoot',
  UI_SHOW_DEATH: 'ui:showDeath',
  UI_SHOW_VICTORY: 'ui:showVictory',
} as const;

export type GameEventName = (typeof GAME_EVENTS)[keyof typeof GAME_EVENTS];
