// ============================================================================
// دروب (Droob) — Drivers Management Page
// Full CRUD for drivers | Vehicle assignment | Status toggles | Filter + search
// Data sourced from GET /api/v1/vehicles (backend has driver_name in vehicles)
// ============================================================================

"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/Toaster";
import { useDrivers } from "@/lib/hooks";
import type { VehicleItem } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────

type DriverStatus = "active" | "inactive";

interface Driver {
  id: string;
  name_ar: string;
  phone: string;
  license_number: string;
  license_expiry: string;
  assigned_vehicle_plate: string | null;
  assigned_vehicle_id: string | null;
  assigned_route_name: string | null;
  assigned_route_id: string | null;
  status: DriverStatus;
  created_at: string;
}

interface VehicleOption {
  id: string;
  plate: string;
}

interface RouteOption {
  id: string;
  name_ar: string;
}

// ─── Mock Data for dropdowns ───────────────────────────────────────────────

const MOCK_VEHICLES: VehicleOption[] = [
  { id: "VEH-0001", plate: "أ 1234" },
  { id: "VEH-0002", plate: "ب 5678" },
  { id: "VEH-0003", plate: "ج 9012" },
  { id: "VEH-0004", plate: "د 3456" },
  { id: "VEH-0005", plate: "ه 7890" },
  { id: "VEH-0006", plate: "و 2345" },
  { id: "VEH-0007", plate: "ز 6789" },
  { id: "VEH-0008", plate: "ح 0123" },
];

const MOCK_ROUTES: RouteOption[] = [
  { id: "RT-001", name_ar: "باص سريع ١" },
  { id: "RT-002", name_ar: "باص سريع ٢" },
  { id: "RT-003", name_ar: "باص رقم ١٠٠" },
  { id: "RT-004", name_ar: "باص رقم ٢٠٠" },
  { id: "RT-005", name_ar: "باص رقم ٤٠٠" },
  { id: "RT-006", name_ar: "باص رقم ٥٠٠" },
];

const FALLBACK_DRIVERS: Driver[] = [
  { id: "DRV-0001", name_ar: "أحمد محمد", phone: "0791234567", license_number: "LIC-1001", license_expiry: "2027-06-15", assigned_vehicle_plate: "أ 1234", assigned_vehicle_id: "VEH-0001", assigned_route_name: "باص سريع ١", assigned_route_id: "RT-001", status: "active", created_at: "2025-01-15" },
  { id: "DRV-0002", name_ar: "خالد العلي", phone: "0792345678", license_number: "LIC-1002", license_expiry: "2026-11-20", assigned_vehicle_plate: "ب 5678", assigned_vehicle_id: "VEH-0002", assigned_route_name: "باص سريع ٢", assigned_route_id: "RT-002", status: "active", created_at: "2025-02-10" },
  { id: "DRV-0003", name_ar: "محمود حسن", phone: "0793456789", license_number: "LIC-1003", license_expiry: "2027-08-01", assigned_vehicle_plate: null, assigned_vehicle_id: null, assigned_route_name: null, assigned_route_id: null, status: "active", created_at: "2025-03-05" },
  { id: "DRV-0004", name_ar: "عمر عبدالله", phone: "0794567890", license_number: "LIC-1004", license_expiry: "2025-12-10", assigned_vehicle_plate: "ج 9012", assigned_vehicle_id: "VEH-0003", assigned_route_name: "باص رقم ١٠٠", assigned_route_id: "RT-003", status: "active", created_at: "2025-01-20" },
];

const INITIAL_FORM = {
  name_ar: "",
  phone: "",
  license_number: "",
  license_expiry: "",
  vehicle_id: "",
  route_id: "",
};

// ─── Icons ─────────────────────────────────────────────────────────────────

const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const PlusIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EditIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const RefreshIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23,4 23,10 17,10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const SearchIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const TruckIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="2" />
    <polygon points="16,8 20,8 23,11 23,16 16,16 16,8" />
    <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const UnassignIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ToggleIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="5" width="22" height="14" rx="7" /><circle cx={8} cy="12" r="3" />
  </svg>
);

