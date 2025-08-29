'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface TopbarProps {
  onNewTask?: () => void;
}

export default function Topbar({ onNewTask }: TopbarProps) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const MotionButton = motion(Button);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!onNewTask) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((r) => [...r, { id, x, y }]);
    setTimeout(() => setRipples((r) => r.filter((rip) => rip.id !== id)), 600);
    onNewTask();
  };

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <h1 className="font-semibold text-lg text-[var(--color-text)]">Tasks</h1>
      {onNewTask && (
        <MotionButton
          onClick={handleClick}
          whileTap={{ scale: 0.95 }}
          className="relative overflow-hidden"
        >
          New Task
          {ripples.map((r) => (
            <motion.span
              key={r.id}
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30"
              style={{ left: r.x, top: r.y, width: 20, height: 20 }}
              initial={{ opacity: 0.5, scale: 0 }}
              animate={{ opacity: 0, scale: 8 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          ))}
        </MotionButton>
      )}
    </header>
  );
}
