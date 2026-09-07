import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy : le frontend appelle /api/* en same-origin, redirigé vers le backend Express.
  // BACKEND_API_URL est surchargé dans les previews de variantes (ex. http://localhost:3011).
  async rewrites() {
    const api = process.env.BACKEND_API_URL || "http://localhost:3011"
    return [
      {
        source: "/api/:path*",
        destination: `${api}/api/:path*`,
      },
    ]
  },
  // distDir surchargé pour lancer plusieurs previews dev en parallèle (NEXT_DIST_DIR=.next-b / .next-c).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    unoptimized: true, // pas de dépendance sharp au build/deploy
  },
}

export default nextConfig
