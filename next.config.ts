import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Disable Turbopack's filesystem cache — prevents ArrayLengthMismatch panics on restart
    turbopackFileSystemCacheForDev: false,
  },
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
    AGENCY_ID: process.env.AGENCY_ID ?? "",
  },
};

export default nextConfig;