const EmptyDriversIcon: React.FC = () => (
  <svg className="w-24 h-24 text-muted/30" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M50 42a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />
    <path d="M25 75c0-13.8 11.2-25 25-25s25 11.2 25 25" />
    <rect x="30" y="52" width="40" height="8" rx="2" strokeWidth="1" opacity="0.2" />
    <line x1="42" y1="56" x2="42" y2="60" strokeWidth="1.5" opacity="0.2" />
    <line x1="58" y1="56" x2="58" y2="60" strokeWidth="1.5" opacity="0.2" />
  </svg>
);

// ─── Sub-components ────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}>
          <div className="skeleton h-4" style={{ width: i === 4 ? "72px" : `${Math.random() * 80 + 60}px` }} />
        </td>
      ))}
    </tr>
  );
}

function AssignVehicleModal({
  driver,
  vehicles,
  onAssign,
  onClose,
}: {
  driver: Driver;
  vehicles: VehicleOption[];
  onAssign: (vehicleId: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState("");

  const handleConfirm = () => {
    if (selected) onAssign(selected);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="w-full max-w-sm mx-4 bg-surface rounded-modal border border-gray-800 shadow-xl p-6"
        dir="rtl"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-input bg-brand-blue/10 flex items-center justify-center"><TruckIcon /></div>
          <div>
            <h3 className="text-lg font-bold text-primary">تعيين مركبة</h3>
            <p className="text-xs text-muted mt-0.5">{driver.name_ar}</p>
          </div>
        </div>

        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all cursor-pointer appearance-none mb-6"
          style={{
            backgroundImage: "url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')",
            backgroundPosition: "left 0.75rem center",
            backgroundRepeat: "no-repeat",
            paddingLeft: "2rem",
          }}
        >
          <option value="">اختر مركبة...</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.plate} ({v.id})</option>
          ))}
        </select>

        <div className="flex items-center justify-start gap-3">
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="flex items-center gap-2 px-5 py-2.5 rounded-input bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            تعيين
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-input bg-surface-2 border border-gray-800 text-secondary text-sm font-medium hover:bg-surface-3 transition-colors">
            إلغاء
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Map VehicleItem (from /vehicles endpoint which has driver_name) to Driver */
function vehicleToDriver(v: VehicleItem, index: number): Driver {
  return {
    id: v.id || `DRV-${String(index + 1).padStart(4, "0")}`,
    name_ar: v.driver || "بدون اسم",
    phone: "",
    license_number: "",
    license_expiry: "",
    assigned_vehicle_plate: v.plate || null,
    assigned_vehicle_id: v.id || null,
    assigned_route_name: v.line_code || null,
    assigned_route_id: null,
    status: v.status === "inactive" ? "inactive" : "active",
    created_at: "",
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function DriversPage() {
  const { toast } = useToast();
  const { data: vehicleData, loading, error, refetch } = useDrivers();

  // ── Data State ──────────────────────────────────────────────────────────

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles] = useState<VehicleOption[]>(MOCK_VEHICLES);
  const [routes] = useState<RouteOption[]>(MOCK_ROUTES);
  const [initialized, setInitialized] = useState(false);

  // Sync API data into local state on first load or after refetch
  if (vehicleData && !initialized) {
    setDrivers(vehicleData.map(vehicleToDriver));
    setInitialized(true);
  } else if (!vehicleData && !initialized && !loading) {
    setDrivers(FALLBACK_DRIVERS);
    setInitialized(true);
  }

  // ── Filter State ────────────────────────────────────────────────────────

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DriverStatus>("all");
  const [routeFilter, setRouteFilter] = useState("all");

  // ── Modal State ─────────────────────────────────────────────────────────

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });

  // ── Quick Action State ──────────────────────────────────────────────────

  const [assignTarget, setAssignTarget] = useState<Driver | null>(null);

  // ── Derived Data ────────────────────────────────────────────────────────

  const statusStats = useMemo(() => {
    const active = drivers.filter((d) => d.status === "active").length;
    const inactive = drivers.filter((d) => d.status === "inactive").length;
    return { active, inactive };
  }, [drivers]);

  const filteredDrivers = useMemo(() => {
    let result = [...drivers];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.name_ar.includes(search) ||
          d.phone.includes(search) ||
          d.license_number.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((d) => d.status === statusFilter);
    }

    if (routeFilter !== "all") {
      result = result.filter((d) => d.assigned_route_id === routeFilter);
    }

    return result;
  }, [drivers, search, statusFilter, routeFilter]);

  const saving = false;

  // ── Handlers ────────────────────────────────────────────────────────────

  const openAddModal = useCallback(() => {
    setEditingId(null);
    setForm({ ...INITIAL_FORM });
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((driver: Driver) => {
    setEditingId(driver.id);
    setForm({
      name_ar: driver.name_ar,
      phone: driver.phone,
      license_number: driver.license_number,
      license_expiry: driver.license_expiry,
      vehicle_id: driver.assigned_vehicle_id || "",
      route_id: driver.assigned_route_id || "",
    });
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
    setForm({ ...INITIAL_FORM });
  }, []);

  const updateField = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name_ar.trim() || !form.phone.trim()) {
      toast("يرجى ملء الحقول المطلوبة", "warning");
      return;
    }

    const vehicle = vehicles.find((v) => v.id === form.vehicle_id);
    const route = routes.find((r) => r.id === form.route_id);

    if (editingId) {
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === editingId
            ? {
                ...d,
                name_ar: form.name_ar,
                phone: form.phone,
                license_number: form.license_number,
                license_expiry: form.license_expiry,
                assigned_vehicle_id: form.vehicle_id || null,
                assigned_vehicle_plate: vehicle?.plate || null,
                assigned_route_id: form.route_id || null,
                assigned_route_name: route?.name_ar || null,
              }
            : d
        )
      );
      toast("تم تحديث بيانات السائق بنجاح", "success");
    } else {
      const newId = `DRV-${String(drivers.length + 1).padStart(4, "0")}`;
      const newDriver: Driver = {
        id: newId,
        name_ar: form.name_ar,
        phone: form.phone,
        license_number: form.license_number,
        license_expiry: form.license_expiry,
        assigned_vehicle_id: form.vehicle_id || null,
        assigned_vehicle_plate: vehicle?.plate || null,
        assigned_route_id: form.route_id || null,
        assigned_route_name: route?.name_ar || null,
        status: "active",
        created_at: new Date().toISOString().split("T")[0],
      };
      setDrivers((prev) => [newDriver, ...prev]);
      toast("تم إضافة السائق بنجاح", "success");
    }

    closeModal();
  }, [form, editingId, drivers, vehicles, routes, closeModal, toast]);

  const toggleStatus = useCallback(
    (driver: Driver) => {
      const newStatus: DriverStatus = driver.status === "active" ? "inactive" : "active";
      setDrivers((prev) =>
        prev.map((d) => (d.id === driver.id ? { ...d, status: newStatus } : d))
      );
      toast(
        newStatus === "active"
          ? `تم تفعيل السائق ${driver.name_ar}`
          : `تم إيقاف السائق ${driver.name_ar}`,
        "success"
      );
    },
    [toast]
  );

  const assignVehicle = useCallback(
    (vehicleId: string) => {
      if (!assignTarget) return;
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === assignTarget.id
            ? {
                ...d,
                assigned_vehicle_id: vehicleId,
                assigned_vehicle_plate: vehicle?.plate || null,
              }
            : d
        )
      );
      toast(`تم تعيين المركبة ${vehicle?.plate} للسائق ${assignTarget.name_ar}`, "success");
      setAssignTarget(null);
    },
    [assignTarget, vehicles, toast]
  );

  const unassignVehicle = useCallback(
    (driver: Driver) => {
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === driver.id
            ? { ...d, assigned_vehicle_id: null, assigned_vehicle_plate: null }
            : d
        )
      );
      toast(`تم إلغاء تعيين المركبة عن ${driver.name_ar}`, "success");
    },
    [toast]
  );

  const savingDisabled = saving || !form.name_ar.trim() || !form.phone.trim();

  const isLicenseExpiringSoon = (expiry: string): boolean => {
    const exp = new Date(expiry);
    const now = new Date();
    const diff = exp.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 90;
  };

  const isLicenseExpired = (expiry: string): boolean => {
    return new Date(expiry) < new Date();
  };

  // ── Render ──────────────────────────────────────────────────────────────

  const headerProps = {
    title: "إدارة السائقين",
    actions: (
      <button
        onClick={openAddModal}
        className="flex items-center gap-2 px-4 py-2 rounded-input bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue/90 transition-colors"
      >
        <PlusIcon />
        إضافة سائق
      </button>
    ),
  };

  const tableCols = 7;

  return (
    <DashboardShell headerProps={headerProps}>
      <div className="space-y-6">
        {/* ── Error Banner ──────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center justify-between p-4 rounded-card bg-critical/5 border border-cancelled/20 text-sm text-critical">
            <span>⚠️ {error}</span>
            <button
              onClick={() => { refetch(); setInitialized(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-input bg-critical/10 text-critical text-xs font-medium hover:bg-critical/20 transition-colors"
            >
              <RefreshIcon />
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* ── Stats Bar ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-3 p-4 rounded-card bg-surface border border-gray-800">
            <div className="w-10 h-10 rounded-input bg-brand-blue/10 flex items-center justify-center text-lg font-bold text-brand-blue">
              {drivers.length}
            </div>
            <div>
              <div className="text-xs font-medium text-secondary">إجمالي السائقين</div>
              <div className="text-xs font-semibold text-brand-blue">{drivers.length > 0 ? "100%" : "0%"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-card bg-surface border border-gray-800">
            <div className="w-10 h-10 rounded-input bg-brand-green/10 flex items-center justify-center text-lg font-bold text-brand-green">
              {statusStats.active}
            </div>
            <div>
              <div className="text-xs font-medium text-secondary">نشط</div>
              <div className="text-xs font-semibold text-brand-green">{drivers.length > 0 ? ((statusStats.active / drivers.length) * 100).toFixed(0) : 0}%</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-card bg-surface border border-gray-800">
            <div className="w-10 h-10 rounded-input bg-text-tertiary/10 flex items-center justify-center text-lg font-bold text-muted">
              {statusStats.inactive}
            </div>
            <div>
              <div className="text-xs font-medium text-secondary">متوقف</div>
              <div className="text-xs font-semibold text-muted">{drivers.length > 0 ? ((statusStats.inactive / drivers.length) * 100).toFixed(0) : 0}%</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-card bg-surface border border-gray-800">
            <div className="w-10 h-10 rounded-input bg-delayed/10 flex items-center justify-center text-lg font-bold text-delayed">
              {drivers.filter((d) => !d.assigned_vehicle_id).length}
            </div>
            <div>
              <div className="text-xs font-medium text-secondary">بدون مركبة</div>
              <div className="text-xs font-semibold text-delayed">
                {drivers.length > 0 ? ((drivers.filter((d) => !d.assigned_vehicle_id).length / drivers.length) * 100).toFixed(0) : 0}%
              </div>
            </div>
          </div>
        </div>

        {/* ── Filters Bar ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-card bg-surface border border-gray-800">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"><SearchIcon /></div>
            <input
              type="text"
              placeholder="بحث بالاسم أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pr-9 pl-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {[
              { value: "all" as const, label: "الكل" },
              { value: "active" as const, label: "نشط" },
              { value: "inactive" as const, label: "متوقف" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`text-xs px-2.5 py-1 rounded-pill font-medium transition-all ${statusFilter === f.value ? "bg-brand-blue text-white" : "bg-surface-2 text-secondary hover:bg-surface-3"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <select
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
            className="h-9 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all cursor-pointer appearance-none"
            style={{
              backgroundImage: "url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')",
              backgroundPosition: "left 0.75rem center",
              backgroundRepeat: "no-repeat",
              paddingLeft: "2rem",
            }}
          >
            <option value="all">كل الخطوط</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>{r.name_ar}</option>
            ))}
          </select>
          <div className="text-xs text-muted mr-auto">
            {loading ? "جاري التحميل..." : `${filteredDrivers.length} من ${drivers.length} سائق`}
          </div>
        </div>

        {/* ── Content Area ────────────────────────────────────────────────── */}
        <div className="rounded-card bg-surface border border-gray-800 overflow-hidden">
          {loading && (
            <table className="data-table">
              <thead><tr><th>الاسم</th><th>الهاتف</th><th>المركبة</th><th>الخط</th><th>الحالة</th><th>رخصة القيادة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} cols={tableCols} />
                ))}
              </tbody>
            </table>
          )}

          {!loading && filteredDrivers.length === 0 && (
            <div className="empty-state">
              <EmptyDriversIcon />
              <p className="text-sm text-secondary mt-4">
                {search || statusFilter !== "all" || routeFilter !== "all"
                  ? "لا توجد نتائج تطابق البحث"
                  : "لا يوجد سائقين"}
              </p>
              {(search || statusFilter !== "all" || routeFilter !== "all") && (
                <button
                  onClick={() => { setSearch(""); setStatusFilter("all"); setRouteFilter("all"); }}
                  className="mt-3 text-xs text-brand-blue hover:underline"
                >
                  إعادة تعيين الفلاتر
                </button>
              )}
            </div>
          )}

          {!loading && filteredDrivers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الاسم</th><th>الهاتف</th><th>المركبة</th><th>الخط</th><th>الحالة</th><th>رخصة القيادة</th><th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredDrivers.map((driver) => (
                      <motion.tr
                        key={driver.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-blue/15 flex items-center justify-center text-xs font-bold text-brand-blue flex-shrink-0">
                              {driver.name_ar.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-primary truncate">{driver.name_ar}</div>
                              <div className="text-[10px] text-muted font-mono">{driver.id}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="text-sm text-secondary" dir="ltr">{driver.phone}</span></td>
                        <td>
                          {driver.assigned_vehicle_plate ? (
                            <span className="text-sm font-mono text-primary bg-surface-2 px-2 py-0.5 rounded-input text-xs font-medium">
                              {driver.assigned_vehicle_plate}
                            </span>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                        <td>
                          {driver.assigned_route_name ? (
                            <span className="text-sm text-primary">{driver.assigned_route_name}</span>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                        <td><StatusBadge status={driver.status} size="sm" /></td>
                        <td>
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-xs font-mono tabular-nums ${isLicenseExpired(driver.license_expiry) ? "text-critical line-through" : isLicenseExpiringSoon(driver.license_expiry) ? "text-delayed" : "text-secondary"}`}>
                              {driver.license_expiry || "—"}
                            </span>
                            <span className="text-[10px] text-muted">{driver.license_number}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(driver)}
                              className="p-1.5 rounded-input hover:bg-brand-blue/10 transition-colors text-secondary hover:text-brand-blue"
                              title="تعديل"
                            >
                              <EditIcon />
                            </button>
                            {!driver.assigned_vehicle_id && (
                              <button
                                onClick={() => setAssignTarget(driver)}
                                className="p-1.5 rounded-input hover:bg-brand-blue/10 transition-colors text-secondary hover:text-brand-blue"
                                title="تعيين مركبة"
                              >
                                <TruckIcon />
                              </button>
                            )}
                            {driver.assigned_vehicle_id && (
                              <button
                                onClick={() => unassignVehicle(driver)}
                                className="p-1.5 rounded-input hover:bg-critical/10 transition-colors text-secondary hover:text-critical"
                                title="إلغاء تعيين المركبة"
                              >
                                <UnassignIcon />
                              </button>
                            )}
                            <button
                              onClick={() => toggleStatus(driver)}
                              className={`p-1.5 rounded-input transition-colors ${driver.status === "active" ? "hover:bg-delayed/10 text-secondary hover:text-delayed" : "hover:bg-brand-green/10 text-secondary hover:text-brand-green"}`}
                              title={driver.status === "active" ? "إيقاف السائق" : "تفعيل السائق"}
                            >
                              <ToggleIcon />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && drivers.length > 0 && (
          <div className="flex items-center justify-between text-xs text-muted">
            <span>إجمالي السائقين: {drivers.length}</span>
            <div className="flex items-center gap-3">
              <span>{drivers.filter((d) => d.assigned_vehicle_id).length} سائق بمركبة</span>
              <button
                onClick={() => { refetch(); setInitialized(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-input bg-surface border border-gray-800 text-secondary hover:text-primary hover:bg-surface-2 transition-colors"
              >
                <RefreshIcon />
                تحديث
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ADD / EDIT MODAL                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-full max-w-lg mx-4 bg-surface rounded-modal border border-gray-800 shadow-xl"
              dir="rtl"
            >
              <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-input bg-brand-blue/10 flex items-center justify-center">
                    <UsersIcon className="w-5 h-5 text-brand-blue" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-primary">
                      {editingId ? "تعديل بيانات السائق" : "إضافة سائق جديد"}
                    </h2>
                    <p className="text-xs text-muted mt-0.5">
                      {editingId ? "تعديل بيانات السائق" : "إضافة سائق جديد إلى النظام"}
                    </p>
                  </div>
                </div>
                <button onClick={closeModal} className="w-8 h-8 rounded-input flex items-center justify-center text-muted hover:text-primary hover:bg-surface-2 transition-colors">
                  <CloseIcon />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">الاسم الكامل <span className="text-critical">*</span></label>
                  <input value={form.name_ar} onChange={(e) => updateField("name_ar", e.target.value)} placeholder="مثال: أحمد محمد"
                    className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">رقم الهاتف <span className="text-critical">*</span></label>
                  <input type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="0791234567"
                    style={{ direction: "ltr", textAlign: "left" }}
                    className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1.5">رقم رخصة القيادة</label>
                    <input value={form.license_number} onChange={(e) => updateField("license_number", e.target.value)} placeholder="LIC-1001"
                      style={{ direction: "ltr", textAlign: "left" }}
                      className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1.5">تاريخ انتهاء الرخصة</label>
                    <input type="date" value={form.license_expiry} onChange={(e) => updateField("license_expiry", e.target.value)}
                      className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
                      style={{ direction: "ltr", textAlign: "left" }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">تعيين مركبة</label>
                  <select value={form.vehicle_id} onChange={(e) => updateField("vehicle_id", e.target.value)}
                    className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all cursor-pointer appearance-none"
                    style={{
                      backgroundImage: "url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')",
                      backgroundPosition: "left 0.75rem center",
                      backgroundRepeat: "no-repeat",
                      paddingLeft: "2rem",
                    }}
                  >
                    <option value="">بدون مركبة</option>
                    {vehicles.map((v) => (<option key={v.id} value={v.id}>{v.plate} ({v.id})</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">تعيين خط</label>
                  <select value={form.route_id} onChange={(e) => updateField("route_id", e.target.value)}
                    className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all cursor-pointer appearance-none"
                    style={{
                      backgroundImage: "url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')",
                      backgroundPosition: "left 0.75rem center",
                      backgroundRepeat: "no-repeat",
                      paddingLeft: "2rem",
                    }}
                  >
                    <option value="">بدون خط</option>
                    {routes.map((r) => (<option key={r.id} value={r.id}>{r.name_ar}</option>))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-start gap-3 p-6 pt-0 border-t border-gray-800">
                <button onClick={handleSave} disabled={savingDisabled}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-input bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {editingId ? "حفظ التعديلات" : "إضافة السائق"}
                </button>
                <button onClick={closeModal}
                  className="px-5 py-2.5 rounded-input bg-surface-2 border border-gray-800 text-secondary text-sm font-medium hover:bg-surface-3 transition-colors">
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ASSIGN VEHICLE MODAL                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {assignTarget && (
          <AssignVehicleModal
            driver={assignTarget}
            vehicles={vehicles}
            onAssign={assignVehicle}
            onClose={() => setAssignTarget(null)}
          />
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}