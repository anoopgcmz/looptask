'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'secondary'
    | 'success'
    | 'inProgress'
    | 'backlog'
    | 'urgent'
    | 'low';
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize',
          {
            default: 'bg-gray-100 text-gray-800',
            secondary: 'bg-blue-100 text-blue-800',
            success: 'bg-[#10B981] text-white',
            inProgress: 'bg-[#3B82F6] text-white',
            backlog: 'bg-[#F59E0B] text-white',
            urgent: 'bg-[#EF4444] text-white',
            low: 'bg-[#6B7280] text-white',
          }[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };
