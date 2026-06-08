"use client";

import React, { useEffect, useState } from "react";
import { Plus, RefreshCw, MapPin } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { InlineError, EmptyState } from "@/components/error-boundary";
import { TableSkeleton } from "@/components/skeleton";
import { Panel } from "@/components/panel";
import { MapPicker } from "@/components/map/map-picker";
import { stopsApi, type StopRecord, type StopCreateInput } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

export default function StopsPage() {
  const [stops, setStops] = useState<StopRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingStop, setEditingStop] = useState<StopRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Map picker state
  const [mapLat, setMapLat] = useState(31.9539);
  const [mapLng, setMapLng] = useState(35.9106);

  async function fetchStops() {
    setLoading(true); setError(false);
    try {
      const res = await stopsApi.list({ limit: 500 });
      setStops(Array.isArray(res) ? res : (res.data || []));
    } catch { setError(true); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchStops(); }, []);

  function openForm(stop?: StopRecord) {
    if (stop) {
      setEditingStop(stop);
      setMapLat(stop.lat);
      setMapLng(stop.lng);
    } else {
      setEditingStop(null);
      setMapLat(31.9539);
      setMapLng(35.9106);
    }
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const data: StopCreateInput = {
        code: form.get("code") as string,
        name_ar: form.get("name_ar") as string,
        name_en: form.get("name_en") as string,
        lat: mapLat,
        lng: mapLng,
        governorate: form.get("governorate") as string,
        city: (form.get("city") as string) || undefined,
        isTerminal: form.get("isTerminal") === "1",
        hasShelter: form.get("hasShelter") === "1",
        hasAccessibility: form.get("hasAccessibility") === "1",
        hasAc: form.get("hasAc") === "1",
      };
      if (editingStop) {
        await stopsApi.update(editingStop.id, data);
      } else {
        await stopsApi.create(data);
      }
      setShowForm(false); setEditingStop(null); fetchStops();
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  }

  async function handleDelete(stop: StopRecord) {
    if (!confirm(`هل أنت متأكد من حذف محطة "${stop.name_ar}"؟`)) return;
    try { await stopsApi.delete(stop.id); fetchStops(); }
    catch (err) { alert((err as Error).message); }
  }

  const columns: Column[] = [
    { key: "code", header: "الرمز", render: (r: any) => <span className="cell-mono">{r.code}</span> },
    { key: "name_ar", header: "الاسم", render: (r: any) => <span style={{ fontWeight: 500 }}>{r.name_ar}</span> },
    { key: "governorate", header: "المحافظة", render: (r: any) => <span>{r.governorate}</span> },
    { key: "city", header: "المدينة", render: (r: any) => <span>{r.city || "—"}</span> },
    { key: "type", header: "النوع", render: (r: any) => <span className={`badge ${r.is_terminal ? "badge-success" : "badge-info"}`}>{r.is_terminal ? "مجمع" : "محطة"}</span> },
    { key: "coords", header: "الإحداثيات", render: (r: any) => <span className="cell-mono">{r.lat.toFixed(3)}, {r.lng.toFixed(3)}</span> },
    { key: "created", header: "تاريخ الإضافة", render: (r: any) => <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDateTime(r.created_at)}</span> },
    { key: "actions", header: "إجراءات", render: (r: any) => (
      <div style={{ display: "flex", gap: 4 }}>
        <button className="btn btn-sm" onClick={() => openForm(r)}>تعديل</button>
        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r)}>حذف</button>
      </div>
    )},
  ];

  return (
    <div>
      <Panel title="إدارة المحطات" subtitle={`${stops.length} محطة`}
        headerRight={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-sm" onClick={fetchStops}><RefreshCw size={12} /> تحديث</button>
            <button className="btn btn-primary btn-sm" onClick={() => openForm()}><Plus size={14} /> إضافة محطة</button>
          </div>
        }
      >
        {/* ── Map Picker Modal ── */}
        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditingStop(null); } }}>
            <form onSubmit={handleSave}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24, width: "100%", maxWidth: 700, maxHeight: "90vh", overflow: "auto" }}>
              <h3 style={{ marginBottom: 20, fontSize: 16 }}>
                {editingStop ? "تعديل محطة" : "إضافة محطة جديدة"}
              </h3>

              {/* Map Picker */}
              <div style={{ marginBottom: 16 }}>
                <label className="form-label"><MapPin size={14} style={{ verticalAlign: "middle", marginLeft: 4 }} /> اختر الموقع على الخريطة</label>
                <MapPicker
                  mode="point"
                  value={{ lat: mapLat, lng: mapLng }}
                  onChange={(ll) => { setMapLat(ll.lat); setMapLng(ll.lng); }}
                  existingStops={stops.filter(s => s.id !== editingStop?.id).map(s => ({ lat: s.lat, lng: s.lng, name_ar: s.name_ar }))}
                  height={280}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label className="form-label">الرمز *</label><input className="form-input" name="code" required defaultValue={editingStop?.code || ""} /></div>
                <div>
                  <label className="form-label">المحافظة *</label>
                  <select className="form-select" name="governorate" defaultValue={editingStop?.governorate || "عمان"}>
                    {["عمان","إربد","الزرقاء","البلقاء","مادبا","الكرك","الطفيلة","معان","العقبة","جرش","عجلون","المفرق"].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div><label className="form-label">الاسم بالعربية *</label><input className="form-input" name="name_ar" required defaultValue={editingStop?.name_ar || ""} /></div>
                <div><label className="form-label">الاسم بالإنجليزية *</label><input className="form-input" name="name_en" required defaultValue={editingStop?.name_en || ""} /></div>
                <div><label className="form-label">المدينة</label><input className="form-input" name="city" defaultValue={editingStop?.city || ""} /></div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}><input type="checkbox" name="isTerminal" value="1" defaultChecked={editingStop?.is_terminal} /> مجمع</label>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}><input type="checkbox" name="hasShelter" value="1" defaultChecked={editingStop?.has_shelter} /> مظلة</label>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}><input type="checkbox" name="hasAccessibility" value="1" defaultChecked={editingStop?.has_accessibility} /> سهولة وصول</label>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}><input type="checkbox" name="hasAc" value="1" defaultChecked={editingStop?.has_ac} /> تكييف</label>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
                <button className="btn" type="button" onClick={() => { setShowForm(false); setEditingStop(null); }}>إلغاء</button>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? "جاري الحفظ..." : editingStop ? "تحديث" : "إضافة"}
                </button>
              </div>
            </form>
          </div>
        )}

        {error ? <InlineError message="فشل تحميل المحطات" onRetry={fetchStops} />
          : loading ? <TableSkeleton rows={8} cols={8} />
          : stops.length === 0 ? <EmptyState message="لا توجد محطات" />
          : <DataTable columns={columns} data={stops as any[]} searchKeys={["name_ar", "code", "governorate"]} searchPlaceholder="بحث عن محطة..." defaultPageSize={25} />
        }
      </Panel>
    </div>
  );
}
