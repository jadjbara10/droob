/* ═══════════════════════════════════════════════════════════════════════════
   KPI Card — Colored top border + mono value + change indicator
   ═══════════════════════════════════════════════════════════════════════════ */

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type KpiAccent = "accent" | "accent-2" | "warn" | "purple" | "danger";

interface KpiCardProps {
  label: string;
  value: number | string;
  suffix?: string;
  change?: number; // percentage
  accent?: KpiAccent;
}

export function KpiCard({ label, value, suffix = "", change, accent = "accent" }: KpiCardProps) {
  const formattedValue = typeof value === "number" ? value.toLocaleString("ar-JO") : value;

  const trendIcon =
    change === undefined || change === 0 ? (
      <Minus size={12} />
    ) : change > 0 ? (
      <TrendingUp size={12} />
    ) : (
      <TrendingDown size={12} />
    );

  const trendClass = !change || change === 0 ? "flat" : change > 0 ? "up" : "down";
  const trendLabel = !change || change === 0 ? "بدون تغيير" : change > 0 ? `${change}% ارتفاع` : `${Math.abs(change)}% انخفاض`;

  return (
    <div className={`kpi-card ${accent}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {formattedValue}
        {suffix && <span style={{ fontSize: 14, marginRight: 4, color: "var(--text-secondary)" }}>{suffix}</span>}
      </div>
      {change !== undefined && (
        <div className={`kpi-change ${trendClass}`}>
          {trendIcon}
          {trendLabel}
        </div>
      )}
    </div>
  );
}
