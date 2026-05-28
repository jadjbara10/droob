// ============================================================================
// دروب (Droob) — Dashboard Header
// Page title + breadcrumb + actions + dark mode toggle + search
// ============================================================================

"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import clsx from "clsx";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HeaderProps {
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

// ─── Icons ─────────────────────────────────────────────────────────────────

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const DividerIcon: React.FC = () => (
  <svg className="w-4 h-4 text-text-tertiary mx-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9,18 15,12 9,6" />
  </svg>
);

// ─── Custom Hook ────────────────────────────────────────────────────────────

function useDarkMode() {
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem("droob-theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  const toggle = React.useCallback(() => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("droob-theme", isDark ? "dark" : "light");
    setDark(isDark);
  }, []);

  return { dark, toggle };
}

// ─── Breadcrumbs Component ──────────────────────────────────────────────────

const Breadcrumbs: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav className="flex items-center text-xs text-text-tertiary" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <DividerIcon />}
          {item.href ? (
            <a href={item.href} className="hover:text-text-secondary transition-colors">
              {item.label}
            </a>
          ) : (
            <span className="text-text-primary font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

// ─── Page Title Mapper ──────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  "/": "لوحة التحكم",
  "/fleet": "إدارة الأسطول",
  "/alerts": "مركز التنبيهات",
  "/analytics": "التحليلات",
  "/routes": "الخطوط",
  "/stops": "المحطات",
  "/settings": "الإعدادات",
  "/reports": "التقارير",
};

// ─── Main Header Component ──────────────────────────────────────────────────

export default function Header({ title, breadcrumbs, actions }: HeaderProps) {
  const pathname = usePathname();
  const { dark, toggle } = useDarkMode();

  const pageTitle = title || PAGE_TITLES[pathname] || "";

  return (
    <header className="h-[64px] flex items-center justify-between px-6 border-b border-border bg-surface shrink-0">
      {/* Left: Title + Breadcrumbs */}
      <div className="flex flex-col justify-center min-w-0">
        <motion.h1
          key={pathname}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-lg font-bold text-text-primary leading-tight"
        >
          {pageTitle}
        </motion.h1>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs items={breadcrumbs} />
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden sm:block">
          <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          <input
            type="search"
            placeholder="بحث..."
            className="w-[220px] h-9 pl-3 pr-9 rounded-input bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
          />
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="w-9 h-9 rounded-input flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-all"
          title={dark ? "الوضع النهاري" : "الوضع الليلي"}
        >
          {dark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <button className="w-9 h-9 rounded-input flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-all relative">
          <BellIcon className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cancelled" />
        </button>

        {/* Custom actions */}
        {actions}
      </div>
    </header>
  );
}