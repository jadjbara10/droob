"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   دروب Droob — Dashboard Home Page
   KPI strip · Activity log table · Active alerts table
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from "react";
import { RefreshCw, AlertTriangle, Activity, Clock } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { KpiCardSkeleton, TableSkeleton } from "@/components/skeleton";
import { InlineError, EmptyState } from "@/components/error-boundary";
import { DataTable, type Column } from "@/components/data-table";
import { Panel } from "@/components/panel";
import {
  dashboardApi,
  activityApi,
  alertsApi,
  type ActivityRecord,
  type AlertRecord,
} from "@/lib/api";
import { formatRelativeTime, formatDateTime, entityTypeLabels, actionLabels } from "@/lib/utils";

export default function DashboardPage() {
  // KPI state
  const [kpis, setKpis] = useState<{
    active_users: number;
    trips_today: number;
    vehicles_active: number;
    vehicles_total: number;
    avg_delay_minutes: number;
  } | null>(null);
  const [kpiError, setKpiError] = useState(false);
  const [kpiLoading, setKpiLoading] = useState(true);

  // Activity state
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(false);

  // Alerts state
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState(false);

  async function fetchKpis() {
    setKpiLoading(true);
    setKpiError(false);
    try {
      const data = await dashboardApi.getKpis();
      setKpis(data);
    } catch {
      setKpiError(true);
    } finally {
      setKpiLoading(false);
    }
  }

  async function fetchActivity() {
    setActivityLoading(true);
    setActivityError(false);
    try {
      const data = await activityApi.list({ limit: 50 });
      setActivities(data.data);
      setActivityTotal(data.total);
    } catch {
      setActivityError(true);
    } finally {
      setActivityLoading(false);
    }
  }

  async function fetchAlerts() {
    setAlertsLoading(true);
    setAlertsError(false);
    try {
      const data = await alertsApi.list({ active: true, limit: 20 });
      setAlerts(data.data);
    } catch {
      setAlertsError(true);
    } finally {
      setAlertsLoading(false);
    }
  }

  useEffect(() => {
    fetchKpis();
    fetchActivity();
    fetchAlerts();
  }, []);

  // ─── Activity Columns ──────────────────────────────────────────────────

  const activityColumns: Column<ActivityRecord>[] = [
    {
      key: "user",
      header: "المستخدم",
      render: (row) => (
        <span>{row.user?.name || "—"}</span>
      ),
    },
    {
      key: "action",
      header: "الإجراء",
      render: (row) => {
        const colors: Record<string, string> = {
          create: "badge-success",
          update: "badge-info",
          delete: "badge-danger",
          import: "badge-purple",
          export: "badge-warn",
        };
        return (
          <span className={`badge ${colors[row.action] || "badge-info"}`}>
            {actionLabels[row.action] || row.action}
          </span>
        );
      },
    },
    {
      key: "entity",
      header: "النوع",
      render: (row) => (
        <span className="cell-mono">
          {entityTypeLabels[row.entity_type] || row.entity_type}
        </span>
      ),
    },
    {
      key: "details",
      header: "التفاصيل",
      render: (row) => {
        if (!row.details) return <span style={{ color: "var(--text-muted)" }}>—</span>;
        const detail = row.details as Record<string, unknown>;
        return (
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {detail.name_ar ? String(detail.name_ar) :
             detail.code ? String(detail.code) :
             detail.title_ar ? String(detail.title_ar) : "—"}
          </span>
        );
      },
    },
    {
      key: "time",
      header: "الوقت",
      render: (row) => (
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {formatRelativeTime(row.created_at)}
        </span>
      ),
    },
  ];

  // ─── Alerts Columns ────────────────────────────────────────────────────

  const alertColumns: Column<AlertRecord>[] = [
    {
      key: "severity",
      header: "المستوى",
      render: (row) => {
        const sevMap: Record<string, { cls: string; label: string }> = {
          critical: { cls: "badge-danger", label: "حرج" },
          warning: { cls: "badge-warn", label: "تحذير" },
          info: { cls: "badge-info", label: "معلومة" },
        };
        const s = sevMap[row.severity] || sevMap.info;
        return <span className={`badge ${s.cls}`}>{s.label}</span>;
      },
    },
    {
      key: "title",
      header: "العنوان",
      render: (row) => (
        <span style={{ fontWeight: 500 }}>{row.title_ar}</span>
      ),
    },
    {
      key: "type",
      header: "النوع",
      render: (row) => {
        const typeMap: Record<string, string> = {
          delay: "تأخير",
          diversion: "تحويل",
          station_closed: "إغلاق محطة",
          emergency: "طوارئ",
          maintenance: "صيانة",
        };
        return <span className="cell-mono">{typeMap[row.type] || row.type}</span>;
      },
    },
    {
      key: "governorate",
      header: "المحافظة",
      render: (row) => (
        <span>{row.governorate || "عام"}</span>
      ),
    },
    {
      key: "time",
      header: "البداية",
      render: (row) => (
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {formatDateTime(row.start_at)}
        </span>
      ),
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div>
      {/* KPI Strip */}
      <div className="kpi-grid">
        {kpiLoading ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : kpiError ? (
          <div style={{ gridColumn: "1 / -1" }}>
            <InlineError
              message="فشل تحميل الإحصائيات"
              onRetry={fetchKpis}
            />
          </div>
        ) : kpis ? (
          <>
            <div className="animate-fade-up stagger-1">
              <KpiCard
                label="المستخدمين النشطين"
                value={kpis.active_users}
                accent="accent"
              />
            </div>
            <div className="animate-fade-up stagger-2">
              <KpiCard
                label="رحلات اليوم"
                value={kpis.trips_today}
                accent="accent-2"
              />
            </div>
            <div className="animate-fade-up stagger-3">
              <KpiCard
                label="المركبات النشطة"
                value={kpis.vehicles_active}
                suffix={`/ ${kpis.vehicles_total}`}
                accent="warn"
              />
            </div>
            <div className="animate-fade-up stagger-4">
              <KpiCard
                label="متوسط التأخير"
                value={kpis.avg_delay_minutes || 0}
                suffix="دقيقة"
                accent="purple"
              />
            </div>
          </>
        ) : null}
      </div>

      {/* Bottom Row: Activity Log + Active Alerts */}
      <div className="bottom-row">
        {/* Activity Log */}
        <div className="animate-fade-up stagger-4">
          <Panel
            title="سجل النشاطات"
            subtitle={`آخر ${activityTotal} إجراء`}
            headerRight={
              <button className="btn btn-sm" onClick={fetchActivity}>
                <RefreshCw size={12} />
                تحديث
              </button>
            }
          >
            {activityError ? (
              <InlineError message="فشل تحميل سجل النشاطات" onRetry={fetchActivity} />
            ) : activityLoading ? (
              <TableSkeleton rows={6} cols={5} />
            ) : activities.length === 0 ? (
              <EmptyState message="لا توجد نشاطات بعد" />
            ) : (
              <DataTable
                columns={activityColumns}
                data={activities as unknown as Record<string, unknown>[]}
                searchKeys={[]}
                defaultPageSize={10}
                pageSizeOptions={[10, 25, 50]}
              />
            )}
          </Panel>
        </div>

        {/* Active Alerts */}
        <div className="animate-fade-up stagger-5">
          <Panel
            title="التنبيهات النشطة"
            subtitle={`${alerts.length} تنبيه`}
            headerRight={
              <button className="btn btn-sm" onClick={fetchAlerts}>
                <RefreshCw size={12} />
                تحديث
              </button>
            }
            noPadding
          >
            {alertsError ? (
              <div style={{ padding: 20 }}>
                <InlineError message="فشل تحميل التنبيهات" onRetry={fetchAlerts} />
              </div>
            ) : alertsLoading ? (
              <TableSkeleton rows={4} cols={5} />
            ) : alerts.length === 0 ? (
              <EmptyState message="لا توجد تنبيهات نشطة" />
            ) : (
              <DataTable
                columns={alertColumns}
                data={alerts as unknown as Record<string, unknown>[]}
                searchKeys={[]}
                defaultPageSize={10}
                pageSizeOptions={[10, 25]}
              />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
