// ============================================================================
// دروب (Droob) — Stops Management — API Integration + Edit/Delete
// ============================================================================

"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import { useStops, useImportStopsCsv, useCreateStop, useUpdateStop, useDeleteStop } from "@/lib/hooks";
import type { StopItem } from "@/lib/api";
import { useToast } from "@/components/Toaster";

const govs = ["عمان", "الزرقاء", "إربد", "البلقاء", "مادبا", "الكرك", "العقبة", "جرش", "عجلون", "المفرق"];

const INITIAL_FORM: Partial<StopItem> = {
  code: "", name_ar: "", name_en: "", governorate: govs[0],
  has_shelter: false, has_lighting: false, accessible: false,
};

// ─── Icons ─────────────────────────────────────────────────────────────────

const EditIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3,6 5,6 21,6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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

const PlusIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const BusStopIcon: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
  </svg>
);

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-700 rounded-lg ${className}`} />;
}

export default function StopsPage() {
  const { toast } = useToast();
  const { data: stops, loading, error, refetch } = useStops();
  const { execute: importCsv, loading: importing, error: importErr } = useImportStopsCsv();
  const { execute: createStop, loading: creatingStop, error: createStopError, resetError: resetCreateStopError } = useCreateStop();
  const { execute: updateStop, loading: updatingStop, error: updateStopError, resetError: resetUpdateStopError } = useUpdateStop();
  const { execute: deleteStop, loading: deletingStop, error: deleteStopError } = useDeleteStop();

  const [gov, setGov] = useState("الكل");
  const [search, setSearch] = useState("");

  // ── Modal State ──────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStop, setEditingStop] = useState<StopItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StopItem | null>(null);

  const [newStop, setNewStop] = useState<Partial<StopItem>>({ ...INITIAL_FORM });
  const [editForm, setEditForm] = useState<Partial<StopItem>>({ ...INITIAL_FORM });

  const stopList = stops || [];

  const filtered = useMemo(() => {
    return stopList.filter((s: StopItem) => {
      if (gov !== "الكل" && s.governorate !== gov) return false;
      if (search && !s.name_ar.includes(search) && !s.name_en.toLowerCase().includes(search.toLowerCase()) && !s.code.includes(search)) return false;
      return true;
    });
  }, [stopList, gov, search]);

  const kpis = useMemo(() => ({
    total: stopList.length,
    withShelter: stopList.filter((s: StopItem) => s.has_shelter).length,
    withoutShelter: stopList.filter((s: StopItem) => !s.has_shelter).length,
    accessible: stopList.filter((s: StopItem) => s.accessible).length,
  }), [stopList]);

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importCsv(file);
      refetch();
    } catch { /* error from hook */ }
  };

  const openEditModal = useCallback((stop: StopItem) => {
    setEditingStop(stop);
    setEditForm({
      code: stop.code,
      name_ar: stop.name_ar,
      name_en: stop.name_en,
      governorate: stop.governorate,
      has_shelter: stop.has_shelter,
      has_lighting: stop.has_lighting,
      accessible: stop.accessible,
    });
    setShowEditModal(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingStop(null);
    setEditForm({ ...INITIAL_FORM });
    resetUpdateStopError();
  }, [resetUpdateStopError]);

  const handleEditSave = useCallback(async () => {
    if (!editingStop || !editForm.name_ar?.trim() || !editForm.code?.trim()) {
      toast("يرجى ملء الحقول المطلوبة", "warning");
      return;
    }
    try {
      await updateStop(editingStop.id, {
        code: editForm.code,
        name_ar: editForm.name_ar,
        name_en: editForm.name_en,
        governorate: editForm.governorate,
        has_shelter: editForm.has_shelter,
        has_lighting: editForm.has_lighting,
        accessible: editForm.accessible,
      });
      toast("تم تحديث المحطة بنجاح", "success");
      closeEditModal();
      refetch();
    } catch {
      toast(updateStopError || "فشل تحديث المحطة", "error");
    }
  }, [editingStop, editForm, updateStop, closeEditModal, refetch, toast, updateStopError]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteStop(deleteTarget.id);
      toast("تم حذف المحطة بنجاح", "success");
      setDeleteTarget(null);
      refetch();
    } catch {
      toast(deleteStopError || "فشل حذف المحطة", "error");
    }
  }, [deleteTarget, deleteStop, refetch, toast, deleteStopError]);

  const headerProps = {
    title: "قاعدة بيانات المحطات",
    actions: (
      <div className="flex gap-3">
        <label className={`flex items-center gap-2 px-4 py-2 rounded-input bg-surface-2 border border-gray-800 text-sm text-secondary font-medium cursor-pointer hover:bg-surface-3 transition-colors ${importing ? "opacity-50" : ""}`}>
          📥 {importing ? "جاري الاستيراد..." : "استيراد CSV"}
          <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" disabled={importing} />
        </label>
        <button
          onClick={() => { setShowAddModal(true); resetCreateStopError(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-input bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue/90 transition-colors"
        >
          <PlusIcon />
          إضافة محطة
        </button>
      </div>
    ),
  };

  return (
    <DashboardShell headerProps={headerProps}>
      <div className="space-y-6">
        {/* Error banner */}
        {(error || importErr) && (
          <div className="flex items-center justify-between p-4 rounded-card bg-critical/5 border border-cancelled/20 text-sm text-critical">
            <span>⚠️ {error || importErr}</span>
            <button onClick={refetch} className="flex items-center gap-1.5 px-3 py-1.5 rounded-input bg-critical/10 text-critical text-xs font-medium hover:bg-critical/20 transition-colors">
              <RefreshIcon />
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-3 p-4 rounded-card bg-surface border border-gray-800">
            <div className="w-10 h-10 rounded-input bg-brand-blue/10 flex items-center justify-center text-lg font-bold text-brand-blue">
              {loading ? "—" : kpis.total}
            </div>
            <div><div className="text-xs font-medium text-secondary">إجمالي المحطات</div></div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-card bg-surface border border-gray-800">
            <div className="w-10 h-10 rounded-input bg-brand-green/10 flex items-center justify-center text-lg font-bold text-brand-green">
              {loading ? "—" : kpis.withShelter}
            </div>
            <div><div className="text-xs font-medium text-secondary">بمظلة</div></div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-card bg-surface border border-gray-800">
            <div className="w-10 h-10 rounded-input bg-delayed/10 flex items-center justify-center text-lg font-bold text-delayed">
              {loading ? "—" : kpis.withoutShelter}
            </div>
            <div><div className="text-xs font-medium text-secondary">بدون مظلة</div></div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-card bg-surface border border-gray-800">
            <div className="w-10 h-10 rounded-input bg-[#1A4F8A]/10 flex items-center justify-center text-lg font-bold text-[#1A4F8A]">
              {loading ? "—" : kpis.accessible}
            </div>
            <div><div className="text-xs font-medium text-secondary">مناسب لذوي الاحتياجات</div></div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-card bg-surface border border-gray-800">
          <input
            className="flex-1 min-w-[200px] h-9 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
            placeholder="🔍 بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="h-9 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue cursor-pointer appearance-none"
            value={gov}
            onChange={(e) => setGov(e.target.value)}
            style={{
              backgroundImage: "url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')",
              backgroundPosition: "left 0.75rem center",
              backgroundRepeat: "no-repeat",
              paddingLeft: "2rem",
            }}
          >
            <option value="الكل">كل المحافظات</option>
            {govs.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <div className="text-xs text-muted mr-auto">
            {loading ? "جاري التحميل..." : `${filtered.length} من ${stopList.length} محطة`}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-card bg-surface border border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h3 className="font-bold text-primary text-sm">المحطات ({filtered.length})</h3>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-6 w-16" /><Skeleton className="h-6 w-32" /><Skeleton className="h-6 w-24" /><Skeleton className="h-6 w-16" /><Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الكود</th><th>الاسم العربي</th><th>الاسم الإنجليزي</th><th>المحافظة</th><th>مظلة</th><th>إضاءة</th><th>مناسب</th><th>عدد الخطوط</th><th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s: StopItem) => (
                    <tr key={s.id}>
                      <td className="font-mono text-sm">{s.code}</td>
                      <td className="font-semibold">{s.name_ar}</td>
                      <td className="text-gray-500 text-sm">{s.name_en}</td>
                      <td>{s.governorate}</td>
                      <td>{s.has_shelter ? "✅" : "❌"}</td>
                      <td>{s.has_lighting ? "✅" : "❌"}</td>
                      <td>{s.accessible ? "✅" : "❌"}</td>
                      <td className="font-mono">{s.lines_count}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-1.5 rounded-input hover:bg-brand-blue/10 transition-colors text-secondary hover:text-brand-blue"
                            title="تعديل"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(s)}
                            className="p-1.5 rounded-input hover:bg-critical/10 transition-colors text-secondary hover:text-critical"
                            title="حذف"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && !loading && (
                    <tr><td colSpan={9} className="text-center text-gray-500 py-8">لا توجد نتائج</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        {!loading && stopList.length > 0 && (
          <div className="flex items-center justify-between text-xs text-muted">
            <span>إجمالي المحطات: {stopList.length}</span>
            <button onClick={refetch} className="flex items-center gap-1.5 px-3 py-1.5 rounded-input bg-surface border border-gray-800 text-secondary hover:text-primary hover:bg-surface-2 transition-colors">
              <RefreshIcon />
              تحديث
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ADD STOP MODAL                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
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
              className="w-[480px] p-6 bg-surface rounded-modal border border-gray-800 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-input bg-brand-blue/10 flex items-center justify-center"><BusStopIcon /></div>
                <div>
                  <h2 className="text-lg font-bold text-primary">إضافة محطة جديدة</h2>
                  <p className="text-xs text-muted mt-0.5">إضافة محطة جديدة إلى النظام</p>
                </div>
              </div>

              {createStopError && (
                <div className="mb-4 p-3 bg-critical/10 border border-cancelled/20 rounded-card text-sm text-critical">
                  ⚠️ {createStopError}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1.5">الكود</label>
                    <input className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
                      value={newStop.code} onChange={(e) => setNewStop((p) => ({ ...p, code: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1.5">المحافظة</label>
                    <select className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue cursor-pointer appearance-none"
                      value={newStop.governorate} onChange={(e) => setNewStop((p) => ({ ...p, governorate: e.target.value }))}
                      style={{
                        backgroundImage: "url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')",
                        backgroundPosition: "left 0.75rem center",
                        backgroundRepeat: "no-repeat",
                        paddingLeft: "2rem",
                      }}
                    >
                      {govs.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">الاسم (عربي)</label>
                  <input className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
                    value={newStop.name_ar} onChange={(e) => setNewStop((p) => ({ ...p, name_ar: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">الاسم (English)</label>
                  <input className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
                    style={{ direction: "ltr", textAlign: "left" }}
                    value={newStop.name_en} onChange={(e) => setNewStop((p) => ({ ...p, name_en: e.target.value }))} />
                </div>
                <div className="flex gap-6">
                  {[
                    { key: "has_shelter", label: "مظلة" },
                    { key: "has_lighting", label: "إضاءة" },
                    { key: "accessible", label: "مناسب" },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
                      <input type="checkbox" checked={(newStop as any)[key] || false}
                        onChange={(e) => setNewStop((p) => ({ ...p, [key]: e.target.checked }))} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button className="flex-1 h-11 rounded-input bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  disabled={creatingStop}
                  onClick={async () => {
                    try {
                      await createStop(newStop);
                      refetch();
                      setShowAddModal(false);
                      setNewStop({ ...INITIAL_FORM });
                    } catch { /* error shown via createStopError */ }
                  }}>
                  {creatingStop ? "جاري الإضافة..." : "إضافة"}
                </button>
                <button onClick={() => setShowAddModal(false)} disabled={creatingStop}
                  className="flex-1 h-11 rounded-input bg-surface-2 border border-gray-800 text-secondary text-sm font-medium hover:bg-surface-3 transition-colors">
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* EDIT STOP MODAL                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showEditModal && editingStop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={closeEditModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-[480px] p-6 bg-surface rounded-modal border border-gray-800 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-input bg-brand-blue/10 flex items-center justify-center"><BusStopIcon /></div>
                <div>
                  <h2 className="text-lg font-bold text-primary">تعديل المحطة</h2>
                  <p className="text-xs text-muted mt-0.5">{editingStop.name_ar}</p>
                </div>
              </div>

              {updateStopError && (
                <div className="mb-4 p-3 bg-critical/10 border border-cancelled/20 rounded-card text-sm text-critical">
                  ⚠️ {updateStopError}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1.5">الكود</label>
                    <input className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
                      value={editForm.code} onChange={(e) => setEditForm((p) => ({ ...p, code: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1.5">المحافظة</label>
                    <select className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue cursor-pointer appearance-none"
                      value={editForm.governorate} onChange={(e) => setEditForm((p) => ({ ...p, governorate: e.target.value }))}
                      style={{
                        backgroundImage: "url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')",
                        backgroundPosition: "left 0.75rem center",
                        backgroundRepeat: "no-repeat",
                        paddingLeft: "2rem",
                      }}
                    >
                      {govs.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">الاسم (عربي)</label>
                  <input className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
                    value={editForm.name_ar} onChange={(e) => setEditForm((p) => ({ ...p, name_ar: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">الاسم (English)</label>
                  <input className="w-full h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
                    style={{ direction: "ltr", textAlign: "left" }}
                    value={editForm.name_en} onChange={(e) => setEditForm((p) => ({ ...p, name_en: e.target.value }))} />
                </div>
                <div className="flex gap-6">
                  {[
                    { key: "has_shelter", label: "مظلة" },
                    { key: "has_lighting", label: "إضاءة" },
                    { key: "accessible", label: "مناسب" },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
                      <input type="checkbox" checked={(editForm as any)[key] || false}
                        onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.checked }))} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={handleEditSave} disabled={updatingStop}
                  className="flex-1 h-11 rounded-input bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  {updatingStop ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>
                <button onClick={closeEditModal} disabled={updatingStop}
                  className="flex-1 h-11 rounded-input bg-surface-2 border border-gray-800 text-secondary text-sm font-medium hover:bg-surface-3 transition-colors">
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DELETE CONFIRMATION DIALOG                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-full max-w-sm mx-4 bg-surface rounded-modal border border-gray-800 shadow-xl p-6"
              dir="rtl"
            >
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-critical/10 flex items-center justify-center mx-auto mb-4">
                  <TrashIcon />
                </div>
                <h3 className="text-lg font-bold text-primary mb-2">تأكيد الحذف</h3>
                <p className="text-sm text-secondary mb-6">
                  هل أنت متأكد من حذف المحطة{" "}
                  <span className="font-semibold text-primary">{deleteTarget.name_ar}</span>؟
                </p>
                <p className="text-xs text-muted mb-6 -mt-4">لا يمكن التراجع عن هذا الإجراء</p>
                <div className="flex items-center justify-center gap-3">
                  <button onClick={confirmDelete} disabled={deletingStop}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-input bg-cancelled text-white text-sm font-bold hover:bg-critical/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {deletingStop ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                          <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
                        </svg>
                        جاري الحذف...
                      </>
                    ) : "نعم، احذف المحطة"}
                  </button>
                  <button onClick={() => setDeleteTarget(null)}
                    className="px-5 py-2.5 rounded-input bg-surface-2 border border-gray-800 text-secondary text-sm font-medium hover:bg-surface-3 transition-colors">
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}