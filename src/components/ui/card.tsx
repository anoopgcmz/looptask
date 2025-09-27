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
        "rounded-[10px] border border-black/10 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-lg data-[density=compact]:p-4",
        className
      )}
      {...props}
    />
  );
});

export { Card };
