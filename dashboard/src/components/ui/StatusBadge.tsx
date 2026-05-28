// ============================================================================
// دروب (Droob) — Status Badge Component
// Transit-specific status pills + occupancy dots + severity indicators
// ============================================================================

import React from "react";
import clsx from "clsx";

interface StatusBadgeProps {
  status: "on_time" | "delayed" | "cancelled" | "active" | "inactive" | "out_of_service";
  label?: string;
  size?: "sm" | "md" | "lg";
  showDot?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; dot: string; labelAr: string }
> = {
  on_time: {
    bg: "bg-on-time/10",
    text: "text-on-time",
    dot: "bg-on-time",
    labelAr: "في الوقت",
  },
  delayed: {
    bg: "bg-delayed/10",
    text: "text-delayed",
    dot: "bg-delayed",
    labelAr: "متأخر",
  },
  cancelled: {
    bg: "bg-cancelled/10",
    text: "text-cancelled",
    dot: "bg-cancelled",
    labelAr: "ملغي",
  },
  active: {
    bg: "bg-brand-green/10",
    text: "text-brand-green",
    dot: "bg-brand-green",
    labelAr: "نشط",
  },
  inactive: {
    bg: "bg-text-tertiary/10",
    text: "text-text-tertiary",
    dot: "bg-text-tertiary",
    labelAr: "متوقف",
  },
  out_of_service: {
    bg: "bg-cancelled/10",
    text: "text-cancelled",
    dot: "bg-cancelled",
    labelAr: "خارج الخدمة",
  },
};

const SIZE_CONFIG = {
  sm: "text-[10px] px-1.5 py-0.5 gap-1",
  md: "text-xs px-2 py-0.5 gap-1.5",
  lg: "text-sm px-3 py-1 gap-1.5",
};

const DOT_SIZES = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2.5 h-2.5",
};

// ─── Pulse Dot for live status ──────────────────────────────────────────────

export const PulseDot: React.FC<{ color?: string; size?: string; className?: string }> = ({
  color = "bg-on-time",
  size = "w-2 h-2",
  className,
}) => (
  <span className={clsx("relative flex items-center justify-center", className)}>
    <span className={clsx("absolute inline-flex rounded-full animate-ping opacity-75", size, color)} />
    <span className={clsx("relative inline-flex rounded-full", size, color)} />
  </span>
);

// ─── Occupancy Dots ─────────────────────────────────────────────────────────

interface OccupancyDotsProps {
  level: "empty" | "partial" | "full";
  size?: "sm" | "md";
  className?: string;
}

export const OccupancyDots: React.FC<OccupancyDotsProps> = ({ level, size = "sm", className }) => {
  const total = 3;
  const filled =
    level === "empty" ? 0 : level === "partial" ? 1 : 3;

  const dotSize = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";

  return (
    <div className={clsx("flex items-center gap-0.5", className)} dir="ltr" title={level === "empty" ? "فارغ" : level === "partial" ? "متوسط" : "ممتلئ"}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            dotSize,
            "rounded-full transition-colors duration-300",
            i < filled ? "bg-brand-green" : "bg-border"
          )}
        />
      ))}
    </div>
  );
};

// ─── Main Status Badge ──────────────────────────────────────────────────────

export default function StatusBadge({
  status,
  label,
  size = "md",
  showDot = true,
  className,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const displayLabel = label || config.labelAr;

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-pill font-medium whitespace-nowrap",
        config.bg,
        config.text,
        SIZE_CONFIG[size],
        className
      )}
    >
      {showDot && (
        <span className={clsx("rounded-full flex-shrink-0", DOT_SIZES[size], config.dot)} />
      )}
      {displayLabel}
    </span>
  );
}

// ─── Severity Badge (for alerts) ────────────────────────────────────────────

interface SeverityBadgeProps {
  severity: "info" | "warning" | "critical";
  label?: string;
  className?: string;
}

const SEVERITY_CONFIG = {
  info: {
    bg: "bg-brand-blue/10",
    text: "text-brand-blue",
    dot: "bg-brand-blue",
    labelAr: "معلومة",
  },
  warning: {
    bg: "bg-delayed/10",
    text: "text-delayed",
    dot: "bg-delayed",
    labelAr: "تحذير",
  },
  critical: {
    bg: "bg-cancelled/10",
    text: "text-cancelled",
    dot: "bg-cancelled",
    labelAr: "عاجل",
  },
};

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  label,
  className,
}) => {
  const config = SEVERITY_CONFIG[severity];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill text-xs font-medium",
        config.bg,
        config.text,
        className
      )}
    >
      <span className={clsx("w-2 h-2 rounded-full", config.dot)} />
      {label || config.labelAr}
    </span>
  );
};