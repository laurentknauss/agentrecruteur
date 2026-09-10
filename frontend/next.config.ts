import path from "node:path"
import type { NextConfig } from "next"

// App monolithique : le frontend ET l'API (/api/*) sont servis par le même serveur Next.
const nextConfig: NextConfig = {
  // Sortie auto-suffisante : Next trace et embarque les dépendances réellement utilisées
  // (y compris les externes du serveur). Le déploiement ne dépend donc plus du layout
  // pnpm du poste de build — cf. incident du 2026-09-10 (alias `.next/node_modules/<pkg>-<hash>`).
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."), // monorepo pnpm : les dépendances sont à la racine du dépôt
  images: {
    unoptimized: true, // pas de dépendance sharp au build/deploy
  },
}

export default nextConfig
