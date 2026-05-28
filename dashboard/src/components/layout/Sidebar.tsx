// ============================================================================
// دروب (Droob) — Sidebar Navigation
// 240px fixed, collapsible to 64px, RTL-aware
// Active state with brand-blue left border + bg tint
// ============================================================================

"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

// ─── Types ──────────────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  labelAr: string;
  icon: string;
  href: string;
  badge?: number;
}

interface NavGroup {
  id: string;
  labelAr: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "main",
    labelAr: "الرئيسية",
    items: [
      { id: "dashboard", labelAr: "لوحة التحكم", icon: "📊", href: "/" },
      { id: "live-map", labelAr: "الخريطة المباشرة", icon: "🗺️", href: "/live-map" },
    ],
  },
  {
    id: "operations",
    labelAr: "العمليات",
    items: [
      { id: "fleet", labelAr: "إدارة الأسطول", icon: "🚌", href: "/fleet", badge: 3 },
      { id: "alerts", labelAr: "التنبيهات", icon: "🔔", href: "/alerts", badge: 5 },
      { id: "departures", labelAr: "المغادرات", icon: "⏱️", href: "/departures" },
    ],
  },
  {
    id: "analytics",
    labelAr: "التحليلات",
    items: [
      { id: "analytics", labelAr: "التقارير", icon: "📈", href: "/analytics" },
      { id: "reports", labelAr: "تقارير يومية", icon: "📋", href: "/reports" },
    ],
  },
  {
    id: "settings",
    labelAr: "الإعدادات",
    items: [
      { id: "settings", labelAr: "الإعدادات العامة", icon: "⚙️", href: "/settings" },
      { id: "users", labelAr: "المستخدمين", icon: "👥", href: "/users" },
    ],
  },
];

// ─── Sub-Components ─────────────────────────────────────────────────────────

const SidebarLogo: React.FC<{ collapsed: boolean }> = ({ collapsed }) => (
  <div className={clsx("flex items-center gap-3 px-4 h-16 border-b border-border", collapsed && "justify-center px-2")}>
    <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center flex-shrink-0">
      <span className="text-white text-sm font-bold">د</span>
    </div>
    <AnimatePresence>
      {!collapsed && (
        <motion.span
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          exit={{ opacity: 0, width: 0 }}
          className="text-lg font-bold text-text-primary whitespace-nowrap overflow-hidden"
        >
          دروب
        </motion.span>
      )}
    </AnimatePresence>
  </div>
);

const UserFooter: React.FC<{ collapsed: boolean }> = ({ collapsed }) => (
  <div className="border-t border-border p-4">
    <div className={clsx("flex items-center gap-3", collapsed && "justify-center")}>
      <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-semibold">ع</span>
      </div>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 min-w-0"
          >
            <p className="text-sm font-semibold text-text-primary truncate">أحمد العمري</p>
            <p className="text-xs text-text-tertiary truncate">مدير العمليات</p>
          </motion.div>
        )}
      </AnimatePresence>
      {!collapsed && (
        <button className="text-text-tertiary hover:text-cancelled transition-colors" title="تسجيل الخروج">
          <span>🚪</span>
        </button>
      )}
    </div>
  </div>
);

// ─── Main Sidebar Component ─────────────────────────────────────────────────

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = useCallback(
    (href: string) => {
      if (href === "/") return pathname === "/";
      return pathname.startsWith(href);
    },
    [pathname]
  );

  return (
    <aside
      className={clsx(
        "flex flex-col bg-surface border-l border-border h-screen sticky top-0 transition-all duration-300",
        collapsed ? "w-[64px]" : "w-[240px]"
      )}
    >
      <SidebarLogo collapsed={collapsed} />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="space-y-1">
            {/* Group label */}
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2"
                >
                  {group.labelAr}
                </motion.p>
              )}
            </AnimatePresence>

            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-input text-sm font-medium transition-all duration-150 group relative",
                    active
                      ? "bg-brand-blue/10 text-brand-blue"
                      : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                  )}
                  title={collapsed ? item.labelAr : undefined}
                >
                  {/* Active indicator */}
                  {active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-brand-blue rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}

                  <span className="text-lg flex-shrink-0">{item.icon}</span>

                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 truncate"
                      >
                        {item.labelAr}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Badge */}
                  {item.badge && (
                    <span
                      className={clsx(
                        "min-w-[20px] h-5 rounded-full bg-cancelled text-white text-[10px] font-bold flex items-center justify-center px-1",
                        collapsed && "absolute top-1 right-1"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-8 mx-2 mb-2 rounded-input text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
      >
        <span className={clsx("text-sm transition-transform", collapsed ? "rotate-180" : "")}>◀</span>
      </button>

      <UserFooter collapsed={collapsed} />
    </aside>
  );
};

export default Sidebar;