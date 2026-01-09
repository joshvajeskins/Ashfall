import type { Metadata } from 'next';
import { Press_Start_2P, VT323 } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

// Pixel font for headings and game UI
const pressStart = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
});

// Retro terminal font for body text (more readable)
const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-retro',
});

export const metadata: Metadata = {
  title: 'Ashfall - Roguelike Dungeon Crawler',
  description:
    'A browser-based roguelike dungeon crawler with on-chain item ownership built on Movement.',
};

// Fixed game canvas dimensions - larger to fit UI elements
const GAME_WIDTH = 1024;
const GAME_HEIGHT = 900;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${pressStart.variable} ${vt323.variable}`}
        style={{
          margin: 0,
          padding: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          backgroundColor: '#0a0505',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-retro), monospace',
        }}
      >
        {/* Centered fixed-size game canvas */}
        <div
          style={{
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 120px rgba(139,69,19,0.3)',
            border: '4px solid #2a1a0a',
          }}
        >
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
