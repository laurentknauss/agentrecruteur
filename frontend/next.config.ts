import type { NextConfig } from "next"

// App monolithique : le frontend ET l'API (/api/*) sont servis par le même serveur Next.
const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // pas de dépendance sharp au build/deploy
  },
}

export default nextConfig
