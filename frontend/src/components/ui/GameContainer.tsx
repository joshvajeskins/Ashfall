'use client';

// Fixed game dimensions - all UI is designed around these
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

interface GameContainerProps {
  children: React.ReactNode;
  backgroundImage?: string;
}

export function GameContainer({ children, backgroundImage = '/assets/backgrounds/main-menu.png' }: GameContainerProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#0a0a0a',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Fixed size game container */}
      <div
        className="relative"
        style={{
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
        }}
      >
        {children}
      </div>
    </div>
  );
}
