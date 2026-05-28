// ============================================================================
// دروب (Droob) — Main Dashboard Page
// KPIs | Live Vehicle Map | Line Health Grid | Hourly Trips | Mode Split
// Recent Alerts Feed
// ============================================================================

"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import KpiCard from "@/components/ui/KpiCard";
import StatusBadge, { PulseDot, OccupancyDots } from "@/components/ui/StatusBadge";
import { LiveVehicleMap } from "@/components/maps/LiveVehicleMap";
import { AreaChart, DonutChart } from "@/components/ui/Charts";

// ─── Types ─────────────────────────────────────────────────────────────────

interface KpiData {
  label: string;
  value: string | number;
  trend?: { value: string; direction: "up" | "down" };
  sparkline?: { values: number[]; trend: "up" | "down" | "flat" };
  icon: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}

interface LineHealth {
  code: string;
  nameAr: string;
  status: "on_time" | "delayed" | "cancelled";
  vehicles: number;
  onTimePercent: number;
}

interface AlertItem {
  id: string;
  severity: "info" | "warning" | "critical";
  message: string;
  time: string;
  lineCode?: string;
}

// ─── Icons ─────────────────────────────────────────────────────────────────

const BusIcon: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="14" rx="3" />
    <line x1="6" y1="8" x2="16" y2="8" />
    <line x1="6" y1="12" x2="14" y2="12" />
    <circle cx="6.5" cy="19.5" r="1.5" />
    <circle cx="17.5" cy="19.5" r="1.5" />
  </svg>
);

const PassengersIcon: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ClockIcon: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
);

const AlertIcon: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const RoadIcon: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19L2 5h20l-2 14H4z" />
    <line x1="7" y1="9" x2="7" y2="11" />
  </svg>
);

// ─── Mock Data ──────────────────────────────────────────────────────────────

const KPI_DATA: KpiData[] = [
  {
    label: "المركبات النشطة",
    value: 12450,
    trend: { value: "+12%", direction: "up" },
    sparkline: { values: [9800, 10200, 10100, 10800, 11200, 11500, 11800, 12000, 12200, 12450], trend: "up" },
    icon: <BusIcon />,
    variant: "default",
  },
  {
    label: "إجمالي الركاب اليوم",
    value: 89420,
    trend: { value: "+8.5%", direction: "up" },
    sparkline: { values: [72000, 75000, 73000, 78000, 80000, 83000, 85000, 86000, 88000, 89420], trend: "up" },
    icon: <PassengersIcon />,
    variant: "success",
  },
  {
    label: "نسبة الالتزام بالمواعيد",
    value: "94.2%",
    trend: { value: "-1.2%", direction: "down" },
    sparkline: { values: [95, 96, 95.5, 95, 94.8, 94.5, 94.3, 94, 94.1, 94.2], trend: "down" },
    icon: <ClockIcon />,
    variant: "warning",
  },
  {
    label: "تنبيهات نشطة",
    value: 12,
    icon: <AlertIcon />,
    variant: "danger",
  },
  {
    label: "خطوط قيد التشغيل",
    value: 87,
    trend: { value: "+3", direction: "up" },
    sparkline: { values: [78, 80, 81, 82, 83, 83, 84, 85, 86, 87], trend: "up" },
    icon: <RoadIcon />,
    variant: "default",
  },
];

const LINE_HEALTH: LineHealth[] = [
  { code: "BRT1", nameAr: "باص سريع ١", status: "on_time", vehicles: 45, onTimePercent: 97 },
  { code: "BRT2", nameAr: "باص سريع ٢", status: "delayed", vehicles: 38, onTimePercent: 84 },
  { code: "BRT3", nameAr: "باص سريع ٣", status: "on_time", vehicles: 42, onTimePercent: 95 },
  { code: "B100", nameAr: "باص رقم ١٠٠", status: "on_time", vehicles: 28, onTimePercent: 92 },
  { code: "B200", nameAr: "باص رقم ٢٠٠", status: "delayed", vehicles: 22, onTimePercent: 78 },
  { code: "B300", nameAr: "باص رقم ٣٠٠", status: "cancelled", vehicles: 0, onTimePercent: 0 },
  { code: "B400", nameAr: "باص رقم ٤٠٠", status: "on_time", vehicles: 35, onTimePercent: 96 },
  { code: "B500", nameAr: "باص رقم ٥٠٠", status: "on_time", vehicles: 31, onTimePercent: 91 },
  { code: "B600", nameAr: "باص رقم ٦٠٠", status: "delayed", vehicles: 19, onTimePercent: 72 },
  { code: "B700", nameAr: "باص رقم ٧٠٠", status: "on_time", vehicles: 40, onTimePercent: 93 },
  { code: "B800", nameAr: "باص رقم ٨٠٠", status: "on_time", vehicles: 25, onTimePercent: 88 },
  { code: "B900", nameAr: "باص رقم ٩٠٠", status: "on_time", vehicles: 33, onTimePercent: 90 },
];

