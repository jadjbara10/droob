// ============================================================================
// دروب (Droob) — Fleet Management Page
// Vehicle table + live map split view | Status chips | Speed gauges
// WebSocket real-time updates toggle alongside REST polling
// ============================================================================

"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { PulseDot } from "@/components/ui/StatusBadge";
import { LiveVehicleMap } from "@/components/maps/LiveVehicleMap";
import { useVehicles, useAddVehicle } from "@/lib/hooks";
import type { VehicleItem } from "@/lib/api";
import { io, Socket } from "socket.io-client";

// ─── Types ─────────────────────────────────────────────────────────────────

type VehicleStatus = "active" | "inactive" | "out_of_service";

interface Vehicle {
  id: string;
  lineCode: string;
  lineNameAr: string;
  driverNameAr: string;
  speed: number;
  status: VehicleStatus;
  lastUpdate: string;
  occupancy: "empty" | "partial" | "full";
  lat: number;
  lng: number;
  heading: number;
}

// ─── Icons ─────────────────────────────────────────────────────────────────

const EmptyFleetIcon: React.FC = () => (
  <svg className="w-24 h-24 text-muted/30" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="15" y="25" width="70" height="50" rx="10" />
    <line x1="25" y1="38" x2="65" y2="38" />
    <line x1="25" y1="48" x2="55" y2="48" />
    <circle cx="30" cy="82" r="6" />
    <circle cx="70" cy="82" r="6" />
    <path d="M45 62l10-10 10 10" />
    <line x1="55" y1="52" x2="55" y2="68" />
    <path d="M10 15l80 80" strokeWidth="2" opacity="0.3" />
  </svg>
);

// ─── Speed Gauge Mini ──────────────────────────────────────────────────────

const SpeedGauge: React.FC<{ speed: number; maxSpeed?: number }> = ({ speed, maxSpeed = 120 }) => {
  const pct = Math.min((speed / maxSpeed) * 100, 100);
  const color =
    speed < 40
      ? "var(--on-time, #16A34A)"
      : speed < 70
        ? "var(--delayed, #EAB308)"
        : "var(--cancelled, #DC2626)";

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs tabular-nums w-10 text-secondary text-right font-medium">
        {speed.toLocaleString("ar-JO")}
        <span className="text-[10px] text-muted ml-0.5">كم/س</span>
      </span>
    </div>
  );
};

// ─── Occupancy Mini ────────────────────────────────────────────────────────

