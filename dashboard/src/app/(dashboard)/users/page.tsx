"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   دروب Droob — Users Management Page (super_admin only)
   List · Create · Edit role · Reset password · Delete · Activity log
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from "react";
import { Plus, RefreshCw, Search, Trash2, Edit3, Key, X, Activity, Eye } from "lucide-react";
import { InlineError, EmptyState } from "@/components/error-boundary";
import { TableSkeleton } from "@/components/skeleton";
import { Panel } from "@/components/panel";
import { usersAdminApi, adminExtendedApi, type AdminUserRecord, type ActivityRecord } from "@/lib/api";
import { formatDateTime, formatRelativeTime, roleLabels, entityTypeLabels, actionLabels } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const ALL_ROLES = ["super_admin", "admin", "editor", "operator", "viewer", "driver", "passenger"];

type ModalMode = null | "create" | "edit" | "password" | "activity";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("viewer");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formError, setFormError] = useState("");

  // Activity log state
  const [userActivities, setUserActivities] = useState<ActivityRecord[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    setError(false);
    try {
      const params: any = { limit: 200 };
      if (search.trim()) params.q = search;
      if (roleFilter !== "all") params.role = roleFilter;
      const res = await usersAdminApi.list(params);
      setUsers(res.data);
      setTotal(res.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, [search, roleFilter]);

  function openModal(mode: ModalMode, user?: AdminUserRecord) {
    setFormError("");
    setSelectedUser(user || null);
    setModalMode(mode);
    if (mode === "create") {
      setFormEmail("");
      setFormName("");
      setFormRole("viewer");
      setFormPhone("");
      setFormPassword("");
    } else if (mode === "edit" && user) {
      setFormEmail(user.email);
      setFormName(user.name);
      setFormRole(user.role);
      setFormPhone(user.phone || "");
    } else if (mode === "password" && user) {
      setFormPassword("");
    } else if (mode === "activity" && user) {
      fetchUserActivities(user.id);
    }
  }

  async function fetchUserActivities(userId: string) {
    setActivitiesLoading(true);
    try {
      const res = await adminExtendedApi.getAuditLog({ limit: 50, userId });
      setUserActivities(res.data || []);
    } catch {
      setUserActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }

  function closeModal() {
    setModalMode(null);
    setSelectedUser(null);
    setFormError("");
    setUserActivities([]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await usersAdminApi.create({
        email: formEmail,
        password: formPassword,
        name: formName,
        role: formRole,
        phone: formPhone || undefined,
      });
      closeModal();
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || "فشل إنشاء المستخدم");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError("");
    setSaving(true);
    try {
      await usersAdminApi.update(selectedUser.id, {
        email: formEmail,
        name: formName,
        role: formRole,
        phone: formPhone || undefined,
      });
      closeModal();
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || "فشل تحديث المستخدم");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError("");
    setSaving(true);
    try {
      await usersAdminApi.resetPassword(selectedUser.id, formPassword);
      closeModal();
    } catch (err: any) {
      setFormError(err.message || "فشل إعادة تعيين كلمة المرور");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: AdminUserRecord) {
    if (user.id === currentUser?.id) {
      alert("لا يمكنك حذف حسابك الخاص");
      return;
    }
    if (!confirm(`هل أنت متأكد من حذف المستخدم "${user.name}" (${user.email})؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    try {
      await usersAdminApi.delete(user.id);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "فشل حذف المستخدم");
    }
  }

  const roleBadgeClass: Record<string, string> = {
    super_admin: "badge-warn",
    admin: "badge-info",
    editor: "badge-purple",
    operator: "badge-success",
    viewer: "badge-info",
    driver: "badge-purple",
    passenger: "",
  };

  return (
    <div>
      <Panel
        title="إدارة المستخدمين"
        subtitle={`${total} مستخدم`}
        headerRight={
          <div style={{ display: "flex", gap: 8 }}>
            <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
              style={{ width: 140, padding: "6px 10px", fontSize: 12 }}>
              <option value="all">جميع الصلاحيات</option>
              {ALL_ROLES.map((r) => <option key={r} value={r}>{roleLabels[r] || r}</option>)}
            </select>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input className="form-input" placeholder="بحث عن مستخدم..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingRight: 32, width: 200, padding: "6px 10px 6px 10px", fontSize: 12 }} />
            </div>
            <button className="btn btn-sm" onClick={fetchUsers}><RefreshCw size={12} /> تحديث</button>
            <button className="btn btn-primary btn-sm" onClick={() => openModal("create")}>
              <Plus size={14} /> إضافة مستخدم
            </button>
          </div>
        }
      >
        {error ? (
          <InlineError message="فشل تحميل المستخدمين" onRetry={fetchUsers} />
        ) : loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : users.length === 0 ? (
          <EmptyState message="لا يوجد مستخدمين" />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>البريد الإلكتروني</th>
                  <th>الصلاحية</th>
                  <th>الهاتف</th>
                  <th>آخر دخول</th>
                  <th>تاريخ التسجيل</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: u.role === "super_admin" ? "var(--warn-soft)" : "var(--accent-soft)",
                          color: u.role === "super_admin" ? "var(--warn)" : "var(--accent)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 600, flexShrink: 0,
                        }}>
                          {u.name.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 500 }}>{u.name}</span>
                        {u.id === currentUser?.id && (
                          <span className="tag tag-success" style={{ fontSize: 10 }}>أنت</span>
                        )}
                      </div>
                    </td>
                    <td className="cell-mono" style={{ fontSize: 12 }}>{u.email}</td>
                    <td><span className={`badge ${roleBadgeClass[u.role] || "badge-info"}`}>{roleLabels[u.role] || u.role}</span></td>
                    <td className="cell-mono" style={{ fontSize: 12 }}>{u.phone || "—"}</td>
                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}</td>
                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDateTime(u.createdAt)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn btn-sm" onClick={() => openModal("activity", u)} title="نشاط المستخدم"><Eye size={12} /></button>
                        <button className="btn btn-sm" onClick={() => openModal("edit", u)} title="تعديل"><Edit3 size={12} /></button>
                        <button className="btn btn-sm" onClick={() => openModal("password", u)} title="تغيير كلمة المرور"><Key size={12} /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u)} disabled={u.id === currentUser?.id}
                          title={u.id === currentUser?.id ? "لا يمكن حذف حسابك" : "حذف"}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ─── Modal ──────────────────────────────────────────────────────── */}
      {modalMode && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <form
            onSubmit={modalMode === "create" ? handleCreate : modalMode === "edit" ? handleEdit : modalMode === "password" ? handleResetPassword : undefined as any}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 28, width: "100%", maxWidth: modalMode === "activity" ? 650 : 480, maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>
                {modalMode === "activity" ? `نشاط: ${selectedUser?.name}`
                  : modalMode === "create" ? "إضافة مستخدم جديد"
                  : modalMode === "edit" ? `تعديل: ${selectedUser?.name}`
                  : `إعادة تعيين كلمة المرور: ${selectedUser?.name}`}
              </h3>
              <button className="btn btn-sm" type="button" onClick={closeModal} style={{ padding: "4px 8px" }}>
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: "10px 14px", marginBottom: 16, background: "var(--danger-soft)", border: "1px solid var(--danger)", borderRadius: "var(--radius-sm)", color: "var(--danger)", fontSize: 13 }}>
                {formError}
              </div>
            )}

            {modalMode === "activity" ? (
              /* ── Activity Log ── */
              activitiesLoading ? <TableSkeleton rows={5} cols={4} /> : userActivities.length === 0 ? (
                <EmptyState message="لا يوجد نشاط لهذا المستخدم" />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الإجراء</th>
                      <th>النوع</th>
                      <th>التفاصيل</th>
                      <th>الوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userActivities.map((a: ActivityRecord) => (
                      <tr key={a.id}>
                        <td><span className="badge badge-info">{actionLabels[a.action] || a.action}</span></td>
                        <td className="cell-mono">{entityTypeLabels[a.entity_type] || a.entity_type}</td>
                        <td style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.details ? JSON.stringify(a.details).substring(0, 60) : "—"}
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatRelativeTime(a.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : modalMode === "password" ? (
              <div style={{ marginBottom: 24 }}>
                <label className="form-label">كلمة المرور الجديدة *</label>
                <input className="form-input" type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)}
                  required minLength={6} placeholder="6 أحرف على الأقل" dir="ltr" autoFocus />
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label className="form-label">الاسم *</label>
                  <input className="form-input" value={formName} onChange={(e) => setFormName(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">البريد الإلكتروني *</label>
                  <input className="form-input" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required dir="ltr" />
                </div>
                <div>
                  <label className="form-label">الهاتف</label>
                  <input className="form-input" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+962-7X-XXX-XXXX" dir="ltr" />
                </div>
                <div>
                  <label className="form-label">الصلاحية *</label>
                  <select className="form-select" value={formRole} onChange={(e) => setFormRole(e.target.value)}>
                    {ALL_ROLES.map((r) => <option key={r} value={r}>{roleLabels[r] || r}</option>)}
                  </select>
                </div>
                {modalMode === "create" && (
                  <div>
                    <label className="form-label">كلمة المرور *</label>
                    <input className="form-input" type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)}
                      required minLength={6} placeholder="6 أحرف على الأقل" dir="ltr" />
                  </div>
                )}
              </div>
            )}

            {modalMode !== "activity" && (
              <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "flex-end" }}>
                <button className="btn" type="button" onClick={closeModal}>إلغاء</button>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? "جاري الحفظ..." : modalMode === "create" ? "إضافة" : modalMode === "password" ? "تعيين كلمة المرور" : "تحديث"}
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
