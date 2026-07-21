import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.AFTERYOU_NEXT_DIST_DIR ?? ".next",
  async rewrites() {
    return [{ source: "/", destination: "/landing.html" }];
  },
};

export default nextConfig;
