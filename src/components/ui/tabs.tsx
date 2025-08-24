'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  value: string;
  label: string;
  content: React.ReactNode;
}

export function Tabs({ items, defaultValue }: { items: TabItem[]; defaultValue?: string }) {
  const [value, setValue] = React.useState(defaultValue || items[0]?.value);
  const active = items.find((i) => i.value === value);
  return (
    <div>
      <div className="flex border-b mb-4">
        {items.map((i) => (
          <button
            key={i.value}
            type="button"
            className={cn(
              'px-3 py-2 text-sm',
              value === i.value
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500'
            )}
            onClick={() => setValue(i.value)}
          >
            {i.label}
          </button>
        ))}
      </div>
      <div>{active?.content}</div>
    </div>
  );
}
