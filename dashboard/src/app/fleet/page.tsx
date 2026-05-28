// ============================================================================
// دروب (Droob) — Fleet Management Page
// Vehicle table + live map split view | Status chips | Speed gauges
// ============================================================================

"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { PulseDot } from "@/components/ui/StatusBadge";
import { LiveVehicleMap } from "@/components/maps/LiveVehicleMap";

// ─── Types ─────────────────────────────────────────────────────────────────

type VehicleStatus = "active" | "inactive" | "out_of_service";

interface Vehicle {
  id: string;
  lineCode: string;
  lineNameAr: string;
  driverNameAr: string;
  speed: number; // km/h
  status: VehicleStatus;
  lastUpdate: string;
  occupancy: "empty" | "partial" | "full";
  lat: number;
  lng: number;
  heading: number;
}

// ─── Icons ─────────────────────────────────────────────────────────────────

const EmptyFleetIcon: React.FC = () => (
  <svg className="w-24 h-24 text-text-tertiary/30" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
      <span className="text-xs tabular-nums w-10 text-text-secondary text-right font-medium">
        {speed.toLocaleString("ar-JO")}
        <span className="text-[10px] text-text-tertiary ml-0.5">كم/س</span>
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
            i < filled ? "bg-brand-green" : "bg-border"
          }`}
        />
      ))}
      <span className="text-[10px] text-text-tertiary">{label}</span>
    </div>
  );
};

// ─── Mock Data ─────────────────────────────────────────────────────────────

const generateVehicles = (): Vehicle[] => {
  const lines = [
    { code: "BRT1", nameAr: "باص سريع ١" },
    { code: "BRT2", nameAr: "باص سريع ٢" },
    { code: "B100", nameAr: "باص رقم ١٠٠" },
    { code: "B200", nameAr: "باص رقم ٢٠٠" },
    { code: "B400", nameAr: "باص رقم ٤٠٠" },
    { code: "B500", nameAr: "باص رقم ٥٠٠" },
    { code: "B700", nameAr: "باص رقم ٧٠٠" },
    { code: "B900", nameAr: "باص رقم ٩٠٠" },
  ];

  const drivers = ["أحمد محمد", "خالد العلي", "محمود حسن", "عمر عبدالله", "سامر يوسف", "طارق ناصر", "رائد خالد", "نادر سليم"];

  const statuses: VehicleStatus[] = ["active", "active", "active", "active", "active", "active", "inactive", "out_of_service"];

  const occupancies: ("empty" | "partial" | "full")[] = ["empty", "partial", "full", "partial", "full", "partial", "empty", "empty"];

  // Amman coordinates approximate range
  const baseLat = 31.957;
  const baseLng = 35.916;

  return Array.from({ length: 24 }, (_, i) => ({
    id: `VEH-${String(i + 1).padStart(4, "0")}`,
    lineCode: lines[i % lines.length].code,
    lineNameAr: lines[i % lines.length].nameAr,
    driverNameAr: drivers[i % drivers.length],
    speed: Math.floor(Math.random() * 100) + 10,
    status: statuses[i % statuses.length],
    lastUpdate: `${Math.floor(Math.random() * 5)} دقائق`,
    occupancy: occupancies[i % occupancies.length],
    lat: baseLat + (Math.random() - 0.5) * 0.12,
    lng: baseLng + (Math.random() - 0.5) * 0.12,
    heading: Math.floor(Math.random() * 360),
  }));
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function FleetManagementPage() {
  const [vehicles] = useState<Vehicle[]>(generateVehicles);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "all">("all");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Vehicle; dir: "asc" | "desc" } | null>(null);

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

  // Table columns
  const columns = [
    {
      header: "المعرف",
      accessor: "id" as keyof Vehicle,
      sortable: true,
      cell: (v: Vehicle) => <span className="text-xs font-mono text-text-tertiary">{v.id}</span>,
    },
    {
      header: "الخط",
      accessor: "lineCode" as keyof Vehicle,
      sortable: true,
      cell: (v: Vehicle) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-surface-2 text-text-primary">
            {v.lineCode}
          </span>
          <span className="text-sm text-text-primary font-medium truncate">{v.lineNameAr}</span>
        </div>
      ),
    },
    {
      header: "السائق",
      accessor: "driverNameAr" as keyof Vehicle,
      sortable: true,
      cell: (v: Vehicle) => <span className="text-sm text-text-primary">{v.driverNameAr}</span>,
    },
    {
      header: "السرعة",
      accessor: "speed" as keyof Vehicle,
      sortable: true,
      cell: (v: Vehicle) => <SpeedGauge speed={v.speed} />,
    },
    {
      header: "الحالة",
      accessor: "status" as keyof Vehicle,
      sortable: true,
      cell: (v: Vehicle) => <StatusBadge status={v.status} size="sm" />,
    },
    {
      header: "الازدحام",
      accessor: "occupancy" as keyof Vehicle,
      sortable: true,
      cell: (v: Vehicle) => <OccupancyMini level={v.occupancy} />,
    },
    {
      header: "آخر تحديث",
      accessor: "lastUpdate" as keyof Vehicle,
      sortable: true,
      cell: (v: Vehicle) => (
        <span className="text-xs text-text-tertiary tabular-nums">{v.lastUpdate}</span>
      ),
    },
    {
      header: "إجراءات",
      accessor: "id" as keyof Vehicle,
      sortable: false,
      cell: (v: Vehicle) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedVehicleId(v.id === selectedVehicleId ? null : v.id);
            }}
            className="p-1.5 rounded-input hover:bg-brand-blue/10 transition-colors text-text-secondary hover:text-brand-blue"
            title="تحديد على الخريطة"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </button>
          <button className="p-1.5 rounded-input hover:bg-surface-2 transition-colors text-text-secondary" title="تفاصيل">
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
        <PulseDot color="bg-on-time" size="w-2 h-2" />
        <span className="text-xs tabular-nums text-text-secondary">
          {activeCount.toLocaleString("ar-JO")} مركبة نشطة من {vehicles.length}
        </span>
      </div>
    ),
  };

  return (
    <DashboardShell headerProps={headerProps}>
      <div className="flex gap-4 h-[calc(100vh-140px)]">
        {/* ─── Table Side (60%) ─── */}
        <div className="flex-1 flex flex-col min-w-0 bg-surface rounded-card border border-border shadow-sm overflow-hidden">
          {/* Filters bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            {/* Search */}
            <div className="relative flex-1">
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary"
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
                className="w-full h-9 pr-9 pl-3 rounded-input bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
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
                      : "bg-surface-2 text-text-secondary hover:bg-surface-3"
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <DataTable
              columns={columns}
              data={filteredVehicles}
              rowKey={(v) => v.id}
              selectedRowKey={selectedVehicleId}
              onRowClick={(v) => setSelectedVehicleId(v.id === selectedVehicleId ? null : v.id)}
              emptyState={
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <EmptyFleetIcon />
                  <p className="text-text-secondary font-medium">لا توجد مركبات مطابقة</p>
                  <p className="text-xs text-text-tertiary">جرب تغيير معايير البحث أو الفلاتر</p>
                </div>
              }
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-surface-2">
            <span className="text-xs text-text-tertiary">
              عرض {filteredVehicles.length} من {vehicles.length} مركبة
            </span>
            <span className="text-[10px] text-text-tertiary">تحديث تلقائي كل ٣٠ ثانية</span>
          </div>
        </div>

        {/* ─── Map Side (40%) ─── */}
        <div className="w-[40%] flex-shrink-0 flex flex-col bg-surface rounded-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary">الخريطة المباشرة</h3>
            {selectedVehicleId && (
              <button
                onClick={() => setSelectedVehicleId(null)}
                className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
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
                  className="absolute bottom-4 left-4 right-4 p-4 bg-surface/95 backdrop-blur-sm rounded-card border border-border shadow-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-surface-2">
                          {selectedVehicle.lineCode}
                        </span>
                        <span className="text-sm font-bold text-text-primary">{selectedVehicle.id}</span>
                      </div>
                      <p className="text-xs text-text-secondary mt-1">
                        {selectedVehicle.driverNameAr} · {selectedVehicle.lineNameAr}
                      </p>
                    </div>
                    <StatusBadge status={selectedVehicle.status} size="sm" />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-lg font-bold tabular-nums text-text-primary">
                        {selectedVehicle.speed}
                      </div>
                      <div className="text-[10px] text-text-tertiary">كم/س</div>
                    </div>
                    <div className="text-center">
                      <OccupancyMini level={selectedVehicle.occupancy} />
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold tabular-nums text-text-primary">
                        {selectedVehicle.heading}°
                      </div>
                      <div className="text-[10px] text-text-tertiary">الاتجاه</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}