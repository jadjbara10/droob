// ============================================================================
// دروب (Droob) — Users Management Page
// Full CRUD for admin users | Role badges | Filter + search | Modal forms
// ============================================================================

"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "@/lib/hooks";
import { useToast } from "@/components/Toaster";
import type { UserItem } from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────

const ROLES = [
  { value: "super_admin", label: "مدير النظام" },
  { value: "operator", label: "مشغل" },
  { value: "editor", label: "محرر" },
  { value: "viewer", label: "مشاهد" },
] as const;

const GOVERNORATES = [
  "عمان",
  "الزرقاء",
  "إربد",
  "البلقاء",
  "الكرك",
  "معان",
  "الطفيلة",
  "مأدبا",
  "جرش",
  "عجلون",
  "العقبة",
  "المفرق",
];

const ROLE_BADGE: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  super_admin: { bg: "bg-cancelled/15", text: "text-cancelled", label: "مدير النظام" },
  operator: { bg: "bg-brand-blue/15", text: "text-brand-blue", label: "مشغل" },
  editor: { bg: "bg-brand-green/15", text: "text-brand-green", label: "محرر" },
  viewer: { bg: "bg-text-tertiary/15", text: "text-text-tertiary", label: "مشاهد" },
};

const INITIAL_FORM = {
  name_ar: "",
  name_en: "",
  email: "",
  phone: "",
  role: "viewer",
  governorate: "عمان",
  status: "active",
};

// ─── Icons ─────────────────────────────────────────────────────────────────

const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const PlusIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

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
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const RefreshIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23,4 23,10 17,10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const SearchIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const EmptyUsersIcon: React.FC = () => (
  <svg className="w-24 h-24 text-text-tertiary/30" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M50 45a12 12 0 1 0 0-24 12 12 0 0 0 0 24z" />
    <path d="M20 80c0-16.56 13.44-30 30-30s30 13.44 30 30" />
    <path d="M10 30l15 15M25 30l-15 15" strokeWidth="3" opacity="0.2" />
    <line x1="75" y1="15" x2="90" y2="30" strokeWidth="3" opacity="0.2" />
    <line x1="75" y1="30" x2="90" y2="15" strokeWidth="3" opacity="0.2" />
  </svg>
);

