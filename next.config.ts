import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    return [{ source: "/", destination: "/landing.html" }];
  },
};

export default nextConfig;
