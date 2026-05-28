// ============================================================================
// دروب (Droob) — KPI Card Component
// Large number + trend indicator + sparkline | Hover lift animation
// ============================================================================

"use client";

import React from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface SparklineData {
  values: number[];
  trend: "up" | "down" | "flat";
}

interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: string; // e.g. "+12%" or "-5%"
    direction: "up" | "down";
  };
  sparkline?: SparklineData;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}

// ─── Mini Sparkline (pure SVG, no dependency) ───────────────────────────────

const Sparkline: React.FC<{ data: SparklineData }> = ({ data }) => {
  const { values, trend } = data;
  const w = 80;
  const h = 36;
  const pad = 2;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1 || 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const color =
    trend === "up"
      ? "var(--brand-green, #2E7D32)"
      : trend === "down"
        ? "var(--cancelled, #DC2626)"
        : "var(--text-tertiary, #9CA3AF)";

  const areaColor =
    trend === "up"
      ? "url(#sparkGradUp)"
      : trend === "down"
        ? "url(#sparkGradDown)"
        : "url(#sparkGradFlat)";

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sparkGradUp" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-green, #2E7D32)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--brand-green, #2E7D32)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sparkGradDown" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--cancelled, #DC2626)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--cancelled, #DC2626)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sparkGradFlat" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--text-tertiary, #9CA3AF)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--text-tertiary, #9CA3AF)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon
        points={`${pad},${h - pad} ${points} ${w - pad},${h - pad}`}
        fill={areaColor}
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ─── Trend Arrow ────────────────────────────────────────────────────────────

const TrendArrow: React.FC<{ direction: "up" | "down" }> = ({ direction }) => {
  const isUp = direction === "up";
  return (
    <svg
      className={clsx("w-3 h-3 flex-shrink-0", isUp ? "text-brand-green" : "text-cancelled")}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {isUp ? (
        <polyline points="18,15 12,9 6,15" />
      ) : (
        <polyline points="6,9 12,15 18,9" />
      )}
    </svg>
  );
};

// ─── Variant Styles ─────────────────────────────────────────────────────────

const variantStyles: Record<string, { iconBg: string; iconColor: string }> = {
  default: { iconBg: "bg-brand-blue/10", iconColor: "text-brand-blue" },
  success: { iconBg: "bg-brand-green/10", iconColor: "text-brand-green" },
  warning: { iconBg: "bg-delayed/10", iconColor: "text-delayed" },
  danger: { iconBg: "bg-cancelled/10", iconColor: "text-cancelled" },
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function KpiCard({
  label,
  value,
  trend,
  sparkline,
  icon,
  variant = "default",
  className,
}: KpiCardProps) {
  const styles = variantStyles[variant] || variantStyles.default;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={clsx(
        "flex flex-col gap-3 p-4 bg-surface rounded-card border border-border shadow-sm hover:shadow-md transition-shadow duration-200",
        className
      )}
    >
      {/* Top row: Icon + Label */}
      <div className="flex items-center gap-2.5">
        {icon && (
          <div
            className={clsx(
              "w-9 h-9 rounded-input flex items-center justify-center flex-shrink-0",
              styles.iconBg,
              styles.iconColor
            )}
          >
            <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
          </div>
        )}
        <span className="text-xs text-text-tertiary leading-tight truncate">{label}</span>
      </div>

      {/* Value + Trend */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[28px] font-bold tabular-nums text-text-primary leading-none tracking-tight">
          {typeof value === "number" ? value.toLocaleString("ar-JO") : value}
        </span>

        {trend && (
          <div
            className={clsx(
              "flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-pill",
              trend.direction === "up"
                ? "text-brand-green bg-brand-green/10"
                : "text-cancelled bg-cancelled/10"
            )}
          >
            <TrendArrow direction={trend.direction} />
            <span>{trend.value}</span>
          </div>
        )}
      </div>

      {/* Sparkline */}
      {sparkline && sparkline.values.length > 1 && (
        <div className="h-9 w-full">
          <Sparkline data={sparkline} />
        </div>
      )}
    </motion.div>
  );
}