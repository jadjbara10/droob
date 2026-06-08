"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   دروب Droob — Reports & Analytics Page
   Route stats, system health, API usage, DB stats
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from "react";
import { RefreshCw, BarChart3, Database, Cpu, Activity } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { KpiCardSkeleton, SkeletonCard } from "@/components/skeleton";
import { InlineError } from "@/components/error-boundary";
import { Panel } from "@/components/panel";
import { dashboardApi, adminApi } from "@/lib/api";
import { modeLabels } from "@/lib/utils";

export default function ReportsPage() {
  const [routeStats, setRouteStats] = useState<{ mode: string; count: number; active_count: number }[]>([]);
  const [dbStats, setDbStats] = useState<{
    total_routes: number; total_stops: number; total_vehicles: number;
    total_users: number; total_ads: number; db_size: string;
  } | null>(null);
  const [sysHealth, setSysHealth] = useState<{
    cpu_percent: number; memory_used_gb: number; memory_total_gb: number;
    uptime_hours: number; status: string;
  } | null>(null);
  const [apiUsage, setApiUsage] = useState<{
    requests_today: number; requests_this_hour: number; error_rate_pct: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function fetchAll() {
    setLoading(true);
    setError(false);
    try {
      const [rStats, db, health, usage] = await Promise.all([
        dashboardApi.getRouteStats(),
        adminApi.getDbStats(),
        adminApi.getSystemHealth(),
        adminApi.getApiUsage(),
      ]);
      setRouteStats(rStats.data);
      setDbStats(db);
      setSysHealth(health);
      setApiUsage(usage);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  if (error) return <InlineError message="فشل تحميل التقارير" onRetry={fetchAll} />;

  return (
    <div>
      {/* Route Distribution */}
      <div style={{ marginBottom: 20 }}>
        <Panel
          title="توزيع الخطوط حسب النوع"
          subtitle={`${routeStats.reduce((s, r) => s + r.count, 0)} خط`}
          headerRight={<button className="btn btn-sm" onClick={fetchAll}><RefreshCw size={12} /> تحديث</button>}
        >
          {loading ? (
            <div className="kpi-grid">
              {[1, 2, 3, 4].map((i) => <KpiCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="kpi-grid">
              {routeStats.map((stat) => (
                <div key={stat.mode} className="animate-fade-up">
                  <KpiCard
                    label={modeLabels[stat.mode] || stat.mode}
                    value={stat.count}
                    suffix="خط"
                    accent={stat.mode === "city_bus" ? "accent" : stat.mode === "brt" ? "warn" : stat.mode === "serveece" ? "accent-2" : "purple"}
                  />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* DB & System Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Panel title="قاعدة البيانات" subtitle="إحصائيات" headerRight={<Database size={16} style={{ color: "var(--text-muted)" }} />}>
          {loading ? (
            <div style={{ display: "grid", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                  <div className="skeleton" style={{ width: "40%", height: 14 }} />
                  <div className="skeleton" style={{ width: "20%", height: 14 }} />
                </div>
              ))}
            </div>
          ) : dbStats ? (
            <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
              <StatRow label="الخطوط" value={dbStats.total_routes.toLocaleString("ar-JO")} />
              <StatRow label="المحطات" value={dbStats.total_stops.toLocaleString("ar-JO")} />
              <StatRow label="المركبات" value={dbStats.total_vehicles.toLocaleString("ar-JO")} />
              <StatRow label="المستخدمين" value={dbStats.total_users.toLocaleString("ar-JO")} />
              <StatRow label="الإعلانات" value={dbStats.total_ads.toLocaleString("ar-JO")} />
              <StatRow label="الحجم" value={dbStats.db_size} />
            </div>
          ) : null}
        </Panel>

        <div style={{ display: "grid", gap: 16 }}>
          <Panel title="حالة النظام" headerRight={<Cpu size={16} style={{ color: "var(--text-muted)" }} />}>
            {loading ? (
              <div style={{ display: "grid", gap: 8 }}>
                {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 14 }} />)}
              </div>
            ) : sysHealth ? (
              <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
                <StatRow label="المعالج" value={`${sysHealth.cpu_percent}%`} />
                <StatRow label="الذاكرة" value={`${sysHealth.memory_used_gb} / ${sysHealth.memory_total_gb} GB`} />
                <StatRow label="وقت التشغيل" value={`${sysHealth.uptime_hours} ساعة`} />
                <StatRow label="الحالة" value={sysHealth.status === "healthy" ? "✅ سليم" : sysHealth.status === "degraded" ? "⚠️ متدهور" : "❌ معطل"} />
              </div>
            ) : null}
          </Panel>

          <Panel title="استخدام API" headerRight={<Activity size={16} style={{ color: "var(--text-muted)" }} />}>
            {loading ? (
              <div style={{ display: "grid", gap: 8 }}>
                {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 14 }} />)}
              </div>
            ) : apiUsage ? (
              <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
                <StatRow label="طلبات اليوم" value={apiUsage.requests_today.toLocaleString("ar-JO")} />
                <StatRow label="طلبات الساعة" value={apiUsage.requests_this_hour.toLocaleString("ar-JO")} />
                <StatRow label="نسبة الأخطاء" value={`${apiUsage.error_rate_pct}%`} />
              </div>
            ) : null}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span className="mono" style={{ color: "var(--text-primary)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