const RECENT_ALERTS: AlertItem[] = [
  { id: "1", severity: "critical", message: "توقف خط BRT2 بسبب حادث مروري قرب دوار الداخلية", time: "قبل ٣ دقائق", lineCode: "BRT2" },
  { id: "2", severity: "warning", message: "تأخير ١٥ دقيقة على خط B100 بسبب ازدحام", time: "قبل ٨ دقائق", lineCode: "B100" },
  { id: "3", severity: "info", message: "إضافة مركبتين إضافيتين على خط BRT1 لتلبية الطلب", time: "قبل ١٥ دقيقة", lineCode: "BRT1" },
  { id: "4", severity: "warning", message: "تحويلة مؤقتة على خط B600 بسبب أعمال صيانة", time: "قبل ٢٢ دقيقة", lineCode: "B600" },
  { id: "5", severity: "critical", message: "إلغاء رحلات خط B300 حتى إشعار آخر", time: "قبل ٣٥ دقيقة", lineCode: "B300" },
  { id: "6", severity: "info", message: "تشغيل مسار جديد من صويلح إلى المدينة الرياضية", time: "قبل ٤٥ دقيقة" },
];

const HOURLY_TRIPS = [
  { hour: "٦ص", value: 240 },
  { hour: "٧ص", value: 520 },
  { hour: "٨ص", value: 680 },
  { hour: "٩ص", value: 590 },
  { hour: "١٠ص", value: 480 },
  { hour: "١١ص", value: 410 },
  { hour: "١٢م", value: 380 },
  { hour: "١م", value: 360 },
  { hour: "٢م", value: 420 },
  { hour: "٣م", value: 510 },
  { hour: "٤م", value: 580 },
  { hour: "٥م", value: 620 },
  { hour: "٦م", value: 550 },
  { hour: "٧م", value: 460 },
  { hour: "٨م", value: 350 },
  { hour: "٩م", value: 280 },
];

const MODE_SPLIT = [
  { name: "باص مدني", value: 45, color: "#0066CC" },
  { name: "باص سريع", value: 25, color: "#E60026" },
  { name: "سرفيس", value: 18, color: "#FF8C00" },
  { name: "بين مدن", value: 12, color: "#6B21A8" },
];

// ─── Line Health Card Component ─────────────────────────────────────────────

const LineHealthCard: React.FC<{ line: LineHealth }> = ({ line }) => (
  <div className="flex items-center gap-3 p-3 bg-surface rounded-card border border-border hover:shadow-sm hover:border-brand-blue/30 transition-all cursor-pointer group">
    {/* Line code badge */}
    <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center flex-shrink-0 font-bold text-sm text-text-primary">
      {line.code}
    </div>

    {/* Line info */}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-text-primary truncate">{line.nameAr}</p>
      <div className="flex items-center gap-2 mt-0.5">
        <StatusBadge status={line.status} size="sm" />
        <span className="text-[11px] text-text-tertiary">
          {line.vehicles} مركبة
        </span>
      </div>
    </div>

    {/* Mini bar */}
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${line.onTimePercent}%`,
            backgroundColor:
              line.onTimePercent >= 90
                ? "var(--on-time, #16A34A)"
                : line.onTimePercent >= 70
                  ? "var(--delayed, #EAB308)"
                  : "var(--cancelled, #DC2626)",
          }}
        />
      </div>
      <span className="text-xs text-text-secondary tabular-nums w-8 text-right font-medium">
        {line.onTimePercent}%
      </span>
    </div>
  </div>
);

// ─── Alert Row Component ────────────────────────────────────────────────────

const severityColors: Record<string, string> = {
  info: "bg-brand-blue",
  warning: "bg-delayed",
  critical: "bg-cancelled",
};

const AlertRow: React.FC<{ alert: AlertItem }> = ({ alert }) => (
  <div className="flex items-start gap-3 px-4 py-3 hover:bg-surface-2 transition-colors cursor-pointer border-b border-border last:border-b-0">
    {/* Severity indicator */}
    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${severityColors[alert.severity]}`} />

    <div className="flex-1 min-w-0">
      <p className="text-sm text-text-primary mb-0.5">{alert.message}</p>
      <div className="flex items-center gap-2">
        {alert.lineCode && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-2 text-text-secondary">
            {alert.lineCode}
          </span>
        )}
        <span className="text-[11px] text-text-tertiary">{alert.time}</span>
      </div>
    </div>

    {/* Quick action */}
    <button className="text-xs px-2 py-1 rounded-input bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20 transition-colors flex-shrink-0 font-medium">
      حل المشكلة
    </button>
  </div>
);

