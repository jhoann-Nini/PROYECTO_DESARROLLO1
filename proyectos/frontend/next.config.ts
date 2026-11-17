import type { NextConfig } from "next";
import { construirHeadersSeguridad } from "./src/lib/securityHeaders";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  turbopack: {
    root: __dirname,
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: construirHeadersSeguridad({
          produccion: process.env.NODE_ENV === "production",
          apiUrl: process.env.NEXT_PUBLIC_API_URL,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        }),
      },
    ];
  },
};

export default nextConfig;
