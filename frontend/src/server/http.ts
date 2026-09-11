// Réponses d'erreur HTTP communes aux routes API.
//
// Règle : le client ne reçoit jamais un message interne ni une trace. Les incidents
// connus sont traduits en statuts stables (422 PDF, 502 service) ; le reste devient
// un 500 générique porteur d'un identifiant de corrélation, corrélé aux journaux.

import { randomUUID } from "node:crypto"
import { AnalysisServiceError, PdfError } from "./errors.ts"

/**
 * @param context Étiquette de route utilisée dans les journaux (`upload-cv`, `ask`, …).
 */
export function errorResponse(context: string, error: unknown): Response {
  if (error instanceof PdfError || error instanceof AnalysisServiceError) {
    console.warn(`⚠️ ${context} ${error.code}: ${error.message}`)
    return Response.json({ error: error.message, code: error.code }, { status: error.status })
  }

  const correlationId = randomUUID()
  console.error(`❌ ${context} [${correlationId}]:`, error)
  return Response.json(
    { error: "Erreur interne lors du traitement de la requête.", correlationId },
    { status: 500 },
  )
}
