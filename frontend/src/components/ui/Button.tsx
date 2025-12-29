'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      relative font-mono transition-all duration-200 ease-out
      border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
      active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
      overflow-hidden
    `;

    const variantStyles = {
      primary: `
        bg-green-600 border-green-500 text-white
        hover:bg-green-500 hover:shadow-lg hover:shadow-green-500/25
        focus:ring-green-500
      `,
      secondary: `
        bg-gray-700 border-gray-600 text-white
        hover:bg-gray-600 hover:shadow-lg hover:shadow-gray-500/25
        focus:ring-gray-500
      `,
      danger: `
        bg-red-600 border-red-500 text-white
        hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/25
        focus:ring-red-500
      `,
      ghost: `
        bg-transparent border-gray-700 text-gray-300
        hover:bg-gray-800 hover:border-gray-600 hover:text-white
        focus:ring-gray-500
      `
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {/* Hover shine effect */}
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />

        {/* Content */}
        <span className={`relative flex items-center justify-center gap-2 ${loading ? 'opacity-0' : 'opacity-100'}`}>
          {children}
        </span>

        {/* Loading spinner */}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
