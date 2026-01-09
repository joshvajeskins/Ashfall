'use client';

type PanelSize = 'small' | 'medium' | 'large';

interface ImagePanelProps {
  size?: PanelSize;
  children: React.ReactNode;
  className?: string;
  width?: number;
}

const PANEL_IMAGES: Record<PanelSize, string> = {
  small: '/assets/ui/panels/panel-small.png',
  medium: '/assets/ui/panels/panel-medium.png',
  large: '/assets/ui/panels/panel-large.png',
};

// Fixed pixel dimensions for panels
// Padding accounts for thick decorative borders in panel images
const PANEL_SIZES: Record<PanelSize, { width: number; padding: number }> = {
  small: { width: 350, padding: 50 },
  medium: { width: 450, padding: 60 },
  large: { width: 550, padding: 70 },
};

export function ImagePanel({
  size = 'medium',
  children,
  className = '',
  width,
}: ImagePanelProps) {
  const dimensions = PANEL_SIZES[size];
  const finalWidth = width ?? dimensions.width;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: finalWidth,
      }}
    >
      {/* Background image that stretches to fit content */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${PANEL_IMAGES[size]})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated' as const,
          pointerEvents: 'none',
        }}
      />
      {/* Content with padding */}
      <div
        style={{
          position: 'relative',
          padding: dimensions.padding,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Divider component for use within panels
export function PanelDivider() {
  return (
    <div
      style={{
        width: '100%',
        height: 8,
        marginTop: 8,
        marginBottom: 8,
        backgroundImage: 'url(/assets/ui/decorative/divider-horizontal.png)',
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated' as const,
      }}
    />
  );
}
