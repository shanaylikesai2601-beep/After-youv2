import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.AFTERYOU_NEXT_DIST_DIR ?? ".next",
  adapterPath: require("path").join(process.cwd(), "empty-adapter.js"),
  async rewrites() {
    return [{ source: "/", destination: "/landing.html" }];
  },
};

export default nextConfig;
