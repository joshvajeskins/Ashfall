'use client';

import { useState } from 'react';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { soundManager } from '@/game/effects/SoundManager';

export function Header() {
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = () => {
    soundManager.play('buttonClick');
    const newMuted = soundManager.toggleMute();
    setIsMuted(newMuted);
  };

  return (
    <header
      style={{
        position: 'relative',
        zIndex: 60,
        height: 70,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderBottom: '2px solid rgba(139, 69, 19, 0.5)',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img
          src="/ashfall-logo-text.png"
          alt="Ashfall"
          style={{ height: 36 }}
        />
        <span
          style={{
            fontSize: 12,
            color: '#fde68a',
            padding: '4px 8px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid #44403c',
            textShadow: '1px 1px 0 #000',
          }}
        >
          Testnet
        </span>
      </div>

      {/* Right side controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={toggleMute}
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            border: '2px solid #44403c',
            cursor: 'pointer',
            fontSize: 18,
            padding: 0,
          }}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          <span style={{ textShadow: '1px 1px 0 #000' }}>
            {isMuted ? '🔇' : '🔊'}
          </span>
        </button>
        <ConnectButton />
      </div>
    </header>
  );
}
