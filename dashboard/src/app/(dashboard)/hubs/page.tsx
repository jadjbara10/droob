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

export default function HubsPage() {
  const [hubs, setHubs] = useState<StopRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingHub, setEditingHub] = useState<StopRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [mapLat, setMapLat] = useState(31.9539);
  const [mapLng, setMapLng] = useState(35.9106);

  async function fetchHubs() {
    setLoading(true); setError(false);
    try {
      const res = await stopsApi.list({ limit: 200, isTerminal: true });
      setHubs(Array.isArray(res) ? res : (res.data || []));
    } catch { setError(true); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchHubs(); }, []);

  function openForm(hub?: StopRecord) {
    if (hub) { setEditingHub(hub); setMapLat(hub.lat); setMapLng(hub.lng); }
    else { setEditingHub(null); setMapLat(31.9539); setMapLng(35.9106); }
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
        lat: mapLat, lng: mapLng,
        governorate: form.get("governorate") as string,
        city: (form.get("city") as string) || undefined,
        isTerminal: true,
        hasShelter: true,
        hasAccessibility: form.get("hasAccessibility") === "1",
        hasAc: form.get("hasAc") === "1",
      };
      if (editingHub) { await stopsApi.update(editingHub.id, data); }
      else { await stopsApi.create(data); }
      setShowForm(false); setEditingHub(null); fetchHubs();
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  }

  async function handleDelete(hub: StopRecord) {
    if (!confirm(`هل أنت متأكد من حذف مجمع "${hub.name_ar}"؟`)) return;
    try { await stopsApi.delete(hub.id); fetchHubs(); }
    catch (err) { alert((err as Error).message); }
  }

  const columns: Column[] = [
    { key: "code", header: "الرمز", render: (r: any) => <span className="cell-mono">{r.code}</span> },
    { key: "name_ar", header: "الاسم", render: (r: any) => <span style={{ fontWeight: 500 }}>{r.name_ar}</span> },
    { key: "governorate", header: "المحافظة", render: (r: any) => <span>{r.governorate}</span> },
    { key: "city", header: "المدينة", render: (r: any) => <span>{r.city || "—"}</span> },
    { key: "facilities", header: "المرافق", render: (r: any) => (
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {r.has_accessibility && <span className="tag tag-success">سهولة وصول</span>}
        {r.has_ac && <span className="tag tag-info">تكييف</span>}
        {r.has_ticket_machine && <span className="tag tag-purple">تذاكر</span>}
      </div>
    )},
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
      <Panel title="إدارة المجمعات" subtitle={`${hubs.length} مجمع`}
        headerRight={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-sm" onClick={fetchHubs}><RefreshCw size={12} /> تحديث</button>
            <button className="btn btn-primary btn-sm" onClick={() => openForm()}><Plus size={14} /> إضافة مجمع</button>
          </div>
        }>

        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditingHub(null); } }}>
            <form onSubmit={handleSave} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24, width: "100%", maxWidth: 700, maxHeight: "90vh", overflow: "auto" }}>
              <h3 style={{ marginBottom: 20, fontSize: 16 }}>{editingHub ? "تعديل مجمع" : "إضافة مجمع جديد"}</h3>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label"><MapPin size={14} style={{ verticalAlign: "middle", marginLeft: 4 }} /> اختر الموقع على الخريطة</label>
                <MapPicker mode="point" value={{ lat: mapLat, lng: mapLng }}
                  onChange={(ll) => { setMapLat(ll.lat); setMapLng(ll.lng); }}
                  existingStops={hubs.filter(s => s.id !== editingHub?.id).map(s => ({ lat: s.lat, lng: s.lng, name_ar: s.name_ar }))}
                  height={280} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label className="form-label">الرمز *</label><input className="form-input" name="code" required defaultValue={editingHub?.code || ""} /></div>
                <div><label className="form-label">المحافظة *</label>
                  <select className="form-select" name="governorate" defaultValue={editingHub?.governorate || "عمان"}>
                    {["عمان","إربد","الزرقاء","البلقاء","مادبا","الكرك","الطفيلة","معان","العقبة","جرش","عجلون","المفرق"].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div><label className="form-label">الاسم بالعربية *</label><input className="form-input" name="name_ar" required defaultValue={editingHub?.name_ar || ""} /></div>
                <div><label className="form-label">الاسم بالإنجليزية *</label><input className="form-input" name="name_en" required defaultValue={editingHub?.name_en || ""} /></div>
                <div><label className="form-label">المدينة</label><input className="form-input" name="city" defaultValue={editingHub?.city || ""} /></div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}><input type="checkbox" name="hasAccessibility" value="1" defaultChecked={editingHub?.has_accessibility} /> سهولة وصول</label>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}><input type="checkbox" name="hasAc" value="1" defaultChecked={editingHub?.has_ac} /> تكييف</label>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
                <button className="btn" type="button" onClick={() => { setShowForm(false); setEditingHub(null); }}>إلغاء</button>
                <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "جاري الحفظ..." : editingHub ? "تحديث" : "إضافة"}</button>
              </div>
            </form>
          </div>
        )}

        {error ? <InlineError message="فشل تحميل المجمعات" onRetry={fetchHubs} />
          : loading ? <TableSkeleton rows={5} cols={8} />
          : hubs.length === 0 ? <EmptyState message="لا توجد مجمعات" />
          : <DataTable columns={columns} data={hubs as any[]} searchKeys={["name_ar", "code"]} searchPlaceholder="بحث عن مجمع..." defaultPageSize={25} />
        }
      </Panel>
    </div>
  );
}
