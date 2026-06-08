"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Topbar — 64px sticky, page title, notification bell, user menu
   ═══════════════════════════════════════════════════════════════════════════ */

import React from "react";
import { LogOut, Menu } from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { useAuth } from "@/lib/auth";

interface TopbarProps {
  title: string;
  onMenuToggle?: () => void;
}

export function Topbar({ title, onMenuToggle }: TopbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {onMenuToggle && (
          <button
            className="btn btn-sm"
            onClick={onMenuToggle}
            style={{ display: "none", padding: "4px 8px" }}
            id="mobile-menu-btn"
          >
            <Menu size={18} />
          </button>
        )}
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-actions">
        <NotificationBell />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {user?.name}
          </span>
          <button className="btn btn-sm" onClick={logout} title="تسجيل الخروج">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
