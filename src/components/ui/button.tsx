'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--brand-primary)] text-white shadow-sm hover:bg-[#151433] focus-visible:ring-[var(--brand-primary)] disabled:bg-[color:rgba(3,2,19,0.35)] disabled:text-white/70',
  secondary:
    'bg-[var(--brand-secondary)] text-[var(--brand-primary)] shadow-sm hover:bg-[#d8d3ff] focus-visible:ring-[var(--brand-primary)] disabled:bg-[color:rgba(227,225,255,0.6)] disabled:text-[var(--brand-primary)]/60',
  ghost:
    'bg-transparent text-[var(--brand-primary)] hover:bg-[color:rgba(227,225,255,0.5)] focus-visible:ring-[var(--brand-primary)] disabled:text-[var(--brand-primary)]/50',
  outline:
    'border border-[var(--color-border-strong)] bg-transparent text-[var(--brand-primary)] shadow-sm hover:bg-[color:rgba(227,225,255,0.4)] focus-visible:ring-[var(--brand-primary)] disabled:text-[var(--brand-primary)]/50 disabled:border-[color:rgba(194,199,214,0.8)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
  icon: 'h-9 w-9',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] disabled:pointer-events-none disabled:opacity-90',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
