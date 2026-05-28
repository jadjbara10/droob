// ============================================================================
// دروب (Droob) — Routes Management — API Integration
// ============================================================================

"use client";

import { useState, useMemo } from "react";
import { useRoutes, useUpdateRoute, useImportGtfs } from "@/lib/hooks";
import type { RouteListItem } from "@/lib/api";

const statusBadge: Record<string, string> = {
  on_time: "badge-on-time",
  delayed: "badge-delayed",
  off: "badge-cancelled",
  cancelled: "badge-cancelled",
};
const statusLabel: Record<string, string> = {
  on_time: "في الموعد",
  delayed: "تأخير",
  off: "خارج الخدمة",
  cancelled: "متوقف",
};
const modeBadge: Record<string, string> = {
  city_bus: "badge-city-bus",
  brt: "badge-brt",
  serveece: "badge-serveece",
  intercity: "badge-intercity",
};
const modeLabel: Record<string, string> = {
  city_bus: "باص مدني",
  brt: "BRT",
  serveece: "سرفيس",
  intercity: "بين مدن",
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

export default function RoutesPage() {
  const { data: routes, loading, error, refetch } = useRoutes();
  const { execute: updateRoute, loading: updating, error: updateErr } = useUpdateRoute();
  const { execute: importGtfs, loading: importing, error: importErr } = useImportGtfs();

  const [mode, setMode] = useState("الكل");
  const [status, setStatus] = useState("الكل");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<RouteListItem>>({});

  const routeList = routes || [];

  const filtered = useMemo(() => {
    return routeList.filter((r) => {
      if (mode !== "الكل" && r.mode !== mode) return false;
      if (status !== "الكل" && r.status !== status) return false;
      if (search && !r.name_ar.includes(search) && !r.code.includes(search)) return false;
      return true;
    });
  }, [routeList, mode, status, search]);

  const kpis = useMemo(() => ({
    total: routeList.length,
    onTime: routeList.filter((r) => r.status === "on_time").length,
    delayed: routeList.filter((r) => r.status === "delayed").length,
    off: routeList.filter((r) => r.status === "off" || r.status === "cancelled").length,
  }), [routeList]);

  const startEdit = (route: RouteListItem) => {
    setEditing(route.id);
    setEditData({ name_ar: route.name_ar, fare: route.fare, headway: route.headway, status: route.status });
  };

  const saveEdit = async (id: string) => {
    try {
      await updateRoute(id, editData);
      setEditing(null);
      refetch();
    } catch {
      // error displayed from hook
    }
  };

  const handleGtfsImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importGtfs(file);
      refetch();
    } catch {
      // error from hook
    }
  };

  return (
    <div className="page-wrapper" dir="rtl">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">محرر الخطوط</h1>
          <p className="page-subtitle">
            {loading ? "جاري التحميل..." : `${routeList.length} خط في النظام`}
          </p>
        </div>
        <div className="flex gap-3">
          <label className={`btn-outline cursor-pointer ${importing ? "opacity-50" : ""}`}>
            📥 {importing ? "جاري الاستيراد..." : "استيراد GTFS"}
            <input type="file" accept=".zip,.csv,.txt" onChange={handleGtfsImport} className="hidden" disabled={importing} />
          </label>
          <button className="btn-primary" onClick={() => refetch()}>🔄 تحديث</button>
        </div>
      </div>

      {/* Error */}
      {(error || updateErr || importErr) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
          ⚠️ {error || updateErr || importErr}
          <button onClick={refetch} className="mr-3 underline text-red-800">إعادة المحاولة</button>
        </div>
      )}

      {/* KPI Grid */}
      <div className="dashboard-grid">
        <div className="kpi-card"><div className="text-xs text-gray-400 mb-1">إجمالي الخطوط</div><div className="kpi-value">{loading ? "—" : kpis.total}</div></div>
        <div className="kpi-card"><div className="text-xs text-gray-400 mb-1">خطوط نشطة</div><div className="kpi-value text-[#16A34A]">{loading ? "—" : kpis.onTime}</div></div>
        <div className="kpi-card"><div className="text-xs text-gray-400 mb-1">خطوط متأخرة</div><div className="kpi-value text-[#EAB308]">{loading ? "—" : kpis.delayed}</div></div>
        <div className="kpi-card"><div className="text-xs text-gray-400 mb-1">خارج الخدمة</div><div className="kpi-value text-[#DC2626]">{loading ? "—" : kpis.off}</div></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 bg-white rounded-xl p-4 border">
        <input
          className="form-input max-w-xs"
          placeholder="🔍 بحث عن خط..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="form-select w-36" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="الكل">كل الوسائط</option>
          <option value="city_bus">🚌 باص</option>
          <option value="brt">⚡ BRT</option>
          <option value="serveece">🚐 سرفيس</option>
          <option value="intercity">🚌 بين مدن</option>
        </select>
        <select className="form-select w-36" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="الكل">كل الحالات</option>
          <option value="on_time">في الموعد</option>
          <option value="delayed">متأخر</option>
          <option value="off">خارج الخدمة</option>
        </select>
      </div>

      {/* Routes Table */}
      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">الخطوط ({filtered.length})</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>الكود</th><th>الاسم</th><th>الوسيط</th><th>من</th><th>إلى</th><th>المدة</th><th>الأجرة</th><th>التواتر</th><th>المركبات</th><th>الحالة</th><th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono font-bold">{r.code}</td>
                    <td>
                      {editing === r.id ? (
                        <input
                          className="form-input text-sm w-48"
                          value={editData.name_ar || ""}
                          onChange={(e) => setEditData({ ...editData, name_ar: e.target.value })}
                        />
                      ) : r.name_ar}
                    </td>
                    <td><span className={modeBadge[r.mode] || "badge-city-bus"}>{modeLabel[r.mode] || r.mode}</span></td>
                    <td>{r.origin_ar}</td>
                    <td>{r.dest_ar}</td>
                    <td>{r.duration} د</td>
                    <td className="font-mono">
                      {editing === r.id ? (
                        <input
                          type="number"
                          className="form-input text-sm w-20"
                          value={editData.fare ?? ""}
                          step="0.01"
                          onChange={(e) => setEditData({ ...editData, fare: parseFloat(e.target.value) || 0 })}
                        />
                      ) : `${r.fare.toFixed(3)} د.أ`}
                    </td>
                    <td>
                      {editing === r.id ? (
                        <input
                          type="number"
                          className="form-input text-sm w-20"
                          value={editData.headway ?? ""}
                          onChange={(e) => setEditData({ ...editData, headway: parseInt(e.target.value) || null })}
                        />
                      ) : r.headway ? `${r.headway} د` : "—"}
                    </td>
                    <td>{r.vehicles}</td>
                    <td>
                      {editing === r.id ? (
                        <select
                          className="form-select text-xs w-28"
                          value={editData.status || ""}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                        >
                          <option value="on_time">في الموعد</option>
                          <option value="delayed">متأخر</option>
                          <option value="off">خارج الخدمة</option>
                        </select>
                      ) : (
                        <span className={statusBadge[r.status] || "badge-on-time"}>{statusLabel[r.status] || r.status}</span>
                      )}
                    </td>
                    <td>
                      {editing === r.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => saveEdit(r.id)} disabled={updating} className="px-2 py-1 bg-[#16A34A] text-white text-xs rounded">
                            {updating ? "..." : "حفظ"}
                          </button>
                          <button onClick={() => setEditing(null)} className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">إلغاء</button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(r)} className="px-2 py-1 text-xs text-[#1A4F8A] hover:bg-blue-50 rounded">✏️ تعديل</button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr><td colSpan={11} className="text-center text-gray-400 py-8">لا توجد نتائج</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}