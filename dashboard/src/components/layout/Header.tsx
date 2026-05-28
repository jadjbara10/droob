// ============================================================================
// دروب (Droob) — Dashboard Header
// 64px height, breadcrumb + title + actions, dark mode toggle
// ============================================================================

"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────────────────

interface HeaderProps {
  onToggleDarkMode: () => void;
  isDarkMode: boolean;
}

interface BreadcrumbItem {
  labelAr: string;
  href?: string;
}

const PAGE_TITLES: Record<string, BreadcrumbItem[]> = {
  "/": [
    { labelAr: "الرئيسية", href: "/" },
    { labelAr: "لوحة التحكم" },
  ],
  "/live-map": [
    { labelAr: "الرئيسية", href: "/" },
    { labelAr: "الخريطة المباشرة" },
  ],
  "/fleet": [
    { labelAr: "العمليات" },
    { labelAr: "إدارة الأسطول" },
  ],
  "/alerts": [
    { labelAr: "العمليات" },
    { labelAr: "التنبيهات" },
  ],
  "/analytics": [
    { labelAr: "التحليلات" },
    { labelAr: "التقارير" },
  ],
};

// ─── Breadcrumb ─────────────────────────────────────────────────────────────

const Breadcrumb: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => (
  <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
    {items.map((item, i) => (
      <React.Fragment key={i}>
        {i > 0 && <span className="text-text-tertiary">/</span>}
        {item.href ? (
          <a href={item.href} className="text-text-tertiary hover:text-text-primary transition-colors">
            {item.labelAr}
          </a>
        ) : (
          <span className="text-text-primary font-semibold">{item.labelAr}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);

// ─── Action Buttons ─────────────────────────────────────────────────────────

const HeaderActions: React.FC<HeaderProps> = ({ onToggleDarkMode, isDarkMode }) => (
  <div className="flex items-center gap-2">
    {/* Notifications */}
    <button
      className="relative w-9 h-9 flex items-center justify-center rounded-input text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
      title="الإشعارات"
    >
      <span className="text-lg">🔔</span>
      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cancelled rounded-full" />
    </button>

    {/* Dark mode toggle */}
    <button
      onClick={onToggleDarkMode}
      className="w-9 h-9 flex items-center justify-center rounded-input text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
      title={isDarkMode ? "الوضع النهاري" : "الوضع الليلي"}
    >
      <span className="text-lg">{isDarkMode ? "☀️" : "🌙"}</span>
    </button>

    {/* Divider */}
    <div className="w-px h-6 bg-border mx-1" />

    {/* User avatar */}
    <button className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center text-white text-xs font-bold hover:ring-2 hover:ring-brand-blue/30 transition-all">
      ع
    </button>
  </div>
);

// ─── Main Header Component ──────────────────────────────────────────────────

const Header: React.FC<HeaderProps> = ({ onToggleDarkMode, isDarkMode }) => {
  const pathname = usePathname();
  const breadcrumbs = PAGE_TITLES[pathname] ?? [{ labelAr: "الصفحة" }];
  const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.labelAr ?? "دروب";

  return (
    <motion.header
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center justify-between h-16 px-6 border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-30"
      style={{ height: "var(--header-height, 64px)" }}
    >
      {/* Left: Breadcrumb + Title */}
      <div className="flex flex-col gap-0.5">
        <Breadcrumb items={breadcrumbs} />
        <h1 className="text-xl font-bold text-text-primary">{pageTitle}</h1>
      </div>

      {/* Right: Actions */}
      <HeaderActions onToggleDarkMode={onToggleDarkMode} isDarkMode={isDarkMode} />
    </motion.header>
  );
};

export default Header;