'use client';

type BarType = 'health' | 'mana' | 'xp';

interface ImageBarProps {
  type: BarType;
  current: number;
  max: number;
  showLabel?: boolean;
  showValues?: boolean;
  size?: 'sm' | 'md' | 'lg';
  barWidth?: string;
  className?: string;
}

const BAR_FRAME = '/assets/ui/bars/bar-frame.png';

const BAR_FILLS: Record<BarType, string> = {
  health: '/assets/ui/bars/bar-health-fill.png',
  mana: '/assets/ui/bars/bar-mana-fill.png',
  xp: '/assets/ui/bars/bar-xp-fill.png',
};

const BAR_LABELS: Record<BarType, string> = {
  health: 'HP',
  mana: 'MP',
  xp: 'XP',
};

const BAR_SIZES: Record<'sm' | 'md' | 'lg', { height: number; padding: number; fontSize: string }> = {
  sm: { height: 16, padding: 2, fontSize: '10px' },
  md: { height: 24, padding: 3, fontSize: '12px' },
  lg: { height: 32, padding: 4, fontSize: '14px' },
};

export function ImageBar({
  type,
  current,
  max,
  showLabel = true,
  showValues = true,
  size = 'md',
  className = '',
}: ImageBarProps) {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));
  const sizeStyle = BAR_SIZES[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span
          className="font-bold text-yellow-100 min-w-[24px]"
          style={{
            fontSize: sizeStyle.fontSize,
            textShadow: '1px 1px 0 #000',
          }}
        >
          {BAR_LABELS[type]}
        </span>
      )}

      <div
        className="relative flex-1"
        style={{ height: sizeStyle.height }}
      >
        {/* Frame (behind fill) */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${BAR_FRAME})`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated',
            zIndex: 1,
          }}
        />

        {/* Fill (on top of frame) */}
        <div
          className="absolute"
          style={{
            top: sizeStyle.padding,
            left: sizeStyle.padding,
            bottom: sizeStyle.padding,
            width: `calc((100% - ${sizeStyle.padding * 2}px) * ${percentage / 100})`,
            backgroundImage: `url(${BAR_FILLS[type]})`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated',
            transition: 'width 0.3s ease-out',
            zIndex: 2,
          }}
        />

        {/* Values */}
        {showValues && (
          <span
            className="absolute inset-0 flex items-center justify-center font-bold text-white"
            style={{
              fontSize: sizeStyle.fontSize,
              textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
              zIndex: 3,
            }}
          >
            {current}/{max}
          </span>
        )}
      </div>
    </div>
  );
}
