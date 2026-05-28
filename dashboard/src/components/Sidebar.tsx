// ============================================================================
// دروب (Droob) — Dashboard Sidebar
// 240px fixed | Collapsed 64px | Active left-border | User footer | Dark mode
// ============================================================================

"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useAuth } from "@/components/AuthProvider";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  section?: string;
  badge?: number;
}

interface SidebarProps {
  items: NavItem[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير النظام",
  operator: "مشغّل",
  viewer: "مطّلع",
};

// ─── Icons (inline SVGs — no emoji dependency) ─────────────────────────────

const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16,17 21,12 16,7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const CollapseIcon: React.FC<{ className?: string; collapsed: boolean }> = ({ className, collapsed }) => (
  <svg className={clsx("transition-transform duration-300", collapsed && "rotate-180", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15,18 9,12 15,6" />
  </svg>
);

// ─── Component ─────────────────────────────────────────────────────────────

export default function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Group items by section
  const sections = items.reduce<NavSection[]>((acc, item) => {
    const section = item.section || "";
    const existing = acc.find((s) => s.label === section);
    if (existing) {
      existing.items.push(item);
    } else {
      acc.push({ label: section, items: [item] });
    }
    return acc;
  }, []);

  const initials = user?.name_ar
    ? user.name_ar
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
    : "م";

  const isActive = useCallback(
    (href: string) => {
      if (href === "/") return pathname === "/";
      return pathname.startsWith(href);
    },
    [pathname]
  );

  const sidebarWidth = collapsed ? "w-[64px]" : "w-[240px]";

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={clsx(
        sidebarWidth,
        "h-screen flex flex-col shrink-0 bg-surface border-l border-border relative z-30 overflow-hidden"
      )}
    >
      {/* ── Logo ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 h-[64px] border-b border-border shrink-0">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5"
            >
              {/* Logo mark */}
              <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10" />
                  <path d="M12 2a15.3 15.3 0 0 0-4 10 15.3 15.3 0 0 0 4 10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-extrabold text-text-primary tracking-tight leading-tight">
                  دروب
                </h1>
                <p className="text-[10px] text-text-tertiary leading-tight">لوحة التحكم</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto"
            >
              <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10" />
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((p) => !p)}
          className={clsx(
            "w-7 h-7 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-all duration-200 shrink-0",
            collapsed && "mx-auto"
          )}
          title={collapsed ? "توسيع القائمة" : "طي القائمة"}
        >
          <CollapseIcon className="w-4 h-4" collapsed={collapsed} />
        </button>
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-5 scrollbar-hide">
        {sections.map((section) => (
          <div key={section.label || "__main__"} className="space-y-1">
            {/* Section label */}
            {section.label && !collapsed && (
              <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                {section.label}
              </p>
            )}

            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={clsx(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-input text-sm font-medium transition-all duration-150 relative",
                    active
                      ? "bg-brand-blue/10 text-brand-blue"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                  )}
                >
                  {/* Active indicator bar */}
                  {active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-brand-blue rounded-l-full"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}

                  {/* Icon */}
                  <span className={clsx("flex-shrink-0 w-5 h-5 flex items-center justify-center transition-transform duration-150", active && "scale-110")}>
                    {item.icon}
                  </span>

                  {/* Label */}
                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="truncate"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Badge */}
                  {item.badge && !collapsed && item.badge > 0 && (
                    <span className="mr-auto px-1.5 py-0.5 rounded-pill text-[10px] font-bold bg-brand-blue text-white tabular-nums min-w-[20px] text-center">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}

                  {/* Collapsed badge dot */}
                  {item.badge && collapsed && item.badge > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-blue" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── User Footer ─────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border p-3 space-y-2">
        <div className={clsx("flex items-center gap-2.5", collapsed && "justify-center")}>
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-brand-green/20">
            {initials}
          </div>

          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                key="user-info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-0 flex-1"
              >
                <p className="text-xs font-semibold text-text-primary truncate leading-tight">
                  {user?.name_ar || "مدير النظام"}
                </p>
                <p className="text-[10px] text-text-tertiary truncate leading-tight">
                  {user ? ROLE_LABELS[user.role] || user.role : "super_admin"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          className={clsx(
            "w-full flex items-center gap-2 px-3 py-2 text-xs text-cancelled hover:bg-cancelled/5 rounded-input transition-all duration-150 font-medium",
            collapsed ? "justify-center" : "justify-start"
          )}
        >
          <LogoutIcon className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>تسجيل الخروج</span>}
        </button>
      </div>
    </motion.aside>
  );
}