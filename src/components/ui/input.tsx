'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-[6px] border border-transparent bg-[#f3f3f5] px-3 py-2 text-sm text-[#111827] placeholder:text-[#6b7280] shadow-inner transition-colors duration-200 focus:border-[#0b1d3f] focus:outline-none focus:ring-2 focus:ring-[#0b1d3f]/30 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
