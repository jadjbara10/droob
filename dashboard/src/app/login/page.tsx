"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   دروب Droob — Login Page
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Bus, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("الرجاء إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError((err as Error).message || "فشل تسجيل الدخول");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 40,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto 16px",
              background: "var(--accent-soft)",
              border: "1px solid var(--border-active)",
              borderRadius: "var(--radius)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent)",
            }}
          >
            <Bus size={28} />
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            دروب
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            لوحة التحكم — تسجيل الدخول
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                padding: "10px 14px",
                marginBottom: 16,
                background: "var(--danger-soft)",
                border: "1px solid var(--danger)",
                borderRadius: "var(--radius-sm)",
                color: "var(--danger)",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label className="form-label">البريد الإلكتروني</label>
            <input
              className="form-input"
              type="email"
              placeholder="admin@droob.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              dir="ltr"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="form-label">كلمة المرور</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
            />
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={isSubmitting}
            style={{ width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 14 }}
          >
            {isSubmitting ? (
              "جاري الدخول..."
            ) : (
              <>
                <LogIn size={16} />
                تسجيل الدخول
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
