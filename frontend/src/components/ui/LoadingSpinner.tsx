'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

export function LoadingSpinner({
  size = 'md',
  color = '#4ade80',
  text
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 16,
    md: 32,
    lg: 48
  };

  const dimension = sizeMap[size];

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="animate-spin rounded-full border-2 border-t-transparent"
        style={{
          width: dimension,
          height: dimension,
          borderColor: `${color}40`,
          borderTopColor: color
        }}
      />
      {text && (
        <span className="text-sm text-gray-400 font-mono animate-pulse">
          {text}
        </span>
      )}
    </div>
  );
}