const OccupancyMini: React.FC<{ level: "empty" | "partial" | "full" }> = ({ level }) => {
  const filled = level === "empty" ? 0 : level === "partial" ? 1 : 3;
  const label = level === "empty" ? "فارغ" : level === "partial" ? "متوسط" : "ممتلئ";
  return (
    <div className="flex items-center gap-1.5" title={label}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-colors ${
            i < filled ? "bg-brand-green" : "bg-gray-700"
          }`}
        />
      ))}
      <span className="text-[10px] text-muted">{label}</span>
    </div>
  );
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const mapVehicle = (v: VehicleItem): Vehicle => ({
  id: v.id || v.plate,
  lineCode: v.line_code,
  lineNameAr: v.line_code,
  driverNameAr: v.driver,
  speed: v.speed,
  status: (["active", "inactive", "out_of_service"].includes(v.status) ? v.status : "active") as VehicleStatus,
  lastUpdate: "لحظي",
  occupancy: "partial" as const,
  lat: v.lat,
  lng: v.lng,
  heading: 0,
});

// ─── WebSocket Connection Helper ─────────────────────────────────────────

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "wss://api.droob.jo";

function useFleetWebSocket(
  onVehicleUpdate: (vehicle: Partial<VehicleItem>) => void,
  onConnectionChange: (connected: boolean) => void
) {
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(WS_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    socket.on("connect", () => {
      console.log("[Fleet WS] Connected to", WS_URL);
      onConnectionChange(true);
      socket.emit("subscribe", { channel: "fleet:positions" });
    });

    socket.on("vehicle:position", (data: Partial<VehicleItem>) => {
      console.log("[Fleet WS] Position update:", data.id || data.plate);
      onVehicleUpdate(data);
    });

    socket.on("vehicle:status", (data: Partial<VehicleItem>) => {
      console.log("[Fleet WS] Status change:", data.id || data.plate);
      onVehicleUpdate(data);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Fleet WS] Disconnected:", reason);
      onConnectionChange(false);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Fleet WS] Connection error:", err.message);
      onConnectionChange(false);
    });

    socketRef.current = socket;
  }, [onVehicleUpdate, onConnectionChange]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    onConnectionChange(false);
  }, [onConnectionChange]);

  return { connect, disconnect, socketRef };
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function FleetManagementPage() {
  const { data: vehicleData, loading, error: fetchError, refetch } = useVehicles();
  const { execute: addVehicle, loading: addingVehicle, error: addError } = useAddVehicle();

  const vehicles = useMemo(() => (vehicleData || []).map(mapVehicle), [vehicleData]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "all">("all");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Vehicle; dir: "asc" | "desc" } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVehicle, setNewVehicle] = useState<Partial<VehicleItem>>({
    plate: "", driver: "", line_code: "", governorate: "عمان",
    status: "active", mode: "bus",
  });

  // ── WebSocket State ──────────────────────────────────────────────────────
  const [wsConnected, setWsConnected] = useState(false);
  const [useWs, setUseWs] = useState(false);
  const [wsEventCount, setWsEventCount] = useState(0);

  const handleWsVehicleUpdate = useCallback((update: Partial<VehicleItem>) => {
    console.log("[Fleet] WS update received:", update);
    setWsEventCount((c) => c + 1);
    // TODO: Merge WS position events into vehicle data for live map markers
  }, []);

  const { connect: wsConnect, disconnect: wsDisconnect } = useFleetWebSocket(
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

  // Reconnect on visibility change (phone lockscreen etc.)
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

  // Filter and sort
  const filteredVehicles = useMemo(() => {
    let result = [...vehicles];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (v) =>
          v.id.toLowerCase().includes(term) ||
          v.lineCode.toLowerCase().includes(term) ||
          v.driverNameAr.includes(searchTerm) ||
          v.lineNameAr.includes(searchTerm)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((v) => v.status === statusFilter);
    }

    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortConfig.dir === "asc" ? aVal.localeCompare(bVal, "ar") : bVal.localeCompare(aVal, "ar");
        }
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.dir === "asc" ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });
    }

    return result;
  }, [vehicles, searchTerm, statusFilter, sortConfig]);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  // Status counts
  const activeCount = vehicles.filter((v) => v.status === "active").length;
  const inactiveCount = vehicles.filter((v) => v.status === "inactive").length;
  const oosCount = vehicles.filter((v) => v.status === "out_of_service").length;

  // Table columns (React Table v8 uses CellContext)
  type CellProps = { row: { original: Vehicle } };
  const columns = [
    {
      header: "المعرف",
      accessorKey: "id" as keyof Vehicle,
      sortable: true,
      cell: ({ row }: CellProps) => <span className="text-xs font-mono text-muted">{row.original.id}</span>,
    },
    {
      header: "الخط",
      accessorKey: "lineCode" as keyof Vehicle,
      sortable: true,
      cell: ({ row }: CellProps) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-surface-2 text-primary">
            {row.original.lineCode}
          </span>
          <span className="text-sm text-primary font-medium truncate">{row.original.lineNameAr}</span>
        </div>
      ),
    },
    {
      header: "السائق",
      accessorKey: "driverNameAr" as keyof Vehicle,
      sortable: true,
      cell: ({ row }: CellProps) => <span className="text-sm text-primary">{row.original.driverNameAr}</span>,
    },
    {
      header: "السرعة",
      accessorKey: "speed" as keyof Vehicle,
      sortable: true,
      cell: ({ row }: CellProps) => <SpeedGauge speed={row.original.speed} />,
    },
    {
      header: "الحالة",
      accessorKey: "status" as keyof Vehicle,
      sortable: true,
      cell: ({ row }: CellProps) => <StatusBadge status={row.original.status} size="sm" />,
    },
    {
      header: "الازدحام",
      accessorKey: "occupancy" as keyof Vehicle,
      sortable: true,
      cell: ({ row }: CellProps) => <OccupancyMini level={row.original.occupancy} />,
    },
    {
      header: "آخر تحديث",
      accessorKey: "lastUpdate" as keyof Vehicle,
      sortable: true,
      cell: ({ row }: CellProps) => (
        <span className="text-xs text-muted tabular-nums">{row.original.lastUpdate}</span>
      ),
    },
    {
      header: "إجراءات",
      accessorKey: "id" as keyof Vehicle,
      sortable: false,
      cell: ({ row }: CellProps) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedVehicleId(row.original.id === selectedVehicleId ? null : row.original.id);
            }}
            className="p-1.5 rounded-input hover:bg-brand-blue/10 transition-colors text-secondary hover:text-brand-blue"
            title="تحديد على الخريطة"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </button>
          <button className="p-1.5 rounded-input hover:bg-surface-2 transition-colors text-secondary" title="تفاصيل">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  const headerProps = {
    title: "إدارة الأسطول",
    breadcrumb: [
      { label: "الرئيسية", href: "/" },
      { label: "إدارة الأسطول" },
    ],
    actions: (
      <div className="flex items-center gap-3">
        {fetchError && <span className="text-xs text-critical">{fetchError}</span>}
        {/* WebSocket toggle button */}
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
        <PulseDot color={loading ? "bg-text-tertiary" : "bg-on-time"} size="w-2 h-2" />
        <span className="text-xs tabular-nums text-secondary">
          {loading ? "جاري التحميل..." : `${activeCount.toLocaleString("ar-JO")} مركبة نشطة من ${vehicles.length}`}
        </span>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 rounded-input bg-brand-blue text-white text-xs font-bold hover:bg-brand-blue/90 transition-colors"
        >
          + إضافة مركبة
        </button>
      </div>
    ),
  };

  return (
    <DashboardShell headerProps={headerProps}>
      <div className="flex gap-4 h-[calc(100vh-140px)]">
        {/* ─── Table Side (60%) ─── */}
        <div className="flex-1 flex flex-col min-w-0 bg-surface rounded-card border border-gray-800 shadow-sm overflow-hidden">
          {/* Filters bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
            {/* Search */}
            <div className="relative flex-1">
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="بحث عن معرف، خط، أو سائق..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pr-9 pl-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
              />
            </div>

            {/* Status filter pills */}
            <div className="flex items-center gap-1.5">
              {[
                { value: "all", label: "الكل", count: vehicles.length },
                { value: "active", label: "نشط", count: activeCount },
                { value: "inactive", label: "متوقف", count: inactiveCount },
                { value: "out_of_service", label: "معطل", count: oosCount },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value as VehicleStatus | "all")}
                  className={`text-xs px-2.5 py-1 rounded-pill font-medium transition-all ${
                    statusFilter === f.value
                      ? "bg-brand-blue text-white"
                      : "bg-surface-2 text-secondary hover:bg-surface-3"
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex gap-4 animate-pulse">
                    <div className="h-5 bg-surface-3 rounded w-20" />
                    <div className="h-5 bg-surface-3 rounded w-32" />
                    <div className="h-5 bg-surface-3 rounded w-24" />
                    <div className="h-5 bg-surface-3 rounded w-16" />
                    <div className="h-5 bg-surface-3 rounded w-20" />
                    <div className="h-5 bg-surface-3 rounded w-12" />
                    <div className="h-5 bg-surface-3 rounded w-24" />
                    <div className="h-5 bg-surface-3 rounded w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredVehicles}
                enableRowSelection={true}
                onRowSelectionChange={(rows) => setSelectedVehicleId(rows.length === 1 ? rows[0].id : null)}
                emptyMessage="لا توجد مركبات مطابقة"
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-800 bg-surface-2">
            <span className="text-xs text-muted">
              {loading ? "جاري التحميل..." : `عرض ${filteredVehicles.length} من ${vehicles.length} مركبة`}
            </span>
            <div className="flex items-center gap-3">
              {useWs && (
                <span className="text-[10px] text-muted flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-brand-green" : "bg-delayed"}`} />
                  {wsConnected ? `WebSocket متصل` : "غير متصل"}
                  {wsEventCount > 0 && ` (${wsEventCount} حدث)`}
                </span>
              )}
              <span className="text-[10px] text-muted">
                {useWs ? "تحديث فوري عبر WebSocket" : "تحديث تلقائي كل ٣٠ ثانية"}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Map Side (40%) ─── */}
        <div className="w-[40%] flex-shrink-0 flex flex-col bg-surface rounded-card border border-gray-800 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary">الخريطة المباشرة</h3>
            {selectedVehicleId && (
              <button
                onClick={() => setSelectedVehicleId(null)}
                className="text-xs text-muted hover:text-primary transition-colors"
              >
                إلغاء التحديد
              </button>
            )}
          </div>

          <div className="flex-1 relative">
            <LiveVehicleMap highlightVehicleId={selectedVehicleId} />

            {/* Selected vehicle info overlay */}
            <AnimatePresence>
              {selectedVehicle && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-4 left-4 right-4 p-4 bg-surface/95 backdrop-blur-sm rounded-card border border-gray-800 shadow-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-surface-2">
                          {selectedVehicle.lineCode}
                        </span>
                        <span className="text-sm font-bold text-primary">{selectedVehicle.id}</span>
                      </div>
                      <p className="text-xs text-secondary mt-1">
                        {selectedVehicle.driverNameAr} · {selectedVehicle.lineNameAr}
                      </p>
                    </div>
                    <StatusBadge status={selectedVehicle.status} size="sm" />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-lg font-bold tabular-nums text-primary">
                        {selectedVehicle.speed}
                      </div>
                      <div className="text-[10px] text-muted">كم/س</div>
                    </div>
                    <div className="text-center">
                      <OccupancyMini level={selectedVehicle.occupancy} />
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold tabular-nums text-primary">
                        {selectedVehicle.heading}°
                      </div>
                      <div className="text-[10px] text-muted">الاتجاه</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ─── Add Vehicle Modal ─── */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-[460px] p-6 bg-surface rounded-modal border border-gray-800 shadow-xl"
            >
              <h2 className="text-lg font-bold text-primary mb-4">إضافة مركبة جديدة</h2>

              {addError && (
                <div className="mb-4 p-3 bg-critical/10 border border-cancelled/20 rounded-card text-sm text-critical">
                  ⚠️ {addError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">رقم اللوحة</label>
                  <input className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue" value={newVehicle.plate} onChange={(e) => setNewVehicle((p) => ({ ...p, plate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">كود الخط</label>
                  <input className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue" value={newVehicle.line_code} onChange={(e) => setNewVehicle((p) => ({ ...p, line_code: e.target.value }))} />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-secondary mb-1">السائق</label>
                <input className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue" value={newVehicle.driver} onChange={(e) => setNewVehicle((p) => ({ ...p, driver: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">المحافظة</label>
                  <select className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue" value={newVehicle.governorate} onChange={(e) => setNewVehicle((p) => ({ ...p, governorate: e.target.value }))}>
                    {["عمان", "الزرقاء", "إربد", "البلقاء", "مادبا", "الكرك", "العقبة", "جرش", "عجلون", "المفرق"].map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">الحالة</label>
                  <select className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue" value={newVehicle.status} onChange={(e) => setNewVehicle((p) => ({ ...p, status: e.target.value }))}>
                    <option value="active">نشط</option>
                    <option value="inactive">متوقف</option>
                    <option value="out_of_service">معطل</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  className="flex-1 h-11 rounded-input bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={addingVehicle}
                  onClick={async () => {
                    try {
                      await addVehicle(newVehicle);
                      refetch();
                      setShowAddModal(false);
                      setNewVehicle({ plate: "", driver: "", line_code: "", governorate: "عمان", status: "active", mode: "bus" });
                    } catch { /* error shown via addError */ }
                  }}
                >
                  {addingVehicle ? "جاري الإضافة..." : "+ إضافة مركبة"}
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={addingVehicle}
                  className="flex-1 h-11 rounded-input bg-surface-2 border border-gray-800 text-secondary text-sm font-medium hover:bg-surface-3 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}