'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-surface)] focus:ring-opacity-30 disabled:opacity-50 disabled:pointer-events-none h-9 px-5 py-2.5 tracking-tight',
          variant === 'default'
            ? 'bg-[var(--color-primary)] text-white hover:opacity-90 hover:shadow-none'
            : 'border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-white hover:opacity-90',
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
