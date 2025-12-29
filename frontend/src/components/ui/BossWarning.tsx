'use client';

import { useEffect, useState } from 'react';
import { gameEvents, GAME_EVENTS } from '@/game/events/GameEvents';

export const BossWarning: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [bossName, setBossName] = useState<string | null>(null);

  useEffect(() => {
    const handleBossApproaching = () => {
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 3000);
    };

    const handleBossSpawned = (...args: unknown[]) => {
      const data = args[0] as { name: string } | undefined;
      if (data?.name) {
        setBossName(data.name);
        setTimeout(() => setBossName(null), 2000);
      }
    };

    gameEvents.on(GAME_EVENTS.BOSS_APPROACHING, handleBossApproaching);
    gameEvents.on(GAME_EVENTS.BOSS_SPAWNED, handleBossSpawned);

    return () => {
      gameEvents.off(GAME_EVENTS.BOSS_APPROACHING, handleBossApproaching);
      gameEvents.off(GAME_EVENTS.BOSS_SPAWNED, handleBossSpawned);
    };
  }, []);

  if (!isVisible && !bossName) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      {isVisible && (
        <div className="text-4xl font-bold text-red-500 animate-pulse drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">
          BOSS APPROACHING
        </div>
      )}
      {bossName && !isVisible && (
        <div className="text-3xl font-bold text-purple-400 animate-bounce drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
          {bossName}
        </div>
      )}
    </div>
  );
};
