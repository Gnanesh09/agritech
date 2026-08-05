import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.67.64.210'],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;