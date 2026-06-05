// ============================================================================
// دروب (Droob) — Community Corrections Review Interface
// Review community-submitted data corrections with Approve/Reject workflow
// ============================================================================

"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import { useToast } from "@/components/Toaster";
import { useReports, useResolveReport } from "@/lib/hooks";
import type { ReportItem } from "@/lib/api";

// ─── Icons ─────────────────────────────────────────────────────────────────

const CheckIcon: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12" />
  </svg>
);

const XIcon: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const RefreshIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23,4 23,10 17,10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const FlagIcon: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

const EmptyIcon: React.FC = () => (
  <svg className="w-24 h-24 text-muted/30" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M70 20H30a5 5 0 0 0-5 5v50a5 5 0 0 0 5 5h40a5 5 0 0 0 5-5V25a5 5 0 0 0-5-5z" />
    <line x1="40" y1="35" x2="60" y2="35" strokeWidth="2" />
    <line x1="40" y1="45" x2="60" y2="45" strokeWidth="2" />
    <line x1="40" y1="55" x2="50" y2="55" strokeWidth="2" />
    <path d="M35 70l-8 8 8-8" />
    <path d="M27 78l8-8-8 8" />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────

function DiffView({ label, original, proposed }: { label: string; original: string; proposed: string }) {
  const changed = original !== proposed;
  return (
    <div className={`p-3 rounded-card ${changed ? "bg-brand-blue/5 border border-brand-blue/20" : "bg-surface-2"}`}>
      <div className="text-xs font-medium text-secondary mb-2">{label}</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] text-muted mb-1">القيمة الحالية</div>
          <div className={`text-sm font-mono ${changed ? "text-critical line-through" : "text-primary"}`}>
            {original || "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted mb-1">القيمة المقترحة</div>
          <div className={`text-sm font-mono font-bold ${changed ? "text-brand-green" : "text-primary"}`}>
            {proposed || "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const { toast } = useToast();
  const { data: reportsData, loading, error, refetch } = useReports();
  const { execute: resolveReport, loading: resolving } = useResolveReport();

  const [filter, setFilter] = useState<"all" | "pending" | "resolved" | "rejected">("pending");
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "approve" | "reject" } | null>(null);

  const reports: ReportItem[] = useMemo(() => {
    const data = reportsData || [];
    if (filter === "all") return data;
    return data.filter((r) => r.status === filter);
  }, [reportsData, filter]);

  const pendingCount = useMemo(() => (reportsData || []).filter((r) => r.status === "pending").length, [reportsData]);

  const handleAction = useCallback(
    async (id: string, action: "approve" | "reject") => {
      try {
        await resolveReport(id, action);
        toast(
          action === "approve"
            ? "تم اعتماد التصحيح وإضافة التعديلات إلى النظام"
            : "تم رفض التصحيح المقترح",
          "success"
        );
        setConfirmAction(null);
        refetch();
      } catch {
        toast("فشلت العملية — يرجى المحاولة مرة أخرى", "error");
      }
    },
    [resolveReport, refetch, toast]
  );

  const headerProps = {
    title: "مراجعة تصحيحات المجتمع",
    breadcrumb: [
      { label: "الرئيسية", href: "/" },
      { label: "مراجعة التصحيحات" },
    ],
    actions: (
      <div className="flex items-center gap-3">
        {error && (
          <button
            onClick={refetch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-input bg-critical/10 text-critical text-xs font-medium hover:bg-critical/20 transition-colors"
          >
            <RefreshIcon />
            إعادة المحاولة
          </button>
        )}
        <span className="text-xs text-muted">
          {loading ? "جاري التحميل..." : `${pendingCount} معلقة`}
        </span>
      </div>
    ),
  };

  return (
    <DashboardShell headerProps={headerProps}>
      <div className="space-y-6">
        {/* Filter tabs */}
        <div className="flex items-center gap-2 p-1 rounded-card bg-surface border border-gray-800 w-fit">
          {[
            { value: "pending" as const, label: "معلقة", count: pendingCount },
            { value: "resolved" as const, label: "تم الاعتماد" },
            { value: "rejected" as const, label: "مرفوضة" },
            { value: "all" as const, label: "الكل" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-1.5 rounded-pill text-xs font-medium transition-all ${
                filter === tab.value
                  ? "bg-brand-blue text-white shadow-sm"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {tab.label}
              {"count" in tab && tab.count !== undefined && ` (${tab.count})`}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center justify-between p-4 rounded-card bg-critical/5 border border-cancelled/20 text-sm text-critical">
            <span>⚠️ {error}</span>
            <button onClick={refetch} className="underline text-xs">إعادة المحاولة</button>
          </div>
        )}

        {/* Reports list */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-6 rounded-card bg-surface border border-gray-800 animate-pulse">
                <div className="h-5 bg-surface-3 rounded w-48 mb-4" />
                <div className="h-4 bg-surface-3 rounded w-full mb-2" />
                <div className="h-4 bg-surface-3 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="empty-state">
            <EmptyIcon />
            <p className="text-sm text-secondary mt-4">
              {filter === "pending"
                ? "لا توجد تصحيحات معلقة للمراجعة"
                : "لا توجد تصحيحات في هذه الفئة"}
            </p>
            {filter !== "pending" && (
              <button
                onClick={() => setFilter("pending")}
                className="mt-3 text-xs text-brand-blue hover:underline"
              >
                عرض التصحيحات المعلقة
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-card bg-surface border border-gray-800 shadow-sm"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-input bg-delayed/10 flex items-center justify-center">
                      <FlagIcon />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-primary">{report.type || "تصحيح بيانات"}</h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-semibold ${
                            report.status === "pending"
                              ? "bg-delayed/15 text-delayed"
                              : report.status === "resolved"
                                ? "bg-brand-green/15 text-brand-green"
                                : "bg-critical/10 text-critical"
                          }`}
                        >
                          {report.status === "pending" ? "معلق" : report.status === "resolved" ? "تم الاعتماد" : "مرفوض"}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted mt-0.5">
                        #{report.id} · {report.created_at}
                        {report.submitted_by ? ` · بواسطة ${report.submitted_by}` : ""}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Diff fields */}
                <div className="space-y-2">
                  {Object.entries(report.proposed_data || {}).map(([key, proposedVal]) => {
                    const originalVal = (report.original_data || {})[key];
                    return (
                      <DiffView
                        key={key}
                        label={key}
                        original={String(originalVal ?? "")}
                        proposed={String(proposedVal ?? "")}
                      />
                    );
                  })}
                </div>

                {/* Actions (only for pending) */}
                {report.status === "pending" && (
                  <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-800">
                    <button
                      onClick={() => setConfirmAction({ id: report.id, action: "approve" })}
                      disabled={resolving}
                      className="flex items-center gap-2 px-4 py-2 rounded-input bg-brand-green text-white text-sm font-bold hover:bg-brand-green/90 disabled:opacity-50 transition-colors"
                    >
                      <CheckIcon />
                      اعتماد التصحيح
                    </button>
                    <button
                      onClick={() => setConfirmAction({ id: report.id, action: "reject" })}
                      disabled={resolving}
                      className="flex items-center gap-2 px-4 py-2 rounded-input bg-critical/10 text-critical text-sm font-medium hover:bg-critical/20 disabled:opacity-50 transition-colors"
                    >
                      <XIcon />
                      رفض
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Footer */}
        {!loading && reports.length > 0 && (
          <div className="flex items-center justify-between text-xs text-muted">
            <span>إجمالي التقارير: {(reportsData || []).length}</span>
            <button
              onClick={refetch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-input bg-surface border border-gray-800 text-secondary hover:text-primary hover:bg-surface-2 transition-colors"
            >
              <RefreshIcon />
              تحديث
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CONFIRM ACTION DIALOG                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmAction(null)}
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
                <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${
                  confirmAction.action === "approve" ? "bg-brand-green/10" : "bg-critical/10"
                }`}>
                  {confirmAction.action === "approve" ? (
                    <CheckIcon />
                  ) : (
                    <XIcon />
                  )}
                </div>
                <h3 className="text-lg font-bold text-primary mb-2">
                  {confirmAction.action === "approve" ? "اعتماد التصحيح" : "رفض التصحيح"}
                </h3>
                <p className="text-sm text-secondary mb-6">
                  {confirmAction.action === "approve"
                    ? "سيتم تطبيق التعديلات المقترحة على النظام. هل أنت متأكد؟"
                    : "سيتم رفض التعديلات المقترحة. هل أنت متأكد؟"}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => handleAction(confirmAction.id, confirmAction.action)}
                    disabled={resolving}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-input text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                      confirmAction.action === "approve"
                        ? "bg-brand-green hover:bg-brand-green/90"
                        : "bg-cancelled hover:bg-critical/90"
                    }`}
                  >
                    {resolving ? "جاري المعالجة..." : confirmAction.action === "approve" ? "نعم، اعتماد" : "نعم، رفض"}
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="px-5 py-2.5 rounded-input bg-surface-2 border border-gray-800 text-secondary text-sm font-medium hover:bg-surface-3 transition-colors"
                  >
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