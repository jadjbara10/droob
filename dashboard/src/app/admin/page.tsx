// ============================================================================
// دروب (Droob) — Beta Invite Code Management
// Uses localStorage for demo; backend routes TBD.
// TODO: Replace localStorage with real API calls to /admin/invite-codes
// when backend routes are implemented.
// ============================================================================

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import { useToast } from "@/components/Toaster";

// ─── Types ─────────────────────────────────────────────────────────────────

interface InviteCode {
  code: string;
  status: "active" | "used" | "revoked";
  created_at: string;
  used_by?: string;
}

// ─── Icons ─────────────────────────────────────────────────────────────────

const CopyIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const PlusIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const RefreshIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23,4 23,10 17,10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12" />
  </svg>
);

const XIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── localStorage Helpers ─────────────────────────────────────────────────

const STORAGE_KEY = "droob_beta_invites";

function loadInvites(): InviteCode[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveInvites(invites: InviteCode[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invites));
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "DROOB-";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3) code += "-";
  }
  return code;
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function BetaInvitePage() {
  const { toast } = useToast();
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    try {
      const data = loadInvites();
      setInvites(data);
    } catch {
      toast("فشل تحميل رموز الدعوة", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 400));

    const newInvite: InviteCode = {
      code: generateCode(),
      status: "active",
      created_at: new Date().toISOString().split("T")[0],
    };

    const updated = [newInvite, ...invites];
    setInvites(updated);
    saveInvites(updated);
    setGenerating(false);
    toast("تم إنشاء رمز دعوة جديد", "success");

    // TODO: When backend is ready, call generateInviteCode() from lib/api.ts
    // and add the returned code to the list.
  }, [invites, toast]);

  const handleRevoke = useCallback((code: string) => {
    const updated = invites.map((inv) =>
      inv.code === code ? { ...inv, status: "revoked" as const } : inv
    );
    setInvites(updated);
    saveInvites(updated);
    toast("تم إلغاء رمز الدعوة", "success");

    // TODO: When backend is ready, call revokeInviteCode(code) from lib/api.ts
  }, [invites, toast]);

  const handleCopy = useCallback(
    async (code: string, index: number) => {
      try {
        await navigator.clipboard.writeText(code);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
        toast("تم نسخ الرمز", "success");
      } catch {
        toast("فشل النسخ", "warning");
      }
    },
    [toast]
  );

  // Stats
  const activeCount = invites.filter((i) => i.status === "active").length;
  const usedCount = invites.filter((i) => i.status === "used").length;
  const revokedCount = invites.filter((i) => i.status === "revoked").length;

  const headerProps = {
    title: "إدارة رموز الدعوة",
    breadcrumb: [
      { label: "الرئيسية", href: "/" },
      { label: "رموز الدعوة" },
    ],
    actions: (
      <div className="flex items-center gap-3">
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-input bg-surface-2 border border-gray-800 text-xs text-secondary font-medium hover:bg-surface-3 transition-colors"
        >
          <RefreshIcon />
          تحديث
        </button>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 rounded-input bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
              </svg>
              جاري الإنشاء...
            </>
          ) : (
            <>
              <PlusIcon />
              إنشاء رمز جديد
            </>
          )}
        </button>
      </div>
    ),
  };

  return (
    <DashboardShell headerProps={headerProps}>
      <div className="space-y-6">
        {/* Info banner */}
        <div className="p-4 rounded-card bg-brand-blue/5 border border-brand-blue/20 text-sm text-secondary">
          <p className="font-medium text-brand-blue mb-1">نظام الدعوات التجريبي</p>
          <p className="text-xs text-muted">
            يتم تخزين رموز الدعوة محلياً (localStorage) في الوقت الحالي.
            {/* TODO: Remove this banner when backend /admin/invite-codes is operational */}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-4 rounded-card bg-surface border border-gray-800">
            <div className="w-10 h-10 rounded-input bg-brand-green/10 flex items-center justify-center text-lg font-bold text-brand-green">
              {activeCount}
            </div>
            <div>
              <div className="text-xs font-medium text-secondary">نشط</div>
              <div className="text-xs font-semibold text-brand-green">
                {invites.length > 0 ? ((activeCount / invites.length) * 100).toFixed(0) : 0}%
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-card bg-surface border border-gray-800">
            <div className="w-10 h-10 rounded-input bg-brand-blue/10 flex items-center justify-center text-lg font-bold text-brand-blue">
              {usedCount}
            </div>
            <div>
              <div className="text-xs font-medium text-secondary">مستخدم</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-card bg-surface border border-gray-800">
            <div className="w-10 h-10 rounded-input bg-critical/10 flex items-center justify-center text-lg font-bold text-critical">
              {revokedCount}
            </div>
            <div>
              <div className="text-xs font-medium text-secondary">ملغي</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-card bg-surface border border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h3 className="font-bold text-primary text-sm">رموز الدعوة ({invites.length})</h3>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted">جاري التحميل...</div>
            ) : invites.length === 0 ? (
              <div className="empty-state">
                <svg className="w-16 h-16 text-muted/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <p className="text-sm text-secondary mt-4">لا توجد رموز دعوة بعد</p>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="mt-3 flex items-center gap-2 px-4 py-2 rounded-input bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue/90 disabled:opacity-50 transition-colors"
                >
                  <PlusIcon />
                  إنشاء أول رمز
                </button>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الرمز</th>
                    <th>الحالة</th>
                    <th>تاريخ الإنشاء</th>
                    <th>المستخدم</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((inv, idx) => (
                    <tr key={inv.code}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-primary tracking-wider direction-ltr" style={{ direction: "ltr" }}>
                            {inv.code}
                          </span>
                          <button
                            onClick={() => handleCopy(inv.code, idx)}
                            className={`p-1 rounded transition-colors ${
                              copiedIndex === idx
                                ? "text-brand-green"
                                : "text-muted hover:text-primary"
                            }`}
                            title="نسخ الرمز"
                          >
                            {copiedIndex === idx ? <CheckIcon /> : <CopyIcon />}
                          </button>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill text-xs font-semibold ${
                            inv.status === "active"
                              ? "bg-brand-green/15 text-brand-green"
                              : inv.status === "used"
                                ? "bg-brand-blue/15 text-brand-blue"
                                : "bg-critical/10 text-critical"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            inv.status === "active"
                              ? "bg-brand-green"
                              : inv.status === "used"
                                ? "bg-brand-blue"
                                : "bg-critical"
                          }`} />
                          {inv.status === "active" ? "نشط" : inv.status === "used" ? "مستخدم" : "ملغي"}
                        </span>
                      </td>
                      <td className="text-sm text-secondary tabular-nums">{inv.created_at}</td>
                      <td className="text-sm text-secondary">{inv.used_by || "—"}</td>
                      <td>
                        {inv.status === "active" && (
                          <button
                            onClick={() => handleRevoke(inv.code)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-input bg-critical/10 text-critical text-xs font-medium hover:bg-critical/20 transition-colors"
                          >
                            <XIcon />
                            إلغاء
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        {!loading && invites.length > 0 && (
          <div className="flex items-center justify-between text-xs text-muted">
            <span>إجمالي الرموز: {invites.length}</span>
            <span>
              {activeCount} نشط · {usedCount} مستخدم · {revokedCount} ملغي
            </span>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}