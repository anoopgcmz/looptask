'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[#f3f3f5] text-[#1f2937]',
  secondary: 'bg-[#e7e8ec] text-[#1f2937]',
  outline: 'border border-[#d1d5db] bg-transparent text-[#1f2937]',
  destructive: 'bg-[#fde8e8] text-[#7f1d1d]',
  success: 'bg-[#def7ec] text-[#03543f]',
  warning: 'bg-[#fef3c7] text-[#92400e]',
  info: 'bg-[#e0f2fe] text-[#0b4a6f]',
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-transparent px-2.5 py-1 text-xs font-semibold capitalize tracking-wide transition-colors duration-200',
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };
