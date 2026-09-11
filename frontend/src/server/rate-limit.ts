// Limiteur de débit en mémoire, par IP — amortisseur provisoire en attendant un
// quota par compte authentifié. Volontairement simple : une instance de serveur,
// fenêtre glissante par clé, remise à zéro automatique à l'expiration.

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

const hits = new Map<string, number[]>()

/** IP cliente vue par le proxy (Caddy renseigne `x-forwarded-for`). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const first = forwarded?.split(",")[0]?.trim()
  if (first) return first
  return request.headers.get("x-real-ip") ?? "unknown"
}

/**
 * Enregistre une tentative pour `key` et indique si elle est autorisée.
 * Le nettoyage des fenêtres expirées évite la croissance illimitée de la Map.
 */
export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now()
  const windowStart = now - windowMs
  const recent = (hits.get(key) ?? []).filter((at) => at > windowStart)

  if (recent.length >= limit) {
    hits.set(key, recent)
    const oldest = recent[0]
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    }
  }

  recent.push(now)
  hits.set(key, recent)
  return { allowed: true, remaining: limit - recent.length, retryAfterSeconds: 0 }
}

/** Purge l'état du limiteur (tests). */
export function resetRateLimits(): void {
  hits.clear()
}
