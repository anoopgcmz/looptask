'use client';
import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  fallback?: string;
}

export function Avatar({ src, fallback, className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        'relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm',
        className
      )}
      {...props}
    >
      {src ? (
        <Image
          src={src}
          alt={fallback || 'avatar'}
          fill
          className="object-cover"
        />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
}
