// ============================================================================
// دروب (Droob) — Stops Management — API Integration
// ============================================================================

"use client";

import { useState, useMemo } from "react";
import { useStops, useImportStopsCsv } from "@/lib/hooks";
import type { StopItem } from "@/lib/api";

const govs = ["عمان", "الزرقاء", "إربد", "البلقاء", "مادبا", "الكرك", "العقبة", "جرش", "عجلون", "المفرق"];

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

export default function StopsPage() {
  const { data: stops, loading, error, refetch } = useStops();
  const { execute: importCsv, loading: importing, error: importErr } = useImportStopsCsv();

  const [gov, setGov] = useState("الكل");
  const [search, setSearch] = useState("");

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

  return (
    <div className="page-wrapper" dir="rtl">
      <div className="page-header">
        <div>
          <h1 className="page-title">قاعدة بيانات المحطات</h1>
          <p className="page-subtitle">{loading ? "جاري التحميل..." : `${stopList.length}+ محطة في النظام`}</p>
        </div>
        <div className="flex gap-3">
          <label className={`btn-outline cursor-pointer ${importing ? "opacity-50" : ""}`}>
            📥 {importing ? "جاري الاستيراد..." : "استيراد CSV"}
            <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" disabled={importing} />
          </label>
          <button className="btn-primary">+ إضافة محطة</button>
        </div>
      </div>

      {(error || importErr) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
          ⚠️ {error || importErr}
          <button onClick={refetch} className="mr-3 underline text-red-800">إعادة المحاولة</button>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="kpi-card"><div className="text-xs text-gray-400 mb-1">إجمالي المحطات</div><div className="kpi-value">{loading ? "—" : kpis.total}</div></div>
        <div className="kpi-card"><div className="text-xs text-gray-400 mb-1">بمظلة</div><div className="kpi-value text-[#16A34A]">{loading ? "—" : kpis.withShelter}</div></div>
        <div className="kpi-card"><div className="text-xs text-gray-400 mb-1">بدون مظلة</div><div className="kpi-value text-[#EAB308]">{loading ? "—" : kpis.withoutShelter}</div></div>
        <div className="kpi-card"><div className="text-xs text-gray-400 mb-1">مناسبة لذوي الاحتياجات</div><div className="kpi-value text-[#1A4F8A]">{loading ? "—" : kpis.accessible}</div></div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 bg-white rounded-xl p-4 border">
        <input className="form-input max-w-xs" placeholder="🔍 بحث..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="form-select w-36" value={gov} onChange={(e) => setGov(e.target.value)}>
          <option value="الكل">كل المحافظات</option>
          {govs.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">المحطات ({filtered.length})</h3>
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
                  <th>الكود</th><th>الاسم العربي</th><th>الاسم الإنجليزي</th><th>المحافظة</th><th>مظلة</th><th>إضاءة</th><th>مناسب لذوي الاحتياجات</th><th>عدد الخطوط</th>
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
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr><td colSpan={8} className="text-center text-gray-400 py-8">لا توجد نتائج</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}