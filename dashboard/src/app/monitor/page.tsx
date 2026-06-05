// ============================================================================
// دروب (Droob) — Real-Time Monitoring Dashboard
// Live KPIs + full-width vehicle map + active alerts + recent activity
// WebSocket toggle for live vehicle positions | Auto-refresh indicators
// ============================================================================

"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import KpiCard from "@/components/ui/KpiCard";
import { SeverityBadge } from "@/components/ui/StatusBadge";
import { PulseDot } from "@/components/ui/StatusBadge";
import { LiveVehicleMap } from "@/components/maps/LiveVehicleMap";
import { useKpis, useAlerts, useApiPolling, useVehicles } from "@/lib/hooks";
import { io, Socket } from "socket.io-client";
import type { AlertItem, VehicleItem } from "@/lib/api";

// ─── Icons ─────────────────────────────────────────────────────────────────

const TruckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="2" />
    <polygon points="16,8 20,8 23,11 23,16 16,16 16,8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const TripIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
);

const AlertIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ActivityIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
  </svg>
);

const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

// ─── WebSocket Connection (same pattern as fleet page) ─────────────────────

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "wss://api.droob.jo";

function useMonitorWebSocket(
  onVehicleUpdate: (vehicle: Partial<VehicleItem>) => void,
  onConnectionChange: (connected: boolean) => void
) {
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(WS_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    socket.on("connect", () => {
      console.log("[Monitor WS] Connected to", WS_URL);
      onConnectionChange(true);
      socket.emit("subscribe", { channel: "fleet:positions" });
    });

    socket.on("vehicle:position", (data: Partial<VehicleItem>) => {
      onVehicleUpdate(data);
    });

    socket.on("vehicle:status", (data: Partial<VehicleItem>) => {
      onVehicleUpdate(data);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Monitor WS] Disconnected:", reason);
      onConnectionChange(false);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Monitor WS] Connection error:", err.message);
      onConnectionChange(false);
    });

    socketRef.current = socket;
  }, [onVehicleUpdate, onConnectionChange]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    onConnectionChange(false);
  }, [onConnectionChange]);

  return { connect, disconnect, socketRef };
}

// ─── Activity Item Type ────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  type: "vehicle_arrived" | "vehicle_departed" | "alert_triggered" | "delay_reported" | "route_change";
  message: string;
  timestamp: string;
}

// ─── Auto-refresh indicator hook ───────────────────────────────────────────

