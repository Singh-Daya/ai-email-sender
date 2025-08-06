import type { NextConfig } from "next";

// next.config.ts
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { allowedOrigins: ['*'] } },
};
export default nextConfig;
