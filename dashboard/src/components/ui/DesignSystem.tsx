// ============================================================================
// دروب (Droob) — Design System Components
// EmptyState, LoadingSkeleton, KpiCard, Toast
// ============================================================================

"use client";

import React, { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

// ═══════════════════════════════════════════════════════════════════════════
// EmptyState
// ═══════════════════════════════════════════════════════════════════════════

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "📋",
  title,
  description,
  actionLabel,
  onAction,
  illustration,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center py-16 px-4 text-center"
  >
    {illustration || (
      <div className="text-5xl mb-4 opacity-40 select-none">{icon}</div>
    )}
    <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
    {description && (
      <p className="text-sm text-text-secondary mb-6 max-w-md leading-relaxed">
        {description}
      </p>
    )}
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="px-5 py-2.5 bg-brand-blue text-white text-sm font-semibold rounded-input hover:opacity-90 transition-opacity shadow-md"
      >
        {actionLabel}
      </button>
    )}
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════
// LoadingSkeleton
// ═══════════════════════════════════════════════════════════════════════════

interface SkeletonProps {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={clsx("skeleton", className)} />
);

interface LoadingSkeletonProps {
  variant: "table" | "card" | "kpi" | "chart";
  rows?: number;
  columns?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant,
  rows = 5,
  columns = 4,
}) => {
  if (variant === "kpi") {
    return (
      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="kpi-card space-y-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="rounded-card border border-border overflow-hidden">
        <div className="p-4 bg-surface-2 space-y-3">
          {Array.from({ length: rows }).map((_, row) => (
            <div key={row} className="flex gap-4">
              {Array.from({ length: columns }).map((_, col) => (
                <Skeleton
                  key={col}
                  className={clsx("h-4", col === 0 ? "w-8" : "flex-1")}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className="rounded-card border border-border p-4 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div className="rounded-card border border-border p-4 space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-[300px] w-full rounded-card" />
      </div>
    );
  }

  return null;
};

// ═══════════════════════════════════════════════════════════════════════════
// KPI Card
// ═══════════════════════════════════════════════════════════════════════════

interface KpiCardProps {
  icon: string;
  label: string;
  value: number | string;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  sparklineData?: number[];
  colorClass?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  icon,
  label,
  value,
  trend,
  sparklineData,
  colorClass = "bg-brand-blue",
}) => {
  const formattedValue =
    typeof value === "number" ? value.toLocaleString("ar-JO") : value;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="kpi-card group"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm", colorClass)}>
          <span>{icon}</span>
        </div>
        <span className="text-xs font-medium text-text-tertiary">{label}</span>
      </div>

      {/* Value */}
      <div className="mb-2">
        <span className="text-3xl font-bold text-text-primary tabular-nums">
          {formattedValue}
        </span>
      </div>

      {/* Trend */}
      {trend && (
        <div className="flex items-center gap-1 mb-3">
          <span
            className={clsx(
              "text-xs font-semibold tabular-nums",
              trend.isPositive ? "text-status-on-time" : "text-cancelled"
            )}
          >
            {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-text-tertiary">{trend.label}</span>
        </div>
      )}

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="flex items-end gap-[2px] h-10 mt-1">
          {sparklineData.map((val, i) => {
            const maxVal = Math.max(...sparklineData, 1);
            const heightPct = (val / maxVal) * 100;
            return (
              <div
                key={i}
                className={clsx(
                  "flex-1 rounded-t-sm transition-all duration-200 group-hover:opacity-60",
                  colorClass
                )}
                style={{ height: `${Math.max(heightPct, 4)}%`, opacity: 0.3 + heightPct / 200 }}
              />
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Toast Notification System
// ═══════════════════════════════════════════════════════════════════════════

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const TOAST_CONFIG: Record<ToastType, { bg: string; icon: string; text: string }> = {
  success: { bg: "bg-status-on-time/10 border-status-on-time/30", icon: "✓", text: "text-status-on-time" },
  error: { bg: "bg-cancelled/10 border-cancelled/30", icon: "✕", text: "text-cancelled" },
  warning: { bg: "bg-status-delayed/10 border-status-delayed/30", icon: "⚠", text: "text-status-delayed" },
  info: { bg: "bg-brand-blue/10 border-brand-blue/30", icon: "ℹ", text: "text-brand-blue" },
};

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
    <AnimatePresence>
      {toasts.map((toast) => {
        const config = TOAST_CONFIG[toast.type];
        return (
          <motion.div
            key={toast.id}
            initial={{ y: -20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={clsx(
              "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-card border shadow-lg backdrop-blur-md",
              config.bg
            )}
          >
            <span className={clsx("text-lg font-bold flex-shrink-0", config.text)}>
              {config.icon}
            </span>
            <p className="flex-1 text-sm text-text-primary">{toast.message}</p>
            {toast.actionLabel && (
              <button
                onClick={toast.onAction}
                className={clsx("text-xs font-semibold px-2 py-1 rounded hover:opacity-80 transition-opacity", config.text)}
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-text-tertiary hover:text-text-primary transition-colors flex-shrink-0"
            >
              ✕
            </button>
          </motion.div>
        );
      })}
    </AnimatePresence>
  </div>
);

