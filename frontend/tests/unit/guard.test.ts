import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { authorizeAdmin, optionalOwnerId } from "@/server/auth/guard"

function bearerRequest(token?: string): Request {
  const headers = token ? { authorization: `Bearer ${token}` } : undefined
  return new Request("http://test.local/api/candidates", { headers })
}

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.stubEnv("NODE_ENV", "test")
  vi.stubEnv("ADMIN_TOKEN", undefined)
  vi.stubEnv("ADMIN_OWNER_ID", undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("authorizeAdmin — garde-fou fail-closed", () => {
  it("refuse (503) en production quand ADMIN_TOKEN n'est pas configuré", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const result = authorizeAdmin(bearerRequest())
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("attendu: refus")
    expect(result.response.status).toBe(503)
    expect(await result.response.json()).toMatchObject({ code: "ADMIN_TOKEN_MISSING" })
  })

  it("laisse passer hors production sans jeton (développement local)", () => {
    const result = authorizeAdmin(bearerRequest())
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("attendu: autorisé")
    expect(result.auth.ownerId).toBeNull()
  })

  it("refuse (401) sans en-tête Authorization quand un jeton est configuré", () => {
    vi.stubEnv("ADMIN_TOKEN", "secret-admin")
    const result = authorizeAdmin(bearerRequest())
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("attendu: refus")
    expect(result.response.status).toBe(401)
  })

  it("refuse (401) un jeton erroné", () => {
    vi.stubEnv("ADMIN_TOKEN", "secret-admin")
    const result = authorizeAdmin(bearerRequest("mauvais-jeton"))
    expect(result.ok).toBe(false)
  })

  it("accepte le jeton attendu et remonte le propriétaire configuré", () => {
    vi.stubEnv("ADMIN_TOKEN", "secret-admin")
    vi.stubEnv("ADMIN_OWNER_ID", "agence-1")
    const result = authorizeAdmin(bearerRequest("secret-admin"))
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("attendu: autorisé")
    expect(result.auth.ownerId).toBe("agence-1")
  })

  it("accepte le jeton sans propriétaire → portée administrateur globale", () => {
    vi.stubEnv("ADMIN_TOKEN", "secret-admin")
    const result = authorizeAdmin(bearerRequest("secret-admin"))
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("attendu: autorisé")
    expect(result.auth.ownerId).toBeNull()
  })
})

describe("optionalOwnerId — ingestion", () => {
  it("reste anonyme sans jeton", () => {
    expect(optionalOwnerId(bearerRequest())).toBeNull()
  })

  it("rattache l'upload au propriétaire quand un jeton admin accompagne la requête", () => {
    vi.stubEnv("ADMIN_TOKEN", "secret-admin")
    vi.stubEnv("ADMIN_OWNER_ID", "agence-1")
    expect(optionalOwnerId(bearerRequest("secret-admin"))).toBe("agence-1")
  })

  it("reste anonyme si le jeton fourni est invalide", () => {
    vi.stubEnv("ADMIN_TOKEN", "secret-admin")
    vi.stubEnv("ADMIN_OWNER_ID", "agence-1")
    expect(optionalOwnerId(bearerRequest("mauvais"))).toBeNull()
  })
})
