import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Force UTF-8 encoding for all responses
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Type", value: "text/html; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