// ─── Page Component ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [selectedLine, setSelectedLine] = useState<string | null>(null);

  const headerProps = {
    title: "لوحة التحكم",
    actions: (
      <div className="flex items-center gap-2">
        {/* Live indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-card bg-surface border border-border shadow-sm">
          <PulseDot color="bg-on-time" size="w-2 h-2" />
          <span className="text-xs font-medium text-text-secondary">مباشر</span>
          <div className="w-px h-4 bg-border" />
          <span className="text-[11px] tabular-nums text-text-tertiary">3:42 م</span>
        </div>
      </div>
    ),
  };

  return (
    <DashboardShell headerProps={headerProps}>
      <div className="space-y-6">
        {/* ─── KPI Cards Row ─── */}
        <div className="grid grid-cols-5 gap-4">
          {KPI_DATA.map((kpi, idx) => (
            <KpiCard
              key={idx}
              label={kpi.label}
              value={kpi.value}
              trend={kpi.trend}
              sparkline={kpi.sparkline}
              icon={kpi.icon}
              variant={kpi.variant}
            />
          ))}
        </div>

        {/* ─── Live Map ─── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-text-primary">الخريطة المباشرة</h2>
              <p className="text-xs text-text-tertiary mt-0.5">مواقع المركبات في الوقت الحقيقي</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Mode legend (compact) */}
              {[
                { color: "#0066CC", label: "باص مدني" },
                { color: "#E60026", label: "باص سريع" },
                { color: "#FF8C00", label: "سرفيس" },
                { color: "#6B21A8", label: "بين مدن" },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                  {m.label}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-card border border-border overflow-hidden shadow-sm bg-surface">
            <LiveVehicleMap />
          </div>
        </section>

        {/* ─── Line Health Grid ─── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-text-primary">حالة الخطوط</h2>
              <p className="text-xs text-text-tertiary mt-0.5">مراقبة أداء جميع الخطوط</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-on-time" />
                <span className="text-text-secondary">ملتزم</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-delayed" />
                <span className="text-text-secondary">متأخر</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cancelled" />
                <span className="text-text-secondary">متوقف</span>
              </span>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-3">
            {LINE_HEALTH.map((line) => (
              <div key={line.code} onClick={() => setSelectedLine(line.code === selectedLine ? null : line.code)}>
                <LineHealthCard line={line} />
              </div>
            ))}
          </div>
        </section>

        {/* ─── Charts Row ─── */}
        <div className="grid grid-cols-3 gap-4">
          {/* Hourly Trips */}
          <div className="col-span-2 p-4 bg-surface rounded-card border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-text-primary">الرحلات بالساعة</h3>
                <p className="text-[11px] text-text-tertiary">اليوم، ٣:٤٢ م</p>
              </div>
            </div>
            <div className="h-[220px]">
              <AreaChart
                data={HOURLY_TRIPS.map((d) => ({ label: d.hour, value: d.value }))}
                color="var(--brand-blue)"
                gradientFrom="var(--brand-blue)"
                gradientTo="transparent"
              />
            </div>
          </div>

          {/* Mode Split */}
          <div className="p-4 bg-surface rounded-card border border-border shadow-sm">
            <div className="mb-4">
              <h3 className="text-base font-bold text-text-primary">توزيع الرحلات</h3>
              <p className="text-[11px] text-text-tertiary">حسب النوع</p>
            </div>
            <div className="h-[220px] flex items-center justify-center">
              <DonutChart data={MODE_SPLIT} />
            </div>
          </div>
        </div>

        {/* ─── Recent Alerts Sidebar ─── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-text-primary">آخر التنبيهات</h2>
              <span className="px-2 py-0.5 rounded-pill bg-cancelled/10 text-cancelled text-[11px] font-semibold">
                {RECENT_ALERTS.filter((a) => a.severity === "critical").length} عاجل
              </span>
            </div>
            <button className="text-xs font-medium text-brand-blue hover:text-brand-blue/80 transition-colors">
              عرض الكل ←
            </button>
          </div>
          <div className="bg-surface rounded-card border border-border shadow-sm overflow-hidden">
            {RECENT_ALERTS.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}