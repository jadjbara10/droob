// ============================================================================
// دروب (Droob) — Toast Hook
// ============================================================================

"use client";

import { useState, useCallback, useRef } from "react";
import type { ToastType } from "./DesignSystem";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastOptions {
  type: ToastType;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

function createToast(): { id: string; createdAt: number } {
  return {
    id: Math.random().toString(36).slice(2),
    createdAt: Date.now(),
  };
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const add = useCallback(
    (options: ToastOptions) => {
      const { id } = createToast();
      const toast: ToastItem = {
        id,
        type: options.type,
        message: options.message,
        actionLabel: options.actionLabel,
        onAction: options.onAction,
      };

      setToasts((prev) => [...prev, toast]);

      const duration = options.duration ?? 4000;
      if (duration > 0) {
        const timer = setTimeout(() => {
          dismiss(id);
        }, duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismiss]
  );

  return { toasts, add, dismiss };
}

export { createToast };