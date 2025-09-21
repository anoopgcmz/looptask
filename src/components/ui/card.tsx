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
        "bg-white rounded-xl shadow-md border border-[#EEF2FF] p-5", 
        className
      )}
      {...props}
    />
  );
});

export { Card };
