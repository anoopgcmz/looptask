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
          "flex h-10 w-full appearance-none rounded-[6px] border border-transparent bg-[#f3f3f5] px-3 py-2 pr-10 text-sm text-[#111827] placeholder:text-[#6b7280] shadow-inner transition duration-200 focus:border-[#0b1d3f] focus:outline-none focus:ring-2 focus:ring-[#0b1d3f]/30 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60 bg-[url('data:image/svg+xml;utf8,<svg fill=\\'none\\' height=\\'16\\' width=\\'16\\' xmlns=\\'http://www.w3.org/2000/svg\\'><path d=\\'M4 6l4 4 4-4\\' stroke=\\'%230b1d3f\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'1.5\\'/></svg>')] bg-[length:16px_16px] bg-[position:calc(100%-12px)_center] bg-no-repeat",
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
