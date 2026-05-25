import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Disable Turbopack's filesystem cache — prevents ArrayLengthMismatch panics on restart
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
