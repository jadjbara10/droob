// ============================================================================
// دروب (Droob) — Reports Center — API Integration
// ============================================================================

"use client";

import { useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { downloadReport } from "@/lib/api";

type Tab = "overview" | "trips" | "finance" | "performance";

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("overview");

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "نظرة عامة" },
    { key: "trips", label: "الرحلات" },
    { key: "finance", label: "المالية" },
    { key: "performance", label: "الأداء" },
  ];

  const [exportLoading, setExportLoading] = useState<"pdf" | "excel" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async (format: "pdf" | "excel") => {
    setExportLoading(format);
    setExportError(null);
    try {
      const blob = await downloadReport(tab, format === "excel" ? "excel" : "pdf");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `droob-report-${tab}.${format === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "فشل تصدير التقرير";
      setExportError(msg);
    } finally {
      setExportLoading(null);
    }
  };

  return (
    <div className="page-wrapper" dir="rtl">
      <div className="page-header">
        <div>
          <h1 className="page-title">التقارير</h1>
          <p className="page-subtitle">تقارير دورية عن أداء المنظومة</p>
        </div>
        <div className="flex gap-3">
          {exportError && <span className="text-sm text-red-600 self-center">{exportError}</span>}
          <button className="btn-primary" onClick={() => handleExport("pdf")} disabled={exportLoading !== null}>
            {exportLoading === "pdf" ? "جاري التصدير..." : "🖨️ تصدير PDF"}
          </button>
          <button className="btn-outline" onClick={() => handleExport("excel")} disabled={exportLoading !== null}>
            {exportLoading === "excel" ? "جاري التصدير..." : "📊 تصدير Excel"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-8 p-1.5 bg-gray-100 rounded-xl">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition ${
              tab === t.key ? "bg-white shadow text-[#1A4F8A]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <>
          <div className="dashboard-grid mb-8">
            <div className="kpi-card"><div className="text-xs text-gray-400 mb-1">إجمالي الرحلات</div><div className="kpi-value">12,845</div><div className="kpi-trend-up">↑ 12% عن الشهر الماضي</div></div>
            <div className="kpi-card"><div className="text-xs text-gray-400 mb-1">المستخدمون النشطون</div><div className="kpi-value">4,210</div><div className="kpi-trend-up">↑ 8% عن الشهر الماضي</div></div>
            <div className="kpi-card"><div className="text-xs text-gray-400 mb-1">نسبة الالتزام</div><div className="kpi-value">92<span className="text-lg font-normal">%</span></div><div className="kpi-label">المواعيد</div></div>
            <div className="kpi-card"><div className="text-xs text-gray-400 mb-1">متوسط التقييم</div><div className="kpi-value">4.6<span className="text-lg font-normal">/5</span></div><div className="kpi-trend-up">⭐ مستخدم</div></div>
          </div>
          <div className="card p-6">
            <h3 className="font-bold text-gray-900 mb-4">توزيع الرحلات حسب المحافظة</h3>
            <div className="space-y-3">
              {[{ gov: "عمان", pct: 62, clr: "#1A4F8A" },{ gov: "الزرقاء", pct: 18, clr: "#2E7D32" },{ gov: "إربد", pct: 14, clr: "#FF8C00" },{ gov: "أخرى", pct: 6, clr: "#9CA3AF" }].map((g) => (
                <div key={g.gov} className="flex items-center gap-3">
                  <span className="w-20 text-sm font-semibold">{g.gov}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${g.pct}%`, background: g.clr }} /></div>
                  <span className="w-12 text-sm text-gray-500 text-left">{g.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Trips Tab */}
      {tab === "trips" && (
        <div className="card">
          <div className="p-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">نشاط الرحلات الأسبوعي</h3></div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={[{day:"السبت",trips:420},{day:"الأحد",trips:580},{day:"الإثنين",trips:550},{day:"الثلاثاء",trips:610},{day:"الأربعاء",trips:590},{day:"الخميس",trips:530},{day:"الجمعة",trips:310}]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="trips" fill="#1A4F8A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Finance Tab */}
      {tab === "finance" && (
        <div className="card">
          <div className="p-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">الإيرادات الشهرية</h3></div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={[{m:"يناير",rev:12500},{m:"فبراير",rev:13200},{m:"مارس",rev:14100},{m:"أبريل",rev:13800},{m:"مايو",rev:15200},{m:"يونيو",rev:16000}]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="m" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="rev" stroke="#2E7D32" strokeWidth={3} dot={{ r: 5 }} name="الإيرادات (دينار)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {tab === "performance" && (
        <div className="card">
          <div className="p-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">مؤشرات الأداء</h3></div>
          <div className="p-6 grid grid-cols-2 gap-6">
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <div className="text-6xl font-black text-[#1A4F8A] mb-2">92%</div>
              <div className="text-sm text-gray-500">نسبة الالتزام بالمواعيد</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <div className="text-6xl font-black text-[#2E7D32] mb-2">85%</div>
              <div className="text-sm text-gray-500">نسبة إشغال المقاعد</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <div className="text-6xl font-black text-[#FF8C00] mb-2">4.6</div>
              <div className="text-sm text-gray-500">متوسط تقييم الركاب</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <div className="text-6xl font-black text-[#E60026] mb-2">0.3%</div>
              <div className="text-sm text-gray-500">نسبة الشكاوى</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}