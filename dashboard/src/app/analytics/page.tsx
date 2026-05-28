// ============================================================================
// دروب (Droob) — Analytics Page
// DAU/MAU Trends | Peak Hours Heatmap | Top Destinations | Retention
// ============================================================================

"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import { AreaChart } from "@/components/ui/Charts";

// ─── Types ─────────────────────────────────────────────────────────────────

interface DailyUserData {
  day: string;
  dau: number;
  mau: number;
}

interface PeakHourCell {
  day: number; // 0=Sun, 6=Sat
  hour: number; // 0-23
  value: number;
}

interface Destination {
  name: string;
  trips: number;
  trend: "up" | "down" | "flat";
}

interface RetentionCohort {
  cohort: string;
  size: number;
  week1: number;
  week2: number;
  week4: number;
  week8: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const DAY_LABELS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DAY_LABELS_SHORT = ["أح", "إث", "ث", "أر", "خ", "ج", "س"];

// ─── Mock Data ─────────────────────────────────────────────────────────────

const DAILY_USERS: DailyUserData[] = Array.from({ length: 30 }, (_, i) => {
  const base = 85000;
  const noise = Math.sin(i * 0.4) * 8000 + Math.random() * 4000;
  const dau = Math.round(base + noise);
  const mau = Math.round(dau * (2.8 + Math.random() * 0.4));
  return {
    day: `${30 - i} مايو`,
    dau,
    mau,
  };
}).reverse();

const PEAK_HOURS: PeakHourCell[] = [];
for (let day = 0; day < 7; day++) {
  for (let hour = 6; hour < 22; hour++) {
    // Create realistic peak patterns
    let baseValue = 200;
    // Morning peak
    if (hour >= 7 && hour <= 9) baseValue = day < 5 ? 800 : 500;
    // Evening peak
    if (hour >= 15 && hour <= 18) baseValue = day < 5 ? 750 : 550;
    // Midday
    if (hour >= 11 && hour <= 14) baseValue = day < 5 ? 450 : 400;
    // Weekend dip
    if (day === 5 || day === 6) baseValue *= 0.7;
    // Night
    if (hour >= 19 && hour <= 21) baseValue = 300;

    const noise = Math.random() * 100 - 50;
    PEAK_HOURS.push({ day, hour, value: Math.max(10, Math.round(baseValue + noise)) });
  }
}

const DESTINATIONS: Destination[] = [
  { name: "دوار الداخلية", trips: 12450, trend: "up" },
  { name: "العبدلي", trips: 10200, trend: "up" },
  { name: "الجامعة الأردنية", trips: 9800, trend: "flat" },
  { name: "الصويفية", trips: 8700, trend: "up" },
  { name: "سيتي مول", trips: 7600, trend: "flat" },
  { name: "جبل الحسين", trips: 7200, trend: "down" },
  { name: "وسط البلد", trips: 6800, trend: "down" },
  { name: "الجاردنز", trips: 6500, trend: "up" },
  { name: "دوار الواحة", trips: 5900, trend: "flat" },
  { name: "مجمع الشمال", trips: 5400, trend: "up" },
];

const RETENTION_DATA: RetentionCohort[] = [
  { cohort: "أبريل", size: 3420, week1: 82, week2: 64, week4: 48, week8: 38 },
  { cohort: "مارس", size: 2850, week1: 80, week2: 65, week4: 50, week8: 41 },
  { cohort: "فبراير", size: 3100, week1: 85, week2: 68, week4: 52, week8: 44 },
  { cohort: "يناير", size: 2900, week1: 83, week2: 62, week4: 46, week8: 37 },
  { cohort: "ديسمبر", size: 3600, week1: 81, week2: 63, week4: 45, week8: 36 },
];

// ─── Peak Hours Heatmap ────────────────────────────────────────────────────

const PeakHoursHeatmap: React.FC = () => {
  const maxVal = Math.max(...PEAK_HOURS.map((c) => c.value));
  const cellW = 36;
  const cellH = 22;
  const labelW = 32;
  const labelH = 20;
  const padding = { top: 24, left: 36, right: 8, bottom: 8 };
  const w = labelW + 16 * cellW + padding.left + padding.right;
  const h = padding.top + 7 * cellH + padding.bottom;

  const getColor = (value: number): string => {
    const pct = value / maxVal;
    if (pct < 0.2) return "#EDF2FF";
    if (pct < 0.35) return "#DBE4FF";
    if (pct < 0.5) return "#BAC8FF";
    if (pct < 0.65) return "#91A7FF";
    if (pct < 0.8) return "#748FFC";
    return "#4C6EF5";
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" aria-label="Peak hours heatmap">
      {/* Column headers (hours) */}
      {Array.from({ length: 16 }, (_, i) => i + 6).map((hour) => (
        <text
          key={hour}
          x={padding.left + labelW + (hour - 6) * cellW + cellW / 2}
          y={14}
          textAnchor="middle"
          className="fill-text-tertiary"
          fontSize="9"
          fontFamily="system-ui"
        >
          {hour}
        </text>
      ))}

      {/* Rows */}
      {DAY_LABELS_SHORT.map((label, day) => (
        <g key={day}>
          <text
            x={padding.left + labelW - 8}
            y={padding.top + day * cellH + cellH / 2 + 3}
            textAnchor="end"
            className="fill-text-secondary"
            fontSize="10"
            fontWeight="500"
            fontFamily="system-ui"
          >
            {label}
          </text>
          {Array.from({ length: 16 }, (_, i) => i + 6).map((hour) => {
            const cell = PEAK_HOURS.find((c) => c.day === day && c.hour === hour);
            const value = cell?.value ?? 0;
            return (
              <rect
                key={hour}
                x={padding.left + labelW + (hour - 6) * cellW}
                y={padding.top + day * cellH}
                width={cellW - 2}
                height={cellH - 2}
                rx="3"
                fill={getColor(value)}
              >
                <title>{`${DAY_LABELS[day]} ${hour}:00 — ${value.toLocaleString("ar-JO")} رحلة`}</title>
              </rect>
            );
          })}
        </g>
      ))}
    </svg>
  );
};

// ─── Top Destinations Bar Chart ────────────────────────────────────────────

const TopDestinations: React.FC<{ data: Destination[] }> = ({ data }) => {
  const maxTrips = Math.max(...data.map((d) => d.trips));
  const barH = 28;
  const gap = 4;
  const totalH = data.length * (barH + gap);

  return (
    <div className="space-y-1 w-full">
      {data.map((d) => (
        <div key={d.name} className="group flex items-center gap-3" style={{ height: barH }}>
          <span className="w-28 text-xs text-text-secondary truncate flex-shrink-0" title={d.name}>
            {d.name}
          </span>
          <div className="flex-1 h-4 bg-surface-3 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(d.trips / maxTrips) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-brand-blue group-hover:opacity-80 transition-opacity"
            />
          </div>
          <span className="w-16 text-xs tabular-nums text-text-secondary text-right flex-shrink-0 font-medium">
            {d.trips.toLocaleString("ar-JO")}
          </span>
          <span className="w-6 text-xs text-center flex-shrink-0">
            {d.trend === "up" && <span className="text-brand-green">↑</span>}
            {d.trend === "down" && <span className="text-cancelled">↓</span>}
            {d.trend === "flat" && <span className="text-text-tertiary">→</span>}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Retention Table ───────────────────────────────────────────────────────

const RetentionTable: React.FC<{ data: RetentionCohort[] }> = ({ data }) => {
  const getColor = (pct: number): string => {
    if (pct >= 50) return "bg-brand-green/20 text-brand-green";
    if (pct >= 40) return "bg-delayed/20 text-delayed";
    return "bg-cancelled/10 text-cancelled";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-right py-3 px-4 text-xs font-medium text-text-tertiary">الفوج</th>
            <th className="text-right py-3 px-4 text-xs font-medium text-text-tertiary">الحجم</th>
            <th className="text-center py-3 px-4 text-xs font-medium text-text-tertiary">الأسبوع ١</th>
            <th className="text-center py-3 px-4 text-xs font-medium text-text-tertiary">الأسبوع ٢</th>
            <th className="text-center py-3 px-4 text-xs font-medium text-text-tertiary">الأسبوع ٤</th>
            <th className="text-center py-3 px-4 text-xs font-medium text-text-tertiary">الأسبوع ٨</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.cohort} className="border-b border-border hover:bg-surface-2 transition-colors">
              <td className="py-3 px-4 font-medium text-text-primary text-right">{row.cohort}</td>
              <td className="py-3 px-4 tabular-nums text-text-secondary text-right">
                {row.size.toLocaleString("ar-JO")}
              </td>
              {[row.week1, row.week2, row.week4, row.week8].map((val, i) => (
                <td key={i} className="py-3 px-4 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-pill text-xs font-semibold tabular-nums ${getColor(val)}`}
                  >
                    {val}%
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [timeRange] = useState("30d");

  const headerProps = {
    title: "التحليلات",
    breadcrumb: [
      { label: "الرئيسية", href: "/" },
      { label: "التحليلات" },
    ],
    actions: (
      <div className="flex items-center gap-2">
        {[
          { value: "7d", label: "٧ أيام" },
          { value: "30d", label: "٣٠ يوم" },
          { value: "90d", label: "٩٠ يوم" },
        ].map((r) => (
          <button
            key={r.value}
            className={`text-xs px-3 py-1.5 rounded-pill font-medium transition-all ${
              timeRange === r.value
                ? "bg-brand-blue text-white"
                : "bg-surface-2 text-text-secondary hover:bg-surface-3"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    ),
  };

  return (
    <DashboardShell headerProps={headerProps}>
      <div className="space-y-6">
        {/* ─── DAU / MAU Trend ─── */}
        <section className="p-6 bg-surface rounded-card border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-text-primary">المستخدمون النشطون</h2>
              <p className="text-xs text-text-tertiary mt-0.5">مقارنة بين المستخدمين اليوميين والشهريين</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-3 h-0.5 rounded-full bg-brand-blue block" />
                <span className="text-text-secondary">يومي (DAU)</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-3 h-0.5 rounded-full bg-brand-green block" />
                <span className="text-text-secondary">شهري (MAU)</span>
              </div>
            </div>
          </div>
          <div className="h-[280px]">
            {/* DAU line */}
            <AreaChart
              data={DAILY_USERS.map((d) => ({ label: d.day, value: d.dau }))}
              color="var(--brand-blue)"
              gradientFrom="var(--brand-blue)"
              gradientTo="transparent"
            />
          </div>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <div className="text-2xl font-bold tabular-nums text-text-primary">
                {Math.round((DAILY_USERS[DAILY_USERS.length - 1]?.dau ?? 0) / 1000)}K
              </div>
              <div className="text-[11px] text-text-tertiary mt-0.5">متوسط اليومي</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold tabular-nums text-text-primary">
                {Math.round((DAILY_USERS[DAILY_USERS.length - 1]?.mau ?? 0) / 1000)}K
              </div>
              <div className="text-[11px] text-text-tertiary mt-0.5">المستخدمون الشهريون</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold tabular-nums text-brand-green">
                +14.2%
              </div>
              <div className="text-[11px] text-text-tertiary mt-0.5">نسبة النمو</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold tabular-nums text-text-primary">
                4.2
              </div>
              <div className="text-[11px] text-text-tertiary mt-0.5">جلسات/مستخدم</div>
            </div>
          </div>
        </section>

        {/* ─── Peak Hours Heatmap ─── */}
        <section className="p-6 bg-surface rounded-card border border-border shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-text-primary">أوقات الذروة حسب اليوم</h2>
            <p className="text-xs text-text-tertiary mt-0.5">عدد الرحلات حسب الساعة واليوم (آخر ٣٠ يوم)</p>
          </div>
          <div className="mt-4">
            <PeakHoursHeatmap />
          </div>
        </section>

        {/* ─── Top Destinations + Retention ─── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Top Destinations */}
          <section className="p-6 bg-surface rounded-card border border-border shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-text-primary">أكثر الوجهات بحثاً</h2>
              <p className="text-xs text-text-tertiary mt-0.5">إجمالي مرات البحث عن الوجهات</p>
            </div>
            <TopDestinations data={DESTINATIONS} />
          </section>

          {/* Retention */}
          <section className="p-6 bg-surface rounded-card border border-border shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-text-primary">الاحتفاظ بالمستخدمين</h2>
              <p className="text-xs text-text-tertiary mt-0.5">نسبة العودة حسب الفوج</p>
            </div>
            <RetentionTable data={RETENTION_DATA} />
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}