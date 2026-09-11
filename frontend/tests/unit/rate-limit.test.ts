import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { checkRateLimit, clientIp, resetRateLimits } from "@/server/rate-limit"

describe("clientIp — résolution de l'IP cliente", () => {
  it("prend la première IP de x-forwarded-for (proxy Caddy)", () => {
    const request = new Request("http://test.local/api/upload-cv", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    })
    expect(clientIp(request)).toBe("203.0.113.7")
  })

  it("retombe sur x-real-ip", () => {
    const request = new Request("http://test.local/api/upload-cv", {
      headers: { "x-real-ip": "198.51.100.4" },
    })
    expect(clientIp(request)).toBe("198.51.100.4")
  })

  it("retourne une clé stable sans en-tête de proxy", () => {
    expect(clientIp(new Request("http://test.local/api/upload-cv"))).toBe("unknown")
  })
})

describe("checkRateLimit — fenêtre glissante", () => {
  beforeEach(() => {
    resetRateLimits()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("autorise jusqu'à la limite puis bloque avec un délai de retry", () => {
    const options = { limit: 2, windowMs: 60_000 }
    expect(checkRateLimit("ip", options).allowed).toBe(true)
    expect(checkRateLimit("ip", options).allowed).toBe(true)

    const blocked = checkRateLimit("ip", options)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it("isole les compteurs par clé", () => {
    const options = { limit: 1, windowMs: 60_000 }
    expect(checkRateLimit("ip-a", options).allowed).toBe(true)
    expect(checkRateLimit("ip-b", options).allowed).toBe(true)
    expect(checkRateLimit("ip-a", options).allowed).toBe(false)
  })

  it("libère le quota à l'expiration de la fenêtre", () => {
    const options = { limit: 1, windowMs: 1_000 }
    expect(checkRateLimit("ip", options).allowed).toBe(true)
    expect(checkRateLimit("ip", options).allowed).toBe(false)

    vi.advanceTimersByTime(1_001)
    expect(checkRateLimit("ip", options).allowed).toBe(true)
  })
})
