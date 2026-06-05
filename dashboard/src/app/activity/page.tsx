// ============================================================================
// دروب (Droob) — Activity Log Viewer Page
// Shows admin activity trail with user, action, entity type, and details
// ============================================================================

"use client";

import React, { useState, useEffect } from "react";
import DashboardShell from "@/components/DashboardShell";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ActivityUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ActivityItem {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: ActivityUser | null;
}

interface ActivityResponse {
  success: boolean;
  data: {
    data: ActivityItem[];
    total: number;
    limit: number;
    offset: number;
  };
}

// ─── Action Badge Config ──────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, { label: string; color: string }> = {
  create: { label: "إنشاء", color: "bg-brand-green/10 text-brand-green" },
  update: { label: "تحديث", color: "bg-brand-blue/10 text-brand-blue" },
  delete: { label: "حذف", color: "bg-cancelled/10 text-cancelled" },
  import: { label: "استيراد", color: "bg-delayed/10 text-delayed" },
  export: { label: "تصدير", color: "bg-purple-500/10 text-purple-400" },
};

const ENTITY_LABELS: Record<string, string> = {
  route: "خط",
  stop: "محطة",
  vehicle: "مركبة",
  alert: "تنبيه",
  schedule: "جدول",
  fare: "تسعيرة",
  prayer_time: "مواقيت الصلاة",
  user: "مستخدم",
};

// ─── Icons ─────────────────────────────────────────────────────────────────

const ActivityIcon: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
  </svg>
);

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (entityFilter) params.set("entityType", entityFilter);
      if (actionFilter) params.set("action", actionFilter);

      const token = localStorage.getItem("accessToken");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"}/activity?${params}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (!res.ok) throw new Error("فشل في تحميل سجل النشاطات");
      const json: ActivityResponse = await res.json();
      setActivities(json.data.data);
      setTotal(json.data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [entityFilter, actionFilter, offset]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <DashboardShell
      headerProps={{
        title: "سجل النشاطات",
      }}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center">
            <ActivityIcon />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">سجل النشاطات</h1>
            <p className="text-sm text-muted mt-0.5">
              تتبع جميع الإجراءات التي قام بها المشرفون في النظام
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">نوع الكيان</label>
            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setOffset(0); }}
              className="h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue transition-all"
            >
              <option value="">الكل</option>
              {Object.entries(ENTITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">نوع الإجراء</label>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setOffset(0); }}
              className="h-10 px-3 rounded-input bg-surface-2 border border-gray-800 text-sm text-primary focus:outline-none focus:border-brand-blue transition-all"
            >
              <option value="">الكل</option>
              {Object.entries(ACTION_CONFIG).map(([value, config]) => (
                <option key={value} value={value}>{config.label}</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-muted pt-6">
            إجمالي: {total.toLocaleString("ar-JO")}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="p-4 rounded-card bg-cancelled/10 border border-cancelled/20 text-cancelled text-sm">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12 text-muted text-sm">جاري التحميل...</div>
        )}

        {/* Activity table */}
        {!loading && !error && (
          <>
            <div className="bg-surface rounded-card border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 bg-surface-2">
                      <th className="text-right px-4 py-3 text-xs font-medium text-secondary">الوقت</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-secondary">المستخدم</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-secondary">الإجراء</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-secondary">الكيان</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-secondary">التفاصيل</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-secondary">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted">
                          لا توجد نشاطات مسجلة
                        </td>
                      </tr>
                    ) : (
                      activities.map((item) => {
                        const actionCfg = ACTION_CONFIG[item.action] || { label: item.action, color: "bg-surface-2 text-secondary" };
                        const entityLabel = ENTITY_LABELS[item.entityType] || item.entityType;
                        return (
                          <tr key={item.id} className="border-b border-gray-800/50 hover:bg-surface-2/50 transition-colors">
                            <td className="px-4 py-3 text-xs text-muted whitespace-nowrap dir-ltr">
                              {new Date(item.createdAt).toLocaleString("ar-JO")}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="text-sm text-primary">{item.user?.name || "غير معروف"}</span>
                                <span className="text-[10px] text-muted">{item.user?.role || ""}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-pill ${actionCfg.color}`}>
                                {actionCfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-primary">{entityLabel}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-secondary max-w-[200px] truncate">
                              {item.details ? JSON.stringify(item.details) : "-"}
                            </td>
                            <td className="px-4 py-3 text-[10px] text-muted font-mono">
                              {item.ipAddress || "-"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-4 py-2 rounded-input bg-surface-2 border border-gray-800 text-sm text-secondary hover:bg-surface-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  السابق
                </button>
                <span className="text-sm text-muted">
                  صفحة {currentPage} من {totalPages}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="px-4 py-2 rounded-input bg-surface-2 border border-gray-800 text-sm text-secondary hover:bg-surface-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
