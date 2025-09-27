"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-md",
        className
      )}
      {...props}
    />
  );
});

export { Card };
