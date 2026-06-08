"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   دروب Droob — Authenticated Dashboard Layout
   Sidebar (260px right) + Main (fluid left) + Topbar (64px sticky)
   ═══════════════════════════════════════════════════════════════════════════ */

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/lib/auth";

const PAGE_TITLES: Record<string, string> = {
  "/": "الرئيسية",
  "/map": "الخريطة التفاعلية",
  "/stops": "إدارة المحطات",
  "/hubs": "إدارة المجمعات",
  "/routes": "الخطوط والمسارات",
  "/reports": "التقارير",
  "/users": "إدارة المستخدمين",
  "/settings": "الإعدادات",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12 }} />
          <div className="skeleton skeleton-heading" style={{ width: 160 }} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // router.push will redirect
  }

  // Check super_admin routes
  const needsSuperAdmin = pathname.startsWith("/users") || pathname.startsWith("/settings");
  if (needsSuperAdmin && user.role !== "super_admin") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <div className="error-state">
          <div className="error-state-icon" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
            <span style={{ fontSize: 24 }}>🔒</span>
          </div>
          <div className="error-state-title">صلاحيات غير كافية</div>
          <div className="error-state-message">
            هذا القسم مخصص لمدير النظام فقط
          </div>
        </div>
      </div>
    );
  }

  const title = PAGE_TITLES[pathname] || "لوحة التحكم";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar />
      <div
        className="main-content"
        style={{ marginRight: "var(--sidebar-w)" }}
      >
        <Topbar title={title} />
        <main style={{ padding: "var(--content-p)" }}>{children}</main>
      </div>
    </div>
  );
}