function useLastUpdated(loading: boolean) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (!loading) {
      setLastUpdated(new Date());
    }
  }, [loading]);

  useEffect(() => {
    if (!lastUpdated) return;
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  return secondsAgo;
}

// ─── Main Page Component ───────────────────────────────────────────────────

export default function MonitorPage() {
  // ── Data Hooks ──────────────────────────────────────────────────────────
  const { data: kpis, loading: kpisLoading, error: kpisError } = useKpis();
  const { data: alerts, loading: alertsLoading } = useAlerts();
  const { data: vehicleData, loading: vehiclesLoading } = useVehicles();

  // ── WebSocket State ─────────────────────────────────────────────────────
  const [wsConnected, setWsConnected] = useState(false);
  const [useWs, setUseWs] = useState(false);
  const [wsEventCount, setWsEventCount] = useState(0);

  const handleWsVehicleUpdate = useCallback((update: Partial<VehicleItem>) => {
    console.log("[Monitor] WS vehicle update:", update.id || update.plate);
    setWsEventCount((c) => c + 1);
  }, []);

  const { connect: wsConnect, disconnect: wsDisconnect } = useMonitorWebSocket(
    handleWsVehicleUpdate,
    setWsConnected
  );

  useEffect(() => {
    if (useWs) {
      wsConnect();
    } else {
      wsDisconnect();
    }
    return () => { wsDisconnect(); };
  }, [useWs, wsConnect, wsDisconnect]);

  // Reconnect on visibility change
  useEffect(() => {
    if (!useWs) return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && useWs && !wsConnected) {
        wsConnect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [useWs, wsConnected, wsConnect]);

  // ── Auto-refresh indicators ─────────────────────────────────────────────
  const kpiAge = useLastUpdated(kpisLoading);
  const alertsAge = useLastUpdated(alertsLoading);

  // ── Active Alerts (filtered) ────────────────────────────────────────────
  const activeAlerts = useMemo(() => {
    if (!alerts) return [];
    return alerts.filter((a) => a.status === "active").slice(0, 10);
  }, [alerts]);

  // ── Compute KPI values ──────────────────────────────────────────────────
  const activeVehicles = kpis?.vehicles_active ?? 0;
  const totalVehicles = kpis?.vehicles_total ?? 0;
  const tripsToday = kpis?.trips_today ?? 0;
  const onTimePct = kpis?.avg_delay_minutes
    ? Math.max(0, Math.min(100, Math.round(100 - kpis.avg_delay_minutes * 2)))
    : 95;
  const activeAlertCount = activeAlerts.length;

  // ── Header Actions ──────────────────────────────────────────────────────
  const headerProps = {
    title: "المراقبة المباشرة",
    breadcrumb: [
      { label: "الرئيسية", href: "/" },
      { label: "المراقبة المباشرة" },
    ],
    actions: (
      <div className="flex items-center gap-3">
        {/* WebSocket toggle */}
        <button
          onClick={() => setUseWs((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-pill text-[11px] font-semibold transition-all ${
            useWs
              ? wsConnected
                ? "bg-brand-green/15 text-brand-green border border-brand-green/30"
                : "bg-delayed/15 text-delayed border border-delayed/30"
              : "bg-surface-2 text-secondary border border-gray-700 hover:bg-surface-3"
          }`}
          title={useWs ? (wsConnected ? "WebSocket متصل" : "WebSocket غير متصل") : "تفعيل الاتصال المباشر"}
        >
          <span className={`w-1.5 h-1.5 rounded-full inline-block ml-1.5 ${
            useWs ? (wsConnected ? "bg-brand-green animate-pulse" : "bg-delayed") : "bg-muted"
          }`} />
          {useWs ? (wsConnected ? "مباشر" : "جاري الاتصال...") : "WebSocket"}
        </button>
        <PulseDot color={kpisLoading ? "bg-text-tertiary" : "bg-on-time"} size="w-2 h-2" />
        <span className="text-xs tabular-nums text-secondary">
          {kpisLoading ? "جاري التحميل..." : `${activeVehicles} مركبة نشطة`}
        </span>
      </div>
    ),
  };

  return (
    <DashboardShell headerProps={headerProps}>
      <div className="flex flex-col gap-4">
        {/* ─── KPI Row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          <KpiCard
            label="المركبات النشطة"
            value={kpisLoading ? "—" : `${activeVehicles}`}
            icon={<TruckIcon className="w-5 h-5" />}
            variant="default"
          />
          <KpiCard
            label="الرحلات اليوم"
            value={kpisLoading ? "—" : tripsToday}
            icon={<TripIcon className="w-5 h-5" />}
            variant="default"
          />
          <KpiCard
            label="نسبة الالتزام"
            value={kpisLoading ? "—" : `${onTimePct}%`}
            icon={<ClockIcon className="w-5 h-5" />}
            variant={onTimePct >= 90 ? "success" : onTimePct >= 70 ? "warning" : "danger"}
          />
          <KpiCard
            label="التنبيهات النشطة"
            value={kpisLoading ? "—" : activeAlertCount}
            icon={<AlertIcon className="w-5 h-5" />}
            variant={activeAlertCount > 0 ? "danger" : "success"}
          />
        </div>

        {/* ─── Auto-refresh indicators ──────────────────────────────────── */}
        <div className="flex items-center gap-4 text-[10px] text-text-tertiary -mt-2">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-on-time" />
            المؤشرات: آخر تحديث منذ {kpiAge} ثواني
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-on-time" />
            التنبيهات: آخر تحديث منذ {alertsAge} ثواني
          </span>
          {useWs && (
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-brand-green" : "bg-delayed"}`} />
              WebSocket {wsConnected ? "متصل" : "غير متصل"}
              {wsEventCount > 0 && ` (${wsEventCount} حدث)`}
            </span>
          )}
        </div>

        {/* ─── Full-width Live Map ──────────────────────────────────────── */}
        <div className="bg-surface rounded-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary">خريطة المركبات المباشرة</h3>
            <span className="text-[10px] text-text-tertiary">
              {useWs ? "تحديث فوري عبر WebSocket" : "تحديث تلقائي كل ١٥ ثانية"}
            </span>
          </div>
          <div className="h-[400px]">
            <LiveVehicleMap />
          </div>
        </div>

        {/* ─── Bottom Row: Alerts + Activity ────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Bottom-left: Active Alerts Feed */}
          <div className="bg-surface rounded-card border border-border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellIcon className="w-4 h-4 text-text-tertiary" />
                <h3 className="text-sm font-bold text-primary">التنبيهات النشطة</h3>
              </div>
              {activeAlerts.length > 0 && (
                <span className="text-[10px] bg-cancelled/10 text-cancelled px-1.5 py-0.5 rounded-pill font-bold">
                  {activeAlerts.length}
                </span>
              )}
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {alertsLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 bg-surface-2 rounded-card animate-pulse" />
                  ))}
                </div>
              ) : activeAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-text-tertiary">
                  <svg className="w-12 h-12 mb-2 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span className="text-sm">لا توجد تنبيهات نشطة</span>
                  <span className="text-xs mt-1">كل شيء يعمل بسلاسة</span>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activeAlerts.map((alert: AlertItem) => (
                    <div key={alert.id} className="px-4 py-3 hover:bg-surface-2/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <SeverityBadge severity={alert.severity as "info" | "warning" | "critical"} />
                            <span className="text-[10px] text-text-tertiary tabular-nums">
                              {new Date(alert.created_at).toLocaleString("ar-JO")}
                            </span>
                          </div>
                          <p className="text-sm text-primary font-medium truncate-2">
                            {alert.title_ar}
                          </p>
                          {alert.affected_lines && alert.affected_lines.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {alert.affected_lines.map((line: string) => (
                                <span key={line} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-2 text-text-secondary">
                                  {line}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom-right: Recent Activity Stream */}
          <div className="bg-surface rounded-card border border-border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ActivityIcon className="w-4 h-4 text-text-tertiary" />
                <h3 className="text-sm font-bold text-primary">النشاطات الأخيرة</h3>
              </div>
            </div>
            <div className="max-h-[320px] overflow-y-auto flex flex-col items-center justify-center py-10 text-text-tertiary">
              <svg className="w-12 h-12 mb-2 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
              </svg>
              <span className="text-sm">قريباً</span>
              <span className="text-xs mt-1">سجلات النشاط قيد التطوير</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
