"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   دروب Droob — Fares Management Page
   Table of fare rules · Create · Edit · Delete · Filter by route
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2, Edit3, X, DollarSign, Info } from "lucide-react";
import { InlineError, EmptyState } from "@/components/error-boundary";
import { TableSkeleton } from "@/components/skeleton";
import { Panel } from "@/components/panel";
import { faresApi, routesApi, type FareRule, type FareCreateInput } from "@/lib/api";
import { formatFare } from "@/lib/utils";

export default function FaresPage() {
  const [fares, setFares] = useState<FareRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingFare, setEditingFare] = useState<FareRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [routes, setRoutes] = useState<{ id: string; name_ar: string; code: string }[]>([]);
  const [routeFilter, setRouteFilter] = useState("all");

  async function fetchFares() {
    setLoading(true); setError(false);
    try {
      const res = await faresApi.list();
      setFares(Array.isArray(res) ? res : []);
    } catch { setError(true); }
    finally { setLoading(false); }
  }

  async function fetchRoutes() {
    try {
      const res = await routesApi.list({ limit: 200 });
      const list = Array.isArray(res) ? res : (res.data || []);
      setRoutes(list.map((r: any) => ({ id: r.id, name_ar: r.name_ar, code: r.code })));
    } catch { /* optional */ }
  }

  useEffect(() => { fetchFares(); fetchRoutes(); }, []);

  function openForm(fare?: FareRule) {
    setEditingFare(fare || null);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const data: FareCreateInput = {
        fareAmount: parseFloat((form.get("fareAmount") as string) || "0.35"),
        currency: (form.get("currency") as string) || "JOD",
        routeId: (form.get("routeId") as string) || undefined,
        fromGovernorate: (form.get("fromGovernorate") as string) || undefined,
        toGovernorate: (form.get("toGovernorate") as string) || undefined,
        distanceMinKm: form.get("distanceMinKm") ? parseFloat(form.get("distanceMinKm") as string) : undefined,
        distanceMaxKm: form.get("distanceMaxKm") ? parseFloat(form.get("distanceMaxKm") as string) : undefined,
      };
      if (editingFare) {
        await faresApi.update(editingFare.id, data);
      } else {
        await faresApi.create(data);
      }
      setShowForm(false); setEditingFare(null); fetchFares();
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  }

  async function handleDelete(fare: FareRule) {
    if (!confirm(`هل أنت متأكد من حذف هذه التسعيرة؟`)) return;
    try { await faresApi.delete(fare.id); fetchFares(); }
    catch (err) { alert((err as Error).message); }
  }

  const filteredFares = routeFilter === "all" ? fares : fares.filter((f) => f.route_id === routeFilter);

  const governors = ["عمان","إربد","الزرقاء","البلقاء","مادبا","الكرك","الطفيلة","معان","العقبة","جرش","عجلون","المفرق"];

  return (
    <div>
      <Panel
        title="إدارة الأجرة"
        subtitle={`${fares.length} تسعيرة`}
        headerRight={
          <div style={{ display: "flex", gap: 8 }}>
            <select className="form-select" value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)}
              style={{ width: 200, padding: "6px 10px", fontSize: 12 }}>
              <option value="all">جميع الخطوط</option>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.code} — {r.name_ar}</option>)}
            </select>
            <button className="btn btn-sm" onClick={fetchFares}><RefreshCw size={12} /> تحديث</button>
            <button className="btn btn-primary btn-sm" onClick={() => openForm()}><Plus size={14} /> إضافة تسعيرة</button>
          </div>
        }
      >
        {/* Info Banner */}
        <div style={{
          padding: "12px 16px", marginBottom: 16, background: "var(--accent-soft)",
          border: "1px solid var(--border-active)", borderRadius: "var(--radius-sm)",
          display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--text-secondary)",
        }}>
          <Info size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span>الأسعار بالدينار الأردني. السعر الأساسي للباص 0.500 د.أ، للسرفيس 0.250 د.أ، BRT 0.500 د.أ</span>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditingFare(null); } }}>
            <form onSubmit={handleSave}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 28, width: "100%", maxWidth: 550, maxHeight: "90vh", overflow: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>
                  {editingFare ? "تعديل تسعيرة" : "إضافة تسعيرة جديدة"}
                </h3>
                <button className="btn btn-sm" type="button" onClick={() => { setShowForm(false); setEditingFare(null); }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label className="form-label">الخط</label>
                  <select className="form-select" name="routeId" defaultValue={editingFare?.route_id || ""}>
                    <option value="">عام (جميع الخطوط)</option>
                    {routes.map((r) => <option key={r.id} value={r.id}>{r.code} — {r.name_ar}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="form-label">من محافظة</label>
                    <select className="form-select" name="fromGovernorate" defaultValue={editingFare?.from_governorate || ""}>
                      <option value="">—</option>
                      {governors.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">إلى محافظة</label>
                    <select className="form-select" name="toGovernorate" defaultValue={editingFare?.to_governorate || ""}>
                      <option value="">—</option>
                      {governors.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">المبلغ (دينار أردني) *</label>
                  <input className="form-input" name="fareAmount" type="number" step="0.001" required
                    defaultValue={editingFare ? parseFloat(formatFare(editingFare.fare_amount)) : "0.350"} dir="ltr" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="form-label">أقل مسافة (كم)</label>
                    <input className="form-input" name="distanceMinKm" type="number" step="0.1"
                      defaultValue={editingFare?.distance_min_km || ""} dir="ltr" />
                  </div>
                  <div>
                    <label className="form-label">أقصى مسافة (كم)</label>
                    <input className="form-input" name="distanceMaxKm" type="number" step="0.1"
                      defaultValue={editingFare?.distance_max_km || ""} dir="ltr" />
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
                <button className="btn" type="button" onClick={() => { setShowForm(false); setEditingFare(null); }}>إلغاء</button>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? "جاري الحفظ..." : editingFare ? "تحديث" : "إضافة"}
                </button>
              </div>
            </form>
          </div>
        )}

        {error ? <InlineError message="فشل تحميل التسعيرات" onRetry={fetchFares} />
          : loading ? <TableSkeleton rows={5} cols={6} />
          : filteredFares.length === 0 ? <EmptyState message="لا توجد تسعيرات" />
          : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الخط</th>
                    <th>من محافظة</th>
                    <th>إلى محافظة</th>
                    <th>المسافة</th>
                    <th>المبلغ</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFares.map((f) => {
                    const route = routes.find((r) => r.id === f.route_id);
                    return (
                      <tr key={f.id}>
                        <td>
                          {route ? (
                            <span style={{ fontWeight: 500 }}>{route.code} — {route.name_ar}</span>
                          ) : <span className="tag tag-success">عام</span>}
                        </td>
                        <td>{f.from_governorate || "—"}</td>
                        <td>{f.to_governorate || "—"}</td>
                        <td className="cell-mono">
                          {f.distance_min_km != null && f.distance_max_km != null
                            ? `${f.distance_min_km} - ${f.distance_max_km} كم`
                            : "—"}
                        </td>
                        <td className="cell-mono" style={{ fontWeight: 600, color: "var(--accent-2)" }}>
                          {formatFare(f.fare_amount)} {f.currency}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="btn btn-sm" onClick={() => openForm(f)}><Edit3 size={12} /></button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(f)}><Trash2 size={12} /></button>
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
