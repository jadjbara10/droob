"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   دروب Droob — Schedules Management Page
   Normal · Friday · Ramadan · Create · Edit · Delete
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2, Edit3, X, Clock, Info } from "lucide-react";
import { InlineError, EmptyState } from "@/components/error-boundary";
import { TableSkeleton } from "@/components/skeleton";
import { Panel } from "@/components/panel";
import { schedulesApi, routesApi, type ScheduleRecord, type ScheduleCreateInput } from "@/lib/api";

const SCHEDULE_TYPES: Record<string, { label: string; cls: string }> = {
  normal: { label: "عادي (أيام الأسبوع)", cls: "badge-info" },
  friday: { label: "الجمعة", cls: "badge-warn" },
  ramadan: { label: "رمضان", cls: "badge-purple" },
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [routes, setRoutes] = useState<{ id: string; name_ar: string; code: string }[]>([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [routeFilter, setRouteFilter] = useState("all");

  async function fetchSchedules() {
    setLoading(true); setError(false);
    try {
      const res = await schedulesApi.list();
      setSchedules(Array.isArray(res) ? res : []);
    } catch { setError(true); }
    finally { setLoading(false); }
  }

  async function fetchRoutes() {
    try {
      const res = await routesApi.list({ limit: 500 });
      const list = Array.isArray(res) ? res : (res.data || []);
      setRoutes(list.map((r: any) => ({ id: r.id, name_ar: r.name_ar, code: r.code })));
    } catch { /* optional */ }
  }

  useEffect(() => { fetchSchedules(); fetchRoutes(); }, []);

  function openForm(schedule?: ScheduleRecord) {
    setEditingSchedule(schedule || null);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const data: ScheduleCreateInput = {
        routeId: form.get("routeId") as string,
        scheduleType: form.get("scheduleType") as string,
        startTime: form.get("startTime") as string,
        endTime: form.get("endTime") as string,
        intervalMinutes: parseInt(form.get("intervalMinutes") as string) || 30,
      };
      if (editingSchedule) {
        await schedulesApi.update(editingSchedule.id, data);
      } else {
        await schedulesApi.create(data);
      }
      setShowForm(false); setEditingSchedule(null); fetchSchedules();
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  }

  async function handleDelete(schedule: ScheduleRecord) {
    const route = routes.find((r) => r.id === schedule.route_id);
    if (!confirm(`هل أنت متأكد من حذف هذا الجدول${route ? ` لخط ${route.name_ar}` : ""}؟`)) return;
    try { await schedulesApi.delete(schedule.id); fetchSchedules(); }
    catch (err) { alert((err as Error).message); }
  }

  const filtered = schedules.filter((s) => {
    if (typeFilter !== "all" && s.schedule_type !== typeFilter) return false;
    if (routeFilter !== "all" && s.route_id !== routeFilter) return false;
    return true;
  });

  return (
    <div>
      <Panel
        title="الجداول الزمنية"
        subtitle={`${schedules.length} جدول (${filtered.length} معروض)`}
        headerRight={
          <div style={{ display: "flex", gap: 8 }}>
            <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              style={{ width: 160, padding: "6px 10px", fontSize: 12 }}>
              <option value="all">جميع الأنواع</option>
              {Object.entries(SCHEDULE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="form-select" value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)}
              style={{ width: 180, padding: "6px 10px", fontSize: 12 }}>
              <option value="all">جميع الخطوط</option>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.code}</option>)}
            </select>
            <button className="btn btn-sm" onClick={fetchSchedules}><RefreshCw size={12} /> تحديث</button>
            <button className="btn btn-primary btn-sm" onClick={() => openForm()}><Plus size={14} /> إضافة جدول</button>
          </div>
        }
      >
        {/* Info Banner */}
        <div style={{
          padding: "12px 16px", marginBottom: 16, background: "var(--warn-soft)",
          border: "1px solid var(--warn)", borderRadius: "var(--radius-sm)", borderColor: "rgba(255,140,66,0.3)",
          display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--text-secondary)",
        }}>
          <Info size={16} style={{ color: "var(--warn)", flexShrink: 0 }} />
          <span>أوقات التشغيل لكل خط. يمكنك إضافة جدول عادي وآخر للجمعة وثالث لرمضان لكل خط.</span>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditingSchedule(null); } }}>
            <form onSubmit={handleSave}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 28, width: "100%", maxWidth: 500, maxHeight: "90vh", overflow: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>
                  {editingSchedule ? "تعديل جدول" : "إضافة جدول جديد"}
                </h3>
                <button className="btn btn-sm" type="button" onClick={() => { setShowForm(false); setEditingSchedule(null); }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label className="form-label">الخط *</label>
                  <select className="form-select" name="routeId" required defaultValue={editingSchedule?.route_id || ""}>
                    <option value="">اختر خط...</option>
                    {routes.map((r) => <option key={r.id} value={r.id}>{r.code} — {r.name_ar}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">نوع الجدول *</label>
                  <select className="form-select" name="scheduleType" required defaultValue={editingSchedule?.schedule_type || "normal"}>
                    {Object.entries(SCHEDULE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="form-label">وقت البداية *</label>
                    <input className="form-input" name="startTime" type="time" required
                      defaultValue={editingSchedule?.start_time || "06:00"} dir="ltr" />
                  </div>
                  <div>
                    <label className="form-label">وقت النهاية *</label>
                    <input className="form-input" name="endTime" type="time" required
                      defaultValue={editingSchedule?.end_time || "22:00"} dir="ltr" />
                  </div>
                </div>
                <div>
                  <label className="form-label">التكرار (دقيقة) *</label>
                  <input className="form-input" name="intervalMinutes" type="number" required min={5} max={120}
                    defaultValue={editingSchedule?.interval_minutes || 30} dir="ltr" />
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    مثلاً: 30 يعني كل نصف ساعة، 15 يعني كل ربع ساعة
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
                <button className="btn" type="button" onClick={() => { setShowForm(false); setEditingSchedule(null); }}>إلغاء</button>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? "جاري الحفظ..." : editingSchedule ? "تحديث" : "إضافة"}
                </button>
              </div>
            </form>
          </div>
        )}

        {error ? <InlineError message="فشل تحميل الجداول" onRetry={fetchSchedules} />
          : loading ? <TableSkeleton rows={5} cols={6} />
          : filtered.length === 0 ? <EmptyState message="لا توجد جداول" />
          : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الخط</th>
                    <th>النوع</th>
                    <th>البداية</th>
                    <th>النهاية</th>
                    <th>التكرار</th>
                    <th>عدد الرحلات/اليوم</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const route = routes.find((r) => r.id === s.route_id);
                    const st = SCHEDULE_TYPES[s.schedule_type] || SCHEDULE_TYPES.normal;
                    // Calculate trips per day
                    const [sh, sm] = (s.start_time || "06:00").split(":").map(Number);
                    const [eh, em] = (s.end_time || "22:00").split(":").map(Number);
                    const totalMin = (eh * 60 + em) - (sh * 60 + sm);
                    const trips = Math.floor(totalMin / (s.interval_minutes || 30));
                    return (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 500 }}>
                          {route ? `${route.code} — ${route.name_ar}` : s.route_id}
                        </td>
                        <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                        <td className="cell-mono">{s.start_time || "06:00"}</td>
                        <td className="cell-mono">{s.end_time || "22:00"}</td>
                        <td className="cell-mono">كل {s.interval_minutes} دقيقة</td>
                        <td className="cell-mono">{trips > 0 ? `${trips} رحلة` : "—"}</td>
                        <td>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="btn btn-sm" onClick={() => openForm(s)}><Edit3 size={12} /></button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s)}><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </Panel>
    </div>
  );
}
