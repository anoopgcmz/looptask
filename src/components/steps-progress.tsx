'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

export function StepsProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-2 flex-1 rounded-full',
            i < current ? 'bg-blue-600' : 'bg-gray-200'
          )}
        />
      ))}
    </div>
  );
}
