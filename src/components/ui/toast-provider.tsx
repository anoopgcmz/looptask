"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

type ToastOptions = {
  message: string;
  tone?: ToastTone;
  duration?: number;
};

type Toast = ToastOptions & {
  id: string;
  tone: ToastTone;
  duration: number;
};

type ToastContextValue = {
  showToast: (toast: ToastOptions) => string;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const generateId = () =>
  (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10));

const DEFAULT_DURATION = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, tone = "info", duration = DEFAULT_DURATION }: ToastOptions) => {
      const id = generateId();
      const toast: Toast = {
        id,
        message,
        tone,
        duration,
      };
      setToasts((prev) => [...prev, toast]);
      if (duration > 0) {
        window.setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
      return id;
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4">
        <div className="flex w-full max-w-sm flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className={cn(
                "pointer-events-auto rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg",
                toast.tone === "success" && "bg-[var(--color-status-success)]",
                toast.tone === "error" && "bg-[var(--color-status-destructive)]",
                toast.tone === "info" && "bg-[var(--brand-primary)]",
              )}
            >
              {toast.message}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
