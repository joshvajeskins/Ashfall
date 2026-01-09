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

interface GameCanvasProps {
  onReady?: () => void;
  startInDungeon?: boolean;
}

export function GameCanvas({ onReady, startInDungeon = true }: GameCanvasProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStartedDungeon = useRef(false);
  const characterRef = useRef(useGameStore.getState().character);

  const { character, enterDungeon, exitDungeon, addToInventory, die } = useGameStore();

  // Keep characterRef in sync
  useEffect(() => {
    characterRef.current = character;
  }, [character]);

  // Initialize Phaser game (only once)
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      ...gameConfig,
      parent: containerRef.current,
      scene: [BootScene, DungeonScene, CombatScene, DeathScene, VictoryScene],
    };

    gameRef.current = new Phaser.Game(config);

    // Notify when ready and start dungeon directly (skip MenuScene)
    const handleSceneReady = (...args: unknown[]) => {
      const sceneName = args[0] as string;
      if (sceneName === 'BootScene') {
        onReady?.();
        // Go directly to DungeonScene, skip MenuScene entirely
        if (startInDungeon && !hasStartedDungeon.current) {
          const currentCharacter = characterRef.current;
          if (currentCharacter) {
            hasStartedDungeon.current = true;
            gameRef.current?.scene.start('DungeonScene', { character: currentCharacter });
            gameEvents.emit(GAME_EVENTS.DUNGEON_ENTER, { dungeonId: 1 });
          }
        }
      }
    };

    gameEvents.on(GAME_EVENTS.SCENE_READY, handleSceneReady);

    return () => {
      gameEvents.off(GAME_EVENTS.SCENE_READY, handleSceneReady);
      gameEvents.removeAllListeners();
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [onReady, startInDungeon]);

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
    <div className="relative">
      <div
        ref={containerRef}
        className="game-container rounded-lg overflow-hidden border-2 border-gray-800"
        style={{ width: 800, height: 600 }}
      />
      <BossWarning />
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
