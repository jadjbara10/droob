"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   دروب Droob — 404 Not Found Page
   ═══════════════════════════════════════════════════════════════════════════ */

import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, #0B0F1A)",
        color: "var(--text-primary, #F0F4FF)",
        fontFamily: "'Tajawal', sans-serif",
        textAlign: "center",
        padding: 20,
      }}
    >
      <div style={{ fontSize: 72, fontWeight: 700, color: "var(--accent, #3BB0FF)", marginBottom: 16 }}>
        ٤٠٤
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
        الصفحة غير موجودة
      </div>
      <div style={{ fontSize: 14, color: "var(--text-secondary, #8899BB)", marginBottom: 24 }}>
        عذراً، الصفحة التي تبحث عنها غير موجودة
      </div>
      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 20px",
          borderRadius: 8,
          background: "var(--accent, #3BB0FF)",
          color: "white",
          textDecoration: "none",
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        العودة للرئيسية
      </Link>
    </div>
  );
}
