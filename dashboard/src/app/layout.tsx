// ============================================================================
// دروب (Droob) — Admin Dashboard Root Layout (Server Component)
// ============================================================================

import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/Toaster";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "دروب — لوحة التحكم",
  description:
    "Jordan Transit Admin Dashboard — نظام إدارة النقل العام الأردني",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className="bg-[var(--surface)] text-[var(--text-primary)] font-sans antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}