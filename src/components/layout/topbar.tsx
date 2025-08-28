'use client';
import { Button } from '@/components/ui/button';

interface TopbarProps {
  onNewTask?: () => void;
}

export default function Topbar({ onNewTask }: TopbarProps) {
  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <h1 className="font-semibold text-lg text-[var(--color-text)]">Tasks</h1>
      {onNewTask && (
        <Button onClick={onNewTask}>New Task</Button>
      )}
    </header>
  );
}
