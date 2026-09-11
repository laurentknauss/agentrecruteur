// Garde-fou d'accès aux routes de données (liste, détail, Q&A, suppression).
//
// Ce garde-fou est volontairement minimal : il protège les données candidats par un
// jeton partagé en attendant l'intégration d'un vrai fournisseur d'identité (Clerk).
//
// Politique fail-closed : si `ADMIN_TOKEN` n'est pas configuré en production, les
// routes de données répondent 503 — jamais d'ouverture silencieuse.
// En développement, l'absence de jeton laisse les routes ouvertes pour le travail local.

import { timingSafeEqual } from "node:crypto"

export interface AdminAuth {
  ownerId: string | null
}

export type AuthResult = { ok: true; auth: AdminAuth } | { ok: false; response: Response }

const BEARER_PREFIX = "Bearer "

function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Contrôle d'accès des routes de données.
 *
 * - `ADMIN_TOKEN` absent + production → 503 (fail-closed, aucune donnée servie).
 * - `ADMIN_TOKEN` absent + développement → accès local autorisé, avertissement journalisé.
 * - `ADMIN_TOKEN` défini → `Authorization: Bearer <token>` obligatoire, comparaison à
 *   temps constant, 401 sinon.
 */
export function authorizeAdmin(request: Request): AuthResult {
  const expected = process.env.ADMIN_TOKEN

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        response: Response.json(
          {
            error:
              "Accès aux données non configuré (ADMIN_TOKEN manquant). Aucune donnée n'est servie.",
            code: "ADMIN_TOKEN_MISSING",
          },
          { status: 503 },
        ),
      }
    }
    console.warn(
      "⚠️ ADMIN_TOKEN absent — routes de données ouvertes en développement uniquement.",
    )
    return { ok: true, auth: { ownerId: null } }
  }

  const header = request.headers.get("authorization") ?? ""
  const provided = header.startsWith(BEARER_PREFIX)
    ? header.slice(BEARER_PREFIX.length).trim()
    : ""

  if (provided.length === 0 || !tokensMatch(provided, expected)) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  return { ok: true, auth: { ownerId: process.env.ADMIN_OWNER_ID || null } }
}

/**
 * Propriétaire associé à une requête d'ingestion : renseigné uniquement lorsqu'un
 * jeton admin valide accompagne l'upload. En l'absence de contexte d'authentification,
 * le candidat est enregistré sans propriétaire (anonyme) — Clerk remplacera ce mécanisme.
 */
export function optionalOwnerId(request: Request): string | null {
  const result = authorizeAdmin(request)
  return result.ok ? result.auth.ownerId : null
}
