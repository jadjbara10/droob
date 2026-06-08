"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Sidebar — 260px fixed RTL, nav items, active state, user footer
   ═══════════════════════════════════════════════════════════════════════════ */

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  MapPin,
  Building2,
  Route,
  BarChart3,
  Users,
  Settings,
  Bus,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { roleLabels } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  superAdminOnly?: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems: NavItem[] = [
    { href: "/", label: "الرئيسية", icon: <LayoutDashboard size={18} /> },
    { href: "/map", label: "الخريطة التفاعلية", icon: <Map size={18} /> },
    { href: "/stops", label: "إدارة المحطات", icon: <MapPin size={18} /> },
    { href: "/hubs", label: "إدارة المجمعات", icon: <Building2 size={18} /> },
    { href: "/routes", label: "الخطوط والمسارات", icon: <Route size={18} /> },
    { href: "/reports", label: "التقارير", icon: <BarChart3 size={18} /> },
    { href: "/users", label: "إدارة المستخدمين", icon: <Users size={18} />, superAdminOnly: true },
    { href: "/settings", label: "الإعدادات", icon: <Settings size={18} />, superAdminOnly: true },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const userRole = user?.role || "";
  const userInitial = user?.name?.charAt(0) || "م";

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Bus size={20} />
        </div>
        <div>
          <div className="sidebar-brand-text">دروب</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>لوحة التحكم</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems
          .filter((item) => !item.superAdminOnly || userRole === "super_admin")
          .map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${active ? " active" : ""}`}
              >
                <span className="nav-item-icon">{item.icon}</span>
                <span className="nav-item-label">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </Link>
            );
          })}
      </nav>

      {/* User Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{userInitial}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || "مستخدم"}</div>
            <div className="sidebar-user-role">
              {roleLabels[userRole] || userRole || "غير معروف"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
