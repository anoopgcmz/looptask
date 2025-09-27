"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
        <select
          ref={ref}
          className={cn(
          "flex h-10 w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--tone-text)] placeholder:text-[var(--color-text-secondary)] transition focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-opacity-30 focus:ring-offset-2 focus:ring-offset-[var(--color-surface)] focus:border-[var(--brand-primary)] disabled:cursor-not-allowed disabled:bg-[color:rgba(227,225,255,0.35)] disabled:text-[var(--color-text-secondary)]",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export { Select };
