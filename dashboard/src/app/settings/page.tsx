// ============================================================================
// دروب (Droob) — Settings — API Integration
// ============================================================================

"use client";

import { useState, useCallback } from "react";
import { useSettings, useUpdateSettings } from "@/lib/hooks";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

export default function SettingsPage() {
  const { data: settings, loading, error, refetch } = useSettings();
  const { execute: updateSettings, loading: saving, error: saveErr } = useUpdateSettings();

  const [form, setForm] = useState({
    app_name: String(settings?.app_name || "دروب"),
    default_governorate: String(settings?.default_governorate || "عمان"),
    refresh_interval: Number(settings?.refresh_interval || 30),
    enable_notifications: Boolean(settings?.enable_notifications ?? true),
    enable_live_tracking: Boolean(settings?.enable_live_tracking ?? true),
    max_fare: Number(settings?.max_fare || 500),
    maintenance_mode: Boolean(settings?.maintenance_mode ?? false),
    api_key: String(settings?.api_key || ""),
  });

  const handleSave = async () => {
    try {
      await updateSettings(form);
      refetch();
      alert("تم حفظ الإعدادات بنجاح ✅");
    } catch {
      // hook handles error
    }
  };

  const updateField = (field: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="page-wrapper" dir="rtl">
      <div className="page-header">
        <div>
          <h1 className="page-title">الإعدادات</h1>
          <p className="page-subtitle">إعدادات النظام المتقدمة</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-outline" onClick={refetch} disabled={loading}>🔄 إعادة تعيين</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? "⏳ جاري الحفظ..." : "💾 حفظ الإعدادات"}
          </button>
        </div>
      </div>

      {(error || saveErr) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
          ⚠️ {error || saveErr}
          <button onClick={refetch} className="mr-3 underline text-red-800">إعادة المحاولة</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General */}
        <div className="card">
          <div className="p-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">⚙️ عام</h3></div>
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">اسم التطبيق</label>
              {loading ? <Skeleton className="h-10 w-full" /> : (
                <input className="form-input w-full" value={form.app_name} onChange={(e) => updateField("app_name", e.target.value)} />
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">المحافظة الافتراضية</label>
              {loading ? <Skeleton className="h-10 w-full" /> : (
                <select className="form-select w-full" value={form.default_governorate} onChange={(e) => updateField("default_governorate", e.target.value)}>
                  {["عمان","الزرقاء","إربد","البلقاء","الكرك","معان","الطفيلة","مأدبا","جرش","عجلون","العقبة","المفرق"].map((g) => (<option key={g} value={g}>{g}</option>))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">فترة تحديث البيانات (ثانية)</label>
              {loading ? <Skeleton className="h-10 w-full" /> : (
                <input className="form-input w-full" type="number" min={5} max={300} value={form.refresh_interval} onChange={(e) => updateField("refresh_interval", Number(e.target.value))} />
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">أقصى تعرفة مسموحة (قرش)</label>
              {loading ? <Skeleton className="h-10 w-full" /> : (
                <input className="form-input w-full" type="number" min={0} value={form.max_fare} onChange={(e) => updateField("max_fare", Number(e.target.value))} />
              )}
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="card">
          <div className="p-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">🔧 ميزات</h3></div>
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-700">تفعيل الإشعارات</div>
                <div className="text-xs text-gray-400">إرسال تنبيهات للمستخدمين</div>
              </div>
              {loading ? <Skeleton className="h-6 w-12" /> : (
                <button onClick={() => updateField("enable_notifications", !form.enable_notifications)} className={`toggle-switch w-12 h-6 rounded-full transition ${form.enable_notifications ? "bg-[#2E7D32]" : "bg-gray-300"}`}>
                  <div className={`toggle-dot w-5 h-5 rounded-full bg-white shadow transition ${form.enable_notifications ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-700">تتبع مباشر</div>
                <div className="text-xs text-gray-400">تتبع المركبات على الخريطة</div>
              </div>
              {loading ? <Skeleton className="h-6 w-12" /> : (
                <button onClick={() => updateField("enable_live_tracking", !form.enable_live_tracking)} className={`toggle-switch w-12 h-6 rounded-full transition ${form.enable_live_tracking ? "bg-[#2E7D32]" : "bg-gray-300"}`}>
                  <div className={`toggle-dot w-5 h-5 rounded-full bg-white shadow transition ${form.enable_live_tracking ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-700">وضع الصيانة</div>
                <div className="text-xs text-gray-400">إيقاف الخدمة مؤقتاً للمستخدمين</div>
              </div>
              {loading ? <Skeleton className="h-6 w-12" /> : (
                <button onClick={() => updateField("maintenance_mode", !form.maintenance_mode)} className={`toggle-switch w-12 h-6 rounded-full transition ${form.maintenance_mode ? "bg-[#DC2626]" : "bg-gray-300"}`}>
                  <div className={`toggle-dot w-5 h-5 rounded-full bg-white shadow transition ${form.maintenance_mode ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* API */}
        <div className="card lg:col-span-2">
          <div className="p-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">🔑 مفتاح API</h3></div>
          <div className="p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">API Key</label>
            {loading ? <Skeleton className="h-10 w-full" /> : (
              <div className="flex gap-3">
                <input className="form-input flex-1 font-mono" type="password" value={form.api_key} onChange={(e) => updateField("api_key", e.target.value)} placeholder="sk-..." />
                <button className="btn-outline text-sm" onClick={() => navigator.clipboard.writeText(form.api_key)}>📋 نسخ</button>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">يستخدم لتوثيق طلبات API الخارجية</p>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card lg:col-span-2 border-[#DC2626]/20">
          <div className="p-4 border-b border-[#DC2626]/10 bg-red-50/50"><h3 className="font-bold text-[#DC2626]">⚠️ منطقة الخطر</h3></div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-700">مسح ذاكرة التخزين المؤقت</div>
                <div className="text-xs text-gray-400">مسح جميع البيانات المخزنة مؤقتاً</div>
              </div>
              <button className="btn-outline border-[#DC2626] text-[#DC2626] hover:bg-red-50 text-sm">مسح الكاش</button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-700">إعادة تعيين النظام</div>
                <div className="text-xs text-gray-400">إعادة النظام إلى الإعدادات الافتراضية</div>
              </div>
              <button className="btn-primary bg-[#DC2626] hover:bg-[#B91C1C] text-sm">إعادة تعيين</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}