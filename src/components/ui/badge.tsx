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
  default: 'bg-[var(--brand-primary)] text-white',
  secondary: 'bg-[var(--brand-secondary)] text-[var(--brand-primary)]',
  outline:
    'border border-[var(--color-border-strong)] bg-transparent text-[var(--tone-text-strong)]',
  destructive: 'bg-[var(--color-status-destructive)] text-white',
  success: 'bg-[var(--color-status-success)] text-white',
  warning: 'bg-[var(--color-status-warning)] text-white',
  info: 'bg-[var(--color-status-info)] text-white',
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-transparent px-2.5 py-1 text-xs font-medium capitalize tracking-wide transition-colors',
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
