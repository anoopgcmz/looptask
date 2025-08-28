'use client';
import Sidebar from './sidebar';
import Topbar from './topbar';

interface LayoutProps {
  children: React.ReactNode;
  onNewTask?: () => void;
}

export default function Layout({ children, onNewTask }: LayoutProps) {
  return (
    <div className="flex h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar onNewTask={onNewTask} />
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  );
}
