import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy dev/prod : le frontend appelle /api/* en same-origin,
  // redirigé vers le backend Express (dev : localhost:3001, prod : VPS via rewrite Vercel).
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ]
  },
  images: {
    unoptimized: true, // pas de dépendance sharp au build/deploy
  },
};

export default nextConfig;