// ─── Sub-components ───────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_BADGE[role] || ROLE_BADGE.viewer;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill text-xs font-semibold ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.bg.replace("/15", "")}`} />
      {cfg.label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i}>
          <div
            className="skeleton h-4"
            style={{ width: i === 3 ? "64px" : `${Math.random() * 80 + 60}px` }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { data: usersData, loading, error, refetch } = useUsers();
  const {
    execute: createUser,
    loading: creating,
    error: createErr,
  } = useCreateUser();
  const {
    execute: updateUser,
    loading: updating,
    error: updateErr,
  } = useUpdateUser();
  const {
    execute: deleteUser,
    loading: deleting,
    error: deleteErr,
  } = useDeleteUser();
  const { toast } = useToast();

  const users = usersData || [];

  // ── Filter State ──────────────────────────────────────────────────────

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [govFilter, setGovFilter] = useState("all");

  // ── Modal State ───────────────────────────────────────────────────────

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });

  // ── Delete State ──────────────────────────────────────────────────────

  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);

  // ── Derived Data ──────────────────────────────────────────────────────

  const roleStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of ROLES) counts[r.value] = 0;
    for (const u of users) counts[u.role] = (counts[u.role] || 0) + 1;
    return ROLES.map((r) => ({
      ...ROLE_BADGE[r.value],
      value: r.value,
      count: counts[r.value] || 0,
    }));
  }, [users]);

  const filteredUsers = useMemo(() => {
    let result = [...users];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.name_ar.includes(search) ||
          u.name_en.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.phone.includes(search)
      );
    }
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }
    if (govFilter !== "all") {
      result = result.filter((u) => u.governorate === govFilter);
    }
    return result;
  }, [users, search, roleFilter, govFilter]);

  const saving = creating || updating;

  // ── Handlers ──────────────────────────────────────────────────────────

  const openAddModal = useCallback(() => {
    setEditingId(null);
    setForm({ ...INITIAL_FORM });
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((user: UserItem) => {
    setEditingId(user.id);
    setForm({
      name_ar: user.name_ar,
      name_en: user.name_en,
      email: user.email,
      phone: user.phone,
      role: user.role,
      governorate: user.governorate,
      status: user.status,
    });
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
    setForm({ ...INITIAL_FORM });
  }, []);

  const updateField = useCallback(
    (field: string, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!form.name_ar.trim() || !form.email.trim()) {
      toast("يرجى ملء الحقول المطلوبة", "warning");
      return;
    }

    try {
      const payload: Partial<UserItem> = {
        name_ar: form.name_ar,
        name_en: form.name_en,
        email: form.email,
        phone: form.phone,
        role: form.role as UserItem["role"],
        governorate: form.governorate,
        status: form.status as UserItem["status"],
      };
      if (editingId) {
        await updateUser(editingId, payload);
        toast("تم تحديث المستخدم بنجاح", "success");
      } else {
        await createUser(payload);
        toast("تم إضافة المستخدم بنجاح", "success");
      }
      closeModal();
      refetch();
    } catch {
      toast(createErr || updateErr || "فشلت العملية", "error");
    }
  }, [
    form,
    editingId,
    updateUser,
    createUser,
    closeModal,
    refetch,
    toast,
    createErr,
    updateErr,
  ]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id);
      toast("تم حذف المستخدم بنجاح", "success");
      setDeleteTarget(null);
      refetch();
    } catch {
      toast(deleteErr || "فشل حذف المستخدم", "error");
    }
  }, [deleteTarget, deleteUser, refetch, toast, deleteErr]);

  const savingDisabled =
    saving || !form.name_ar.trim() || !form.email.trim();

  // ── Render ────────────────────────────────────────────────────────────

  const headerProps = {
    title: "إدارة المستخدمين",
    actions: (
      <button
        onClick={openAddModal}
        className="flex items-center gap-2 px-4 py-2 rounded-input bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue/90 transition-colors"
      >
        <PlusIcon />
        إضافة مستخدم
      </button>
    ),
  };

  return (
    <DashboardShell headerProps={headerProps}>
      <div className="space-y-6">
        {/* ── Error Banner ──────────────────────────────────────────────── */}
        {(error || deleteErr) && (
          <div className="flex items-center justify-between p-4 rounded-card bg-cancelled/5 border border-cancelled/20 text-sm text-cancelled">
            <span>⚠️ {error || deleteErr}</span>
            <button
              onClick={refetch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-input bg-cancelled/10 text-cancelled text-xs font-medium hover:bg-cancelled/20 transition-colors"
            >
              <RefreshIcon />
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* ── Role Stats Bar ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {roleStats.map((stat) => (
            <div
              key={stat.value}
              className="flex items-center gap-3 p-4 rounded-card bg-surface border border-border"
            >
              <div
                className={`w-10 h-10 rounded-input flex items-center justify-center text-lg font-bold ${stat.bg} ${stat.text}`}
              >
                {stat.count}
              </div>
              <div>
                <div className="text-xs font-medium text-text-secondary">
                  {stat.label}
                </div>
                <div className={`text-xs font-semibold ${stat.text}`}>
                  {(
                    (stat.count / Math.max(users.length, 1)) *
                    100
                  ).toFixed(0)}
                  %
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters Bar ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-card bg-surface border border-border">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="بحث بالاسم أو البريد الإلكتروني..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pr-9 pl-3 rounded-input bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
            />
          </div>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 px-3 rounded-input bg-surface-2 border border-border text-sm text-text-primary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all cursor-pointer appearance-none"
            style={{
              backgroundImage:
                "url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')",
              backgroundPosition: "left 0.75rem center",
              backgroundRepeat: "no-repeat",
              paddingLeft: "2rem",
            }}
          >
            <option value="all">كل الأدوار</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {/* Governorate filter */}
          <select
            value={govFilter}
            onChange={(e) => setGovFilter(e.target.value)}
            className="h-9 px-3 rounded-input bg-surface-2 border border-border text-sm text-text-primary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all cursor-pointer appearance-none"
            style={{
              backgroundImage:
                "url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')",
              backgroundPosition: "left 0.75rem center",
              backgroundRepeat: "no-repeat",
              paddingLeft: "2rem",
            }}
          >
            <option value="all">كل المحافظات</option>
            {GOVERNORATES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Active count */}
          <div className="text-xs text-text-tertiary mr-auto">
            {loading
              ? "جاري التحميل..."
              : `${filteredUsers.length} من ${users.length} مستخدم`}
          </div>
        </div>

        {/* ── Content Area ────────────────────────────────────────────────── */}
        <div className="rounded-card bg-surface border border-border overflow-hidden">
          {/* Loading */}
          {loading && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>البريد</th>
                  <th>الهاتف</th>
                  <th>الدور</th>
                  <th>المحافظة</th>
                  <th>تاريخ التسجيل</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </tbody>
            </table>
          )}

          {/* Empty state */}
          {!loading && filteredUsers.length === 0 && (
            <div className="empty-state">
              <EmptyUsersIcon />
              <p className="text-sm text-text-secondary mt-4">
                {search || roleFilter !== "all" || govFilter !== "all"
                  ? "لا توجد نتائج تطابق البحث"
                  : "لا يوجد مستخدمين"}
              </p>
              {(search || roleFilter !== "all" || govFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setRoleFilter("all");
                    setGovFilter("all");
                  }}
                  className="mt-3 text-xs text-brand-blue hover:underline"
                >
                  إعادة تعيين الفلاتر
                </button>
              )}
            </div>
          )}

          {/* Table */}
          {!loading && filteredUsers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>البريد</th>
                    <th>الهاتف</th>
                    <th>الدور</th>
                    <th>المحافظة</th>
                    <th>تاريخ التسجيل</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredUsers.map((user) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-blue/15 flex items-center justify-center text-xs font-bold text-brand-blue flex-shrink-0">
                              {user.name_ar.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-text-primary truncate">
                                {user.name_ar}
                              </div>
                              <div className="text-xs text-text-tertiary truncate">
                                {user.name_en}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-sm text-text-primary font-mono text-xs">
                            {user.email}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm text-text-secondary" dir="ltr">
                            {user.phone}
                          </span>
                        </td>
                        <td>
                          <RoleBadge role={user.role} />
                        </td>
                        <td>
                          <span className="text-sm text-text-secondary">
                            {user.governorate}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs text-text-tertiary tabular-nums">
                            {user.created_at}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-1.5 rounded-input hover:bg-brand-blue/10 transition-colors text-text-secondary hover:text-brand-blue"
                              title="تعديل"
                            >
                              <EditIcon />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(user)}
                              className="p-1.5 rounded-input hover:bg-cancelled/10 transition-colors text-text-secondary hover:text-cancelled"
                              title="حذف"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer info ────────────────────────────────────────────────── */}
        {!loading && users.length > 0 && (
          <div className="flex items-center justify-between text-xs text-text-tertiary">
            <span>إجمالي المستخدمين: {users.length}</span>
            <button
              onClick={refetch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-input bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
            >
              <RefreshIcon />
              تحديث
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ADD / EDIT MODAL                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-full max-w-lg mx-4 bg-surface rounded-modal border border-border shadow-xl"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-input bg-brand-blue/10 flex items-center justify-center">
                    <UsersIcon className="w-5 h-5 text-brand-blue" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">
                      {editingId ? "تعديل مستخدم" : "إضافة مستخدم جديد"}
                    </h2>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {editingId
                        ? "تعديل بيانات المستخدم"
                        : "إنشاء حساب مستخدم جديد في النظام"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 rounded-input flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
                >
                  <CloseIcon />
                </button>
              </div>

              {/* Form */}
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  {/* Name (Arabic) */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      الاسم بالعربية <span className="text-cancelled">*</span>
                    </label>
                    <input
                      value={form.name_ar}
                      onChange={(e) => updateField("name_ar", e.target.value)}
                      placeholder="مثال: أحمد محمد"
                      className="w-full h-10 px-3 rounded-input bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
                    />
                  </div>

                  {/* Name (English) */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      الاسم بالإنجليزية
                    </label>
                    <input
                      value={form.name_en}
                      onChange={(e) => updateField("name_en", e.target.value)}
                      placeholder="e.g. Ahmad Mohammed"
                      style={{ direction: "ltr", textAlign: "left" }}
                      className="w-full h-10 px-3 rounded-input bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    البريد الإلكتروني <span className="text-cancelled">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="email@example.com"
                    style={{ direction: "ltr", textAlign: "left" }}
                    className="w-full h-10 px-3 rounded-input bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="0791234567"
                    style={{ direction: "ltr", textAlign: "left" }}
                    className="w-full h-10 px-3 rounded-input bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Role */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      الدور
                    </label>
                    <select
                      value={form.role}
                      onChange={(e) => updateField("role", e.target.value)}
                      className="w-full h-10 px-3 rounded-input bg-surface-2 border border-border text-sm text-text-primary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all cursor-pointer appearance-none"
                      style={{
                        backgroundImage:
                          "url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')",
                        backgroundPosition: "left 0.75rem center",
                        backgroundRepeat: "no-repeat",
                        paddingLeft: "2rem",
                      }}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Governorate */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      المحافظة
                    </label>
                    <select
                      value={form.governorate}
                      onChange={(e) => updateField("governorate", e.target.value)}
                      className="w-full h-10 px-3 rounded-input bg-surface-2 border border-border text-sm text-text-primary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all cursor-pointer appearance-none"
                      style={{
                        backgroundImage:
                          "url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')",
                        backgroundPosition: "left 0.75rem center",
                        backgroundRepeat: "no-repeat",
                        paddingLeft: "2rem",
                      }}
                    >
                      {GOVERNORATES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-start gap-3 p-6 pt-0 border-t border-border">
                <button
                  onClick={handleSave}
                  disabled={savingDisabled}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-input bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                        <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
                      </svg>
                      جاري الحفظ...
                    </>
                  ) : editingId ? (
                    "حفظ التعديلات"
                  ) : (
                    "إضافة المستخدم"
                  )}
                </button>
                <button
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-input bg-surface-2 border border-border text-text-secondary text-sm font-medium hover:bg-surface-3 transition-colors"
                >
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
              className="w-full max-w-sm mx-4 bg-surface rounded-modal border border-border shadow-xl p-6"
              dir="rtl"
            >
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-cancelled/10 flex items-center justify-center mx-auto mb-4">
                  <TrashIcon />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">
                  تأكيد الحذف
                </h3>
                <p className="text-sm text-text-secondary mb-6">
                  هل أنت متأكد من حذف المستخدم{" "}
                  <span className="font-semibold text-text-primary">
                    {deleteTarget.name_ar}
                  </span>
                  ؟
                </p>
                <p className="text-xs text-text-tertiary mb-6 -mt-4">
                  لا يمكن التراجع عن هذا الإجراء
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-input bg-cancelled text-white text-sm font-bold hover:bg-cancelled/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {deleting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                          <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
                        </svg>
                        جاري الحذف...
                      </>
                    ) : (
                      "نعم، احذف المستخدم"
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="px-5 py-2.5 rounded-input bg-surface-2 border border-border text-text-secondary text-sm font-medium hover:bg-surface-3 transition-colors"
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
