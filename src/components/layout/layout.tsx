'use client';
import { useState } from 'react';
import Sidebar from './sidebar';
import Topbar from './topbar';

interface LayoutProps {
  children: React.ReactNode;
  onNewTask?: () => void;
}

export default function Layout({ children, onNewTask }: LayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const sidebarWidth = isSidebarCollapsed ? 80 : 288;

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      <Sidebar collapsed={isSidebarCollapsed} />
      <div
        className="flex min-h-screen w-full flex-col transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        <Topbar
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          onNewTask={onNewTask}
        />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
