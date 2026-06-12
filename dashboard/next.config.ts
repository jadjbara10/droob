import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Security headers — applied only to HTML page routes, NOT static assets
  async headers() {
    return [
      {
        // App pages only — excludes _next/static, _next/image, API routes, etc.
        source: "/((?!_next|api|favicon).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
