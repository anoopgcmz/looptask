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
    'bg-[#0b1d3f] text-white shadow-sm hover:bg-[#091632] focus-visible:ring-[#0b1d3f] disabled:bg-[#0b1d3f]/60 disabled:text-white/80',
  secondary:
    'bg-[#f3f3f5] text-[#111827] shadow-sm hover:bg-[#e5e6eb] focus-visible:ring-[#0b1d3f] disabled:bg-[#f3f3f5] disabled:text-[#6b7280] disabled:shadow-none',
  ghost:
    'bg-transparent text-[#0b1d3f] hover:bg-[#e5e6eb]/70 focus-visible:ring-[#0b1d3f]/40 disabled:text-[#0b1d3f]/40',
  outline:
    'border border-[#c9ccd6] bg-transparent text-[#0b1d3f] shadow-sm hover:bg-[#f3f3f5] focus-visible:ring-[#0b1d3f] disabled:text-[#0b1d3f]/40 disabled:border-[#c9ccd6]/60',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
  icon: 'h-10 w-10',
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
          'inline-flex items-center justify-center rounded-[6px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-80',
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
