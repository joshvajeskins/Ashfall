'use client';

import { useState, useCallback } from 'react';
import { soundManager } from '@/game/effects/SoundManager';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
type SoundType = 'proceed' | 'cancel';

interface ImageButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  playSound?: boolean;
  soundType?: SoundType;
}

const BUTTON_IMAGES: Record<ButtonVariant, { normal: string; hover: string; pressed: string }> = {
  primary: {
    normal: '/assets/ui/buttons/btn-primary-normal.png',
    hover: '/assets/ui/buttons/btn-primary-hover.png',
    pressed: '/assets/ui/buttons/btn-primary-pressed.png',
  },
  secondary: {
    normal: '/assets/ui/buttons/btn-secondary-normal.png',
    hover: '/assets/ui/buttons/btn-secondary-hover.png',
    pressed: '/assets/ui/buttons/btn-secondary-pressed.png',
  },
  danger: {
    // Uses primary buttons with red hue filter
    normal: '/assets/ui/buttons/btn-primary-normal.png',
    hover: '/assets/ui/buttons/btn-primary-hover.png',
    pressed: '/assets/ui/buttons/btn-primary-pressed.png',
  },
};

// Fixed pixel sizes for buttons
const SIZE_STYLES: Record<ButtonSize, { width: number; height: number; fontSize: number }> = {
  sm: { width: 140, height: 50, fontSize: 12 },
  md: { width: 180, height: 65, fontSize: 14 },
  lg: { width: 220, height: 80, fontSize: 16 },
};

export function ImageButton({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled,
  playSound = true,
  soundType = 'proceed',
  className = '',
  style,
  ...props
}: ImageButtonProps) {
  const [state, setState] = useState<'normal' | 'hover' | 'pressed'>('normal');
  const images = BUTTON_IMAGES[variant];
  const sizeStyle = SIZE_STYLES[size];

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (playSound) {
      soundManager.play(soundType === 'cancel' ? 'error' : 'buttonClick');
    }
    onClick?.(e);
  }, [disabled, playSound, soundType, onClick]);

  const handleMouseEnter = () => !disabled && setState('hover');
  const handleMouseLeave = () => setState('normal');
  const handleMouseDown = () => !disabled && setState('pressed');
  const handleMouseUp = () => !disabled && setState('hover');

  const currentImage = disabled ? images.normal : images[state];
  const isDanger = variant === 'danger';

  return (
    <button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      disabled={disabled}
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: sizeStyle.width,
        height: sizeStyle.height,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transform: state === 'pressed' && !disabled ? 'translateY(2px)' : 'none',
        transition: 'transform 100ms, filter 100ms',
        backgroundImage: `url(${currentImage})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated' as const,
        filter: isDanger ? 'hue-rotate(-40deg) saturate(1.5)' : 'none',
        ...style,
      }}
      {...props}
    >
      <span
        style={{
          position: 'relative',
          zIndex: 10,
          fontWeight: 'bold',
          color: '#ffffff',
          fontSize: sizeStyle.fontSize,
          textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 2px 2px 2px rgba(0,0,0,0.8)',
          fontFamily: 'monospace',
        }}
      >
        {children}
      </span>
    </button>
  );
}
