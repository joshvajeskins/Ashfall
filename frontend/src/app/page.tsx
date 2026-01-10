'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { CharacterSelect } from '@/components/character';
import { GameCanvas } from '@/components/game';
import { useUIStore } from '@/stores/uiStore';
import { useGameStore } from '@/stores/gameStore';
import { ImageButton } from '@/components/ui/ImageButton';
import { ImagePanel } from '@/components/ui/ImagePanel';
import { Header } from '@/components/ui/Header';
import { soundManager } from '@/game/effects/SoundManager';

function AuthenticatedHome() {
  const { ready, authenticated, login } = usePrivy();
  const { openModal } = useUIStore();
  const { isInDungeon, exitDungeon, enterDungeon } = useGameStore();
  const [isGameActive, setIsGameActive] = useState(false);

  useEffect(() => {
    // Keep playing mainMenu music - battle music is triggered during actual combat
    soundManager.playMusic('mainMenu');
  }, []);

  if (!ready) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: 'url(/assets/backgrounds/main-menu.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <ImagePanel size="small" width={320}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div
              style={{
                width: 24,
                height: 24,
                border: '4px solid #ca8a04',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <span style={{ color: '#fef3c7', textShadow: '2px 2px 0 #000' }}>Loading...</span>
          </div>
        </ImagePanel>
      </div>
    );
  }

  if (isGameActive) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0a0a0a',
        }}
      >
        <Header />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <GameCanvas onReady={() => console.log('Game ready')} />
        </div>
        <div style={{ padding: 12, display: 'flex', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <ImageButton
            variant="secondary"
            size="md"
            soundType="cancel"
            onClick={() => {
              soundManager.fadeOutMusic();
              setIsGameActive(false);
              exitDungeon();
            }}
          >
            Back to Menu
          </ImageButton>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: 'url(/assets/backgrounds/main-menu.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Header at top */}
      <Header />

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        {/* Logo */}
        <img
          src="/ashfall-logo-text.png"
          alt="Ashfall"
          style={{ height: 80, marginBottom: 8 }}
        />
        <p
          style={{
            color: '#d1d5db',
            fontSize: 20,
            textShadow: '2px 2px 0 #000',
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          A roguelike dungeon crawler with true item ownership.
        </p>

        {!authenticated ? (
          <ImagePanel size="large" width={550}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              {/* Connect section */}
              <div style={{ textAlign: 'center' }}>
                <p
                  style={{
                    color: '#d1d5db',
                    marginBottom: 16,
                    textShadow: '1px 1px 0 #000',
                    fontSize: 18,
                  }}
                >
                  Connect your wallet to begin your adventure.
                </p>
                <ImageButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    soundManager.play('buttonClick');
                    login();
                  }}
                >
                  Connect Wallet
                </ImageButton>
              </div>

              {/* Divider */}
              <div
                style={{
                  height: 2,
                  backgroundColor: 'rgba(139, 69, 19, 0.5)',
                  margin: '4px 0',
                }}
              />

              {/* Features section */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                {[
                  { text: 'Permadeath - death means losing your items', icon: '/assets/environment/skull.png' },
                  { text: 'True ownership - items are on-chain NFTs', icon: '/assets/items/gold.png' },
                  { text: 'Procedural dungeons - every run is unique', icon: '/assets/environment/door.png' },
                ].map((feature, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img
                      src={feature.icon}
                      alt=""
                      style={{ width: 20, height: 20, imageRendering: 'pixelated' }}
                    />
                    <span style={{ color: '#d1d5db', fontSize: 14, textShadow: '1px 1px 0 #000' }}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ImagePanel>
        ) : (
          <CharacterSelect
            onSelect={() => {
              soundManager.play('doorOpen');
              enterDungeon(1);
              setIsGameActive(true);
            }}
            onEquipmentClick={(slot) => {
              soundManager.play('menuOpen');
              openModal('inventory');
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          paddingTop: 12,
          paddingLeft: 12,
          paddingRight: 12,
          paddingBottom: 24,
          textAlign: 'center',
          fontSize: 14,
          color: '#9ca3af',
          textShadow: '1px 1px 0 #000',
        }}
      >
        Built on Movement Network
      </div>
    </div>
  );
}

function UnconfiguredHome() {
  useEffect(() => {
    soundManager.playMusic('mainMenu');
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: 'url(/assets/backgrounds/main-menu.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Header />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <img
          src="/ashfall-logo-text.png"
          alt="Ashfall"
          style={{ height: 80, marginBottom: 8 }}
        />
        <p
          style={{
            color: '#d1d5db',
            fontSize: 20,
            textShadow: '2px 2px 0 #000',
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          A roguelike dungeon crawler with true item ownership on Movement.
        </p>

        <ImagePanel size="large" width={580}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Setup section */}
            <div>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 'bold',
                  color: '#fef3c7',
                  marginBottom: 12,
                  textShadow: '1px 1px 0 #000',
                }}
              >
                Setup Required
              </h2>
              <p
                style={{
                  color: '#9ca3af',
                  fontSize: 16,
                  marginBottom: 12,
                  textShadow: '1px 1px 0 #000',
                }}
              >
                To enable wallet connection, add your Privy App ID:
              </p>
              <code
                style={{
                  display: 'block',
                  padding: 12,
                  fontSize: 14,
                  color: '#fde68a',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  border: '2px solid #44403c',
                  fontFamily: 'monospace',
                }}
              >
                NEXT_PUBLIC_PRIVY_APP_ID=your-app-id
              </code>
              <p
                style={{
                  color: '#6b7280',
                  fontSize: 14,
                  marginTop: 12,
                  textShadow: '1px 1px 0 #000',
                }}
              >
                Get your App ID from{' '}
                <a
                  href="https://dashboard.privy.io"
                  style={{ color: '#f87171', textDecoration: 'underline' }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  dashboard.privy.io
                </a>
              </p>
            </div>

            {/* Divider */}
            <div
              style={{
                height: 2,
                backgroundColor: 'rgba(139, 69, 19, 0.5)',
              }}
            />

            {/* Features section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { text: 'Permadeath - death means losing your items', icon: '/assets/environment/skull.png' },
                { text: 'True ownership - items are on-chain NFTs', icon: '/assets/items/gold.png' },
                { text: 'Procedural dungeons - every run is unique', icon: '/assets/environment/door.png' },
              ].map((feature, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={feature.icon}
                    alt=""
                    style={{ width: 24, height: 24, imageRendering: 'pixelated' }}
                  />
                  <span style={{ color: '#d1d5db', fontSize: 16, textShadow: '1px 1px 0 #000' }}>
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ImagePanel>
      </div>

      <div
        style={{
          padding: 12,
          textAlign: 'center',
          fontSize: 14,
          color: '#9ca3af',
          textShadow: '1px 1px 0 #000',
        }}
      >
        Built on Movement Network
      </div>
    </div>
  );
}

export default function Home() {
  const hasPrivyConfig = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!hasPrivyConfig) {
    return <UnconfiguredHome />;
  }

  return <AuthenticatedHome />;
}
