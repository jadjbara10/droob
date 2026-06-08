/* ═══════════════════════════════════════════════════════════════════════════
   دروب Droob — Root Layout
   RTL Arabic · Dark theme · Auth provider
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "دروب — لوحة التحكم",
  description: "لوحة تحكم نظام النقل الذكي دروب",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
