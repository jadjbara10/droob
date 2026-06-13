import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import { Bus, MapPin, Search, Star, Menu, X, Wifi, WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "دروب — النقل العام في الأردن",
  description:
    "تطبيق النقل العام في الأردن — مسارات الباص السريع، السرفيس، الكوستر، والباصات العامة في جميع المحافظات",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "دروب",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#1B5E20",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        `}} />
      </head>
      <body className="font-arabic bg-droob-bg text-droob-text min-h-screen">
        {/* App Shell */}
        <div className="flex flex-col min-h-screen">
          {/* Header */}
          <header className="bg-droob-primary text-white shadow-lg sticky top-0 z-50">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Bus size={28} className="text-droob-secondary" />
                <div>
                  <h1 className="text-xl font-bold leading-tight">دروب</h1>
                  <p className="text-xs text-white/70 -mt-0.5">
                    النقل العام في الأردن
                  </p>
                </div>
              </div>
              <nav className="flex items-center gap-3">
                <Link
                  href="/search"
                  className="p-2 rounded-full hover:bg-white/10 transition active:bg-white/20"
                  aria-label="بحث"
                >
                  <Search size={22} />
                </Link>
              </nav>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">{children}</main>

          {/* Bottom Navigation */}
          <nav className="bg-white border-t border-gray-200 shadow-lg sticky bottom-0 z-50">
            <div className="flex items-center justify-around py-2">
              <Link
                href="/"
                className="flex flex-col items-center gap-0.5 px-4 py-1 text-droob-primary hover:text-droob-primary/80 transition active:scale-95"
              >
                <MapPin size={22} />
                <span className="text-xs font-medium">المحطات</span>
              </Link>
              <Link
                href="/routes"
                className="flex flex-col items-center gap-0.5 px-4 py-1 text-gray-500 hover:text-droob-primary transition active:scale-95"
              >
                <Bus size={22} />
                <span className="text-xs font-medium">المسارات</span>
              </Link>
              <Link
                href="/search"
                className="flex flex-col items-center gap-0.5 px-4 py-1 text-gray-500 hover:text-droob-primary transition active:scale-95"
              >
                <Search size={22} />
                <span className="text-xs font-medium">بحث</span>
              </Link>
              <Link
                href="/favorites"
                className="flex flex-col items-center gap-0.5 px-4 py-1 text-gray-500 hover:text-droob-primary transition active:scale-95"
              >
                <Star size={22} />
                <span className="text-xs font-medium">المفضلة</span>
              </Link>
            </div>
          </nav>
        </div>

        {/* PWA Install Prompt Banner */}
        <PwaInstallBanner />

        {/* Scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Register Service Worker
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').then(
                    (reg) => console.log('✅ SW registered:', reg.scope),
                    (err) => console.log('❌ SW failed:', err)
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

/** Inline PWA install banner (beforeinstallprompt) */
function PwaInstallBanner() {
  return <></>; // Client component handles this dynamically
}