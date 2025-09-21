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
          'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-surface)] focus:ring-opacity-30 disabled:pointer-events-none h-9 px-5 py-2.5 tracking-tight',
          variant === 'default'
            ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA] disabled:bg-[#E0E7FF] disabled:text-[#4338CA]/60'
            : 'border border-[#4F46E5] text-[#4F46E5] hover:bg-[rgba(79,70,229,0.08)] hover:text-[#4338CA] disabled:border-[#E0E7FF] disabled:text-[#A5B4FC]',
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
