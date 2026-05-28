// ============================================================================
// دروب (Droob) — Dashboard Shell (Layout)
// Sidebar + Header + Content area with page transition animations
// ============================================================================

"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import type { NavItem } from "@/components/Sidebar";

// ─── Icons for Navigation ──────────────────────────────────────────────────

const HomeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9,22 9,12 15,12 15,22" />
  </svg>
);

const TruckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="2" />
    <polygon points="16,8 20,8 23,11 23,16 16,16 16,8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const ChartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const MapIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const ReportIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="9" y2="9" />
  </svg>
);

// ─── Navigation Items ──────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "لوحة التحكم",
    icon: <HomeIcon className="w-5 h-5" />,
  },
  {
    href: "/fleet",
    label: "إدارة الأسطول",
    icon: <TruckIcon className="w-5 h-5" />,
    badge: 3,
  },
  {
    href: "/alerts",
    label: "مركز التنبيهات",
    icon: <BellIcon className="w-5 h-5" />,
    badge: 12,
    section: "",
  },
  {
    href: "/analytics",
    label: "التحليلات",
    icon: <ChartIcon className="w-5 h-5" />,
  },
  {
    href: "/routes",
    label: "الخطوط",
    icon: <MapIcon className="w-5 h-5" />,
    section: "النقل",
  },
  {
    href: "/stops",
    label: "المحطات",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "الإعدادات",
    icon: <SettingsIcon className="w-5 h-5" />,
    section: "النظام",
  },
  {
    href: "/reports",
    label: "التقارير",
    icon: <ReportIcon className="w-5 h-5" />,
  },
];

// ─── Page Transition Variants ──────────────────────────────────────────────

const pageVariants = {
  initial: {
    opacity: 0,
    x: 16,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.46, 0.45, 0.94], // ease-out-quad
    },
  },
  exit: {
    opacity: 0,
    x: -16,
    transition: {
      duration: 0.15,
    },
  },
};

// ─── Component ─────────────────────────────────────────────────────────────

interface DashboardShellProps {
  children: React.ReactNode;
  headerProps?: {
    title?: string;
    actions?: React.ReactNode;
  };
}

export default function DashboardShell({ children, headerProps }: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-surface-2 overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <Sidebar items={NAV_ITEMS} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          title={headerProps?.title}
          actions={headerProps?.actions}
        />

        {/* Page content with transition */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="p-6 max-w-[1400px] mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom status bar — shows last updated etc. */}
        <footer className="h-[28px] shrink-0 border-t border-border bg-surface flex items-center justify-between px-4 text-[10px] text-text-tertiary">
          <span>آخر تحديث: قبل ٣ ثواني</span>
          <span>دروب © {new Date().getFullYear()}</span>
        </footer>
      </div>
    </div>
  );
}