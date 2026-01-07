'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { gameConfig } from '@/game/config';
import { BootScene } from '@/game/scenes/BootScene';
import { DungeonScene } from '@/game/scenes/DungeonScene';
import { CombatScene } from '@/game/scenes/CombatScene';
import { DeathScene } from '@/game/scenes/DeathScene';
import { VictoryScene } from '@/game/scenes/VictoryScene';
import { gameEvents, GAME_EVENTS } from '@/game/events/GameEvents';
import { useGameStore } from '@/stores/gameStore';
import { BossWarning } from '@/components/ui/BossWarning';
import { CombatBridge } from './CombatBridge';

// Module-level singleton to prevent multiple Phaser instances (React StrictMode fix)
let globalGameInstance: Phaser.Game | null = null;
let globalHasStartedDungeon = false;

interface GameCanvasProps {
  onReady?: () => void;
  startInDungeon?: boolean;
}

export function GameCanvas({ onReady, startInDungeon = true }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { enterDungeon, exitDungeon, addToInventory, die } = useGameStore();

  // Initialize Phaser game (only once using module-level singleton)
  useEffect(() => {
    if (!containerRef.current) return;

    // Set up event listener - must be done every mount since cleanup removes it
    const handleSceneReady = (...args: unknown[]) => {
      const sceneName = args[0] as string;
      if (sceneName === 'BootScene') {
        onReady?.();
        // Go directly to DungeonScene, skip MenuScene entirely
        // Note: DUNGEON_ENTER was already emitted by DungeonBridge after blockchain tx succeeded
        if (startInDungeon && !globalHasStartedDungeon) {
          const currentCharacter = useGameStore.getState().character;
          globalHasStartedDungeon = true;
          // Stop BootScene first, then start DungeonScene
          globalGameInstance?.scene.stop('BootScene');
          globalGameInstance?.scene.start('DungeonScene', { character: currentCharacter });
        }
      }
    };

    gameEvents.on(GAME_EVENTS.SCENE_READY, handleSceneReady);

    // If game already exists, just re-parent it to this container
    if (globalGameInstance) {
      // Check if game canvas needs to be moved to new container
      const canvas = globalGameInstance.canvas;
      if (canvas && canvas.parentElement !== containerRef.current) {
        containerRef.current.appendChild(canvas);
      }
      // Cleanup listener on unmount
      return () => {
        gameEvents.off(GAME_EVENTS.SCENE_READY, handleSceneReady);
      };
    }

    const config: Phaser.Types.Core.GameConfig = {
      ...gameConfig,
      parent: containerRef.current,
      scene: [BootScene, DungeonScene, CombatScene, DeathScene, VictoryScene],
    };

    globalGameInstance = new Phaser.Game(config);

    // Cleanup listener on unmount
    return () => {
      gameEvents.off(GAME_EVENTS.SCENE_READY, handleSceneReady);
    };
  }, [onReady, startInDungeon]);

  // Reset dungeon state when component fully unmounts (for re-entry)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    return () => {
      // Use a small timeout to distinguish StrictMode remount from real unmount
      timeoutId = setTimeout(() => {
        globalHasStartedDungeon = false;
        // Stop dungeon scene and reset to BootScene for next entry
        if (globalGameInstance) {
          globalGameInstance.scene.stop('DungeonScene');
          globalGameInstance.scene.stop('CombatScene');
          globalGameInstance.scene.start('BootScene');
        }
      }, 100);

      // Clear timeout if component remounts quickly (StrictMode)
      return;
    };
  }, []);

  // Setup game event listeners
  useEffect(() => {
    const handleDungeonEnter = (...args: unknown[]) => {
      const data = args[0] as { dungeonId: number };
      enterDungeon(data.dungeonId);
    };

    const handleDungeonExit = () => {
      exitDungeon();
    };

    const handleItemPickup = (...args: unknown[]) => {
      const data = args[0] as { type: string };
      const item = createItemFromType(data.type);
      if (item) {
        addToInventory(item);
      }
    };

    const handlePlayerDied = () => {
      die();
    };

    gameEvents.on(GAME_EVENTS.DUNGEON_ENTER, handleDungeonEnter);
    gameEvents.on(GAME_EVENTS.DUNGEON_EXIT, handleDungeonExit);
    gameEvents.on(GAME_EVENTS.ITEM_PICKUP, handleItemPickup);
    gameEvents.on(GAME_EVENTS.PLAYER_DIED, handlePlayerDied);

    return () => {
      gameEvents.off(GAME_EVENTS.DUNGEON_ENTER, handleDungeonEnter);
      gameEvents.off(GAME_EVENTS.DUNGEON_EXIT, handleDungeonExit);
      gameEvents.off(GAME_EVENTS.ITEM_PICKUP, handleItemPickup);
      gameEvents.off(GAME_EVENTS.PLAYER_DIED, handlePlayerDied);
    };
  }, [enterDungeon, exitDungeon, addToInventory, die]);

  return (
    <div className="relative w-full h-full flex-1 flex items-center justify-center bg-black">
      <div
        ref={containerRef}
        id="game-container"
        className="game-container"
        style={{ width: '100%', height: '100%' }}
      />
      <BossWarning />
      <CombatBridge />
    </div>
  );
}

// Helper function to create item from pickup type
function createItemFromType(type: string) {
  const typeToItem: Record<string, { name: string; itemType: 'Weapon' | 'Armor' | 'Consumable' }> = {
    'item-sword': { name: 'Iron Sword', itemType: 'Weapon' },
    'item-shield': { name: 'Wooden Shield', itemType: 'Armor' },
    'item-potion': { name: 'Health Potion', itemType: 'Consumable' },
  };

  const itemInfo = typeToItem[type];
  if (!itemInfo) return null;

  return {
    id: Date.now(),
    name: itemInfo.name,
    rarity: 'Common' as const,
    type: itemInfo.itemType,
    stats: itemInfo.itemType === 'Weapon' ? { damage: 5 } : { health: 20 },
    enchantments: [],
    durability: 100,
    killCount: 0,
  };
}

export default GameCanvas;
