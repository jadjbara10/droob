"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Notification Bell — with unread count from API
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { alertsApi, AlertRecord } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";

export function NotificationBell() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    alertsApi
      .list({ active: true, limit: 10 })
      .then((res) => setAlerts(res.data))
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="notif-btn" onClick={() => setIsOpen(!isOpen)}>
        <Bell size={18} />
        {alerts.length > 0 && <span className="notif-badge">{alerts.length}</span>}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 0,
            width: 340,
            maxHeight: 400,
            overflow: "auto",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            zIndex: 200,
          }}
        >
          <div
            className="panel-header"
            style={{ position: "sticky", top: 0, background: "var(--surface)" }}
          >
            <span className="panel-title">التنبيهات</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {alerts.length} جديد
            </span>
          </div>
          {alerts.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>
              لا توجد تنبيهات
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background:
                        alert.severity === "critical"
                          ? "var(--danger)"
                          : alert.severity === "warning"
                            ? "var(--warn)"
                            : "var(--accent)",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {alert.title_ar}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginRight: 16 }}>
                  {alert.message_ar}
                </p>
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: 16 }}>
                  {formatRelativeTime(alert.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
