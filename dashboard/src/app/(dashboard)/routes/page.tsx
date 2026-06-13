"use client";

import React, { useEffect, useState } from "react";
import { Plus, RefreshCw, Route, MapPin, Sparkles, Copy, GitMerge, BarChart3, Trash2, Edit3, X, Info } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { InlineError, EmptyState } from "@/components/error-boundary";
import { TableSkeleton } from "@/components/skeleton";
import { Panel } from "@/components/panel";
import { MapPicker } from "@/components/map/map-picker";
import { routesApi, snapRouteApi, type RouteRecord, type RouteCreateInput } from "@/lib/api";
import { formatDateTime, formatFare, modeLabels } from "@/lib/utils";

const MODES = ["city_bus","brt","serveece","intercity"];

export default function RoutesPage() {
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [modeFilter, setModeFilter] = useState("all");
  const [polyline, setPolyline] = useState<[number, number][]>([]);
  const [stats, setStats] = useState<{ totalActive: number; totalInactive: number; modeCounts: Record<string, number> } | null>(null);

  async function fetchRoutes() {
    setLoading(true); setError(false);
    try {
      const res = await routesApi.list({ limit: 300 });
      const list = Array.isArray(res) ? res : (res.data || []);
      setRoutes(list);
      // Calculate stats
      const active = list.filter((r: RouteRecord) => r.is_active).length;
      const mCounts: Record<string, number> = {};
      list.forEach((r: RouteRecord) => { mCounts[r.mode] = (mCounts[r.mode] || 0) + 1; });
      setStats({ totalActive: active, totalInactive: list.length - active, modeCounts: mCounts });
    } catch { setError(true); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchRoutes(); }, []);

  async function openForm(route?: RouteRecord) {
    if (route) {
      setEditingRoute(route);
      setPolyline([]);
      try {
        const full = await routesApi.getById(route.id) as any;
        if (full?.path_geojson) {
          const gj = typeof full.path_geojson === "string" ? JSON.parse(full.path_geojson) : full.path_geojson;
          if (gj.type === "LineString" && Array.isArray(gj.coordinates)) {
            setPolyline(gj.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]));
          }
        }
        if (full) setEditingRoute({ ...route, ...full });
      } catch { /* keep editing without path */ }
      setShowForm(true);
    } else {
      setEditingRoute(null);
      setPolyline([]);
      setShowForm(true);
    }
  }

  async function handleCopyRoute(route: RouteRecord) {
    if (!confirm(`نسخ خط "${route.name_ar}"؟ سيتم إنشاء نسخة برمز جديد.`)) return;
    try {
      const copyCode = `${route.code}-COPY`;
      await routesApi.create({
        code: copyCode,
        name_ar: `${route.name_ar} (نسخة)`,
        name_en: `${route.name_en} (copy)`,
        mode: route.mode,
        color: route.color,
        baseFare: parseFloat(formatFare(route.base_fare)),
        isActive: false,
        headwayPeak: route.headway_peak || undefined,
        headwayOffpeak: route.headway_offpeak || undefined,
        firstDeparture: route.first_departure || undefined,
        lastDeparture: route.last_departure || undefined,
        pathGeojson: route.path_geojson || undefined,
      });
      fetchRoutes();
    } catch (err) { alert((err as Error).message); }
  }

  async function handleSnapRoute() {
    if (polyline.length < 2) return alert("تحتاج إلى نقطتين على الأقل");
    try {
      const result = await snapRouteApi.snap(polyline);
      setPolyline(result.points);
      alert(`✅ تم توليد ${result.snapped_count} نقطة تتبع الطرق الحقيقية\nالمسافة: ${result.distance_km} كم | الوقت: ${result.duration_min} دقيقة`);
    } catch (err) {
      alert("❌ فشل التوليد الذكي: " + ((err as Error).message || "خطأ غير معروف"));
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const data: RouteCreateInput = {
        code: form.get("code") as string,
        name_ar: form.get("name_ar") as string,
        name_en: form.get("name_en") as string,
        mode: form.get("mode") as string,
        color: (form.get("color") as string) || "#3BB0FF",
        baseFare: parseFloat((form.get("baseFare") as string) || "0.35"),
        firstDeparture: (form.get("firstDeparture") as string) || undefined,
        lastDeparture: (form.get("lastDeparture") as string) || undefined,
        headwayPeak: form.get("headwayPeak") ? parseInt(form.get("headwayPeak") as string) : undefined,
        headwayOffpeak: form.get("headwayOffpeak") ? parseInt(form.get("headwayOffpeak") as string) : undefined,
        isActive: form.get("isActive") === "1",
        originStopId: (form.get("originStopId") as string) || undefined,
        destinationStopId: (form.get("destinationStopId") as string) || undefined,
      };
      if (polyline.length >= 2) {
        data.pathGeojson = { type: "LineString", coordinates: polyline.map(([lat, lng]) => [lng, lat]) };
      }
      if (editingRoute) {
        await routesApi.update(editingRoute.id, data);
      } else {
        await routesApi.create(data);
      }
      setShowForm(false); setEditingRoute(null); setPolyline([]); fetchRoutes();
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  }

  async function handleDelete(route: RouteRecord) {
    if (!confirm(`هل أنت متأكد من حذف خط "${route.name_ar}"؟\n\n${route.code} — ${modeLabels[route.mode] || route.mode}`)) return;
    try { await routesApi.delete(route.id); fetchRoutes(); }
    catch (err) { alert((err as Error).message); }
  }

  const filteredRoutes = modeFilter === "all" ? routes : routes.filter((r) => r.mode === modeFilter);

  const modeColorMap: Record<string, string> = { city_bus: "badge-info", brt: "badge-danger", serveece: "badge-success", intercity: "badge-warn" };

  const columns: Column[] = [
    { key: "code", header: "الرمز", render: (r: any) => (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: r.color || "#3BB0FF", flexShrink: 0 }} />
        <span className="cell-mono">{r.code}</span>
      </span>
    )},
    { key: "mode", header: "النوع", render: (r: any) => <span className={`badge ${modeColorMap[r.mode] || "badge-info"}`}>{modeLabels[r.mode] || r.mode}</span> },
    { key: "name_ar", header: "الاسم", render: (r: any) => <span style={{ fontWeight: 500 }}>{r.name_ar}</span> },
    { key: "fare", header: "الأجرة", render: (r: any) => <span className="cell-mono">{formatFare(r.base_fare)} د.أ</span> },
    { key: "distance", header: "المسافة", render: (r: any) => <span className="cell-mono">{r.distance ? `${(r.distance / 1000).toFixed(1)} كم` : "—"}</span> },
    { key: "headway", header: "التكرار", render: (r: any) => <span className="cell-mono">{r.headway_peak ? `${r.headway_peak} ذروة` : "—"} {r.headway_offpeak ? `/ ${r.headway_offpeak}` : ""}</span> },
    { key: "status", header: "الحالة", render: (r: any) => <span className={`badge ${r.is_active ? "badge-success" : "badge-danger"}`}>{r.is_active ? "نشط" : "معطل"}</span> },
    { key: "actions", header: "إجراءات", render: (r: any) => (
      <div style={{ display: "flex", gap: 4 }}>
        <button className="btn btn-sm" onClick={() => openForm(r)} title="تعديل"><Edit3 size={12} /></button>
        <button className="btn btn-sm" onClick={() => handleCopyRoute(r)} title="نسخ" style={{ color: "var(--accent-2)", borderColor: "var(--accent-2-soft)" }}><Copy size={12} /></button>
        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r)} title="حذف"><Trash2 size={12} /></button>
      </div>
    )},
  ];

  return (
    <div>
      {/* Stats Banner */}
      {stats && !loading && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16,
        }}>
          <StatBadge label="إجمالي الخطوط" value={routes.length} color="var(--accent)" />
          <StatBadge label="نشط" value={stats.totalActive} color="var(--accent-2)" />
          <StatBadge label="معطل" value={stats.totalInactive} color="var(--danger)" />
          {Object.entries(stats.modeCounts).map(([mode, count]) => (
            <StatBadge key={mode} label={modeLabels[mode] || mode} value={count} color="var(--text-secondary)" />
          ))}
        </div>
      )}

      <Panel title="الخطوط والمسارات" subtitle={`${routes.length} خط | ${filteredRoutes.length} معروض`}
        headerRight={
          <div style={{ display: "flex", gap: 8 }}>
            <select className="form-select" value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}
              style={{ width: 140, padding: "6px 10px", fontSize: 12 }}>
              <option value="all">جميع الأنواع</option>
              {MODES.map((m) => <option key={m} value={m}>{modeLabels[m]}</option>)}
            </select>
            <button className="btn btn-sm" onClick={fetchRoutes}><RefreshCw size={12} /> تحديث</button>
            <button className="btn btn-primary btn-sm" onClick={() => openForm()}><Plus size={14} /> إضافة خط</button>
          </div>
        }>

        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditingRoute(null); setPolyline([]); } }}>
            <form onSubmit={handleSave}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24, width: "100%", maxWidth: 750, maxHeight: "90vh", overflow: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{editingRoute ? "تعديل خط" : "إضافة خط جديد"}</h3>
                <button className="btn btn-sm" type="button" onClick={() => { setShowForm(false); setEditingRoute(null); setPolyline([]); }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    <MapPin size={14} style={{ verticalAlign: "middle", marginRight: 4 }} /> ارسم مسار الخط على الخريطة
                  </label>
                  {polyline.length >= 2 && (
                    <button type="button" className="btn btn-sm" onClick={handleSnapRoute}
                      style={{ borderColor: "var(--accent-2)", color: "var(--accent-2)", fontSize: 11 }}>
                      <Sparkles size={12} /> توليد ذكي على الطرق
                    </button>
                  )}
                </div>
                <MapPicker mode="polyline" polyline={polyline} onPolylineChange={setPolyline} height={280} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label className="form-label">الرمز *</label><input className="form-input" name="code" required defaultValue={editingRoute?.code || ""} /></div>
                <div>
                  <label className="form-label">النوع *</label>
                  <select className="form-select" name="mode" required defaultValue={editingRoute?.mode || "city_bus"}>
                    {MODES.map((m) => <option key={m} value={m}>{modeLabels[m]}</option>)}
                  </select>
                </div>
                <div><label className="form-label">الاسم بالعربية *</label><input className="form-input" name="name_ar" required defaultValue={editingRoute?.name_ar || ""} /></div>
                <div><label className="form-label">الاسم بالإنجليزية *</label><input className="form-input" name="name_en" required defaultValue={editingRoute?.name_en || ""} /></div>
                <div><label className="form-label">اللون</label><input className="form-input" name="color" type="color" defaultValue={editingRoute?.color || "#3BB0FF"} style={{ padding: 4, height: 40 }} /></div>
                <div><label className="form-label">الأجرة (د.أ)</label><input className="form-input" name="baseFare" type="number" step="0.001" defaultValue={editingRoute?.base_fare || "0.350"} dir="ltr" /></div>
                <div><label className="form-label">محطة الانطلاق</label><input className="form-input" name="originStopId" defaultValue={editingRoute?.origin_stop_id || ""} placeholder="معرف المحطة" /></div>
                <div><label className="form-label">محطة الوصول</label><input className="form-input" name="destinationStopId" defaultValue={editingRoute?.destination_stop_id || ""} placeholder="معرف المحطة" /></div>
                <div><label className="form-label">أول رحلة (HH:MM)</label><input className="form-input" name="firstDeparture" defaultValue={editingRoute?.first_departure || ""} /></div>
                <div><label className="form-label">آخر رحلة (HH:MM)</label><input className="form-input" name="lastDeparture" defaultValue={editingRoute?.last_departure || ""} /></div>
                <div><label className="form-label">التكرار وقت الذروة (دقيقة)</label><input className="form-input" name="headwayPeak" type="number" defaultValue={editingRoute?.headway_peak || ""} dir="ltr" /></div>
                <div><label className="form-label">التكرار خارج الذروة (دقيقة)</label><input className="form-input" name="headwayOffpeak" type="number" defaultValue={editingRoute?.headway_offpeak || ""} dir="ltr" /></div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                    <input type="checkbox" name="isActive" value="1" defaultChecked={editingRoute ? editingRoute.is_active : true} /> نشط
                  </label>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
                <button className="btn" type="button" onClick={() => { setShowForm(false); setEditingRoute(null); setPolyline([]); }}>إلغاء</button>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? "جاري الحفظ..." : editingRoute ? "تحديث" : "إضافة"}
                </button>
              </div>
            </form>
          </div>
        )}

        {error ? <InlineError message="فشل تحميل الخطوط" onRetry={fetchRoutes} />
          : loading ? <TableSkeleton rows={8} cols={8} />
          : filteredRoutes.length === 0 ? <EmptyState message="لا توجد خطوط" />
          : <DataTable columns={columns} data={filteredRoutes as any[]} searchKeys={["name_ar", "code"]} searchPlaceholder="بحث عن خط..." defaultPageSize={25} />
        }
      </Panel>
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
      padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
      <span className="mono" style={{ fontSize: 18, fontWeight: 600, color }}>{value.toLocaleString("ar-JO")}</span>
    </div>
  );
}
