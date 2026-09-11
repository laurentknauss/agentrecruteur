// Taxonomie d'erreurs du pipeline d'analyse.
//
// Objectif : ne jamais faire converger des incidents de nature différente vers un
// unique 500, ne jamais exposer un message interne au client, et toujours fournir
// un identifiant de corrélation pour relier la réponse à la trace serveur.

export const PDF_ERROR_CODES = {
  PASSWORD_PROTECTED: "PDF_PASSWORD_PROTECTED",
  NO_TEXT: "PDF_NO_TEXT",
  CORRUPTED: "PDF_CORRUPTED",
  TOO_LONG: "PDF_TOO_LONG",
} as const

export type PdfErrorCode = (typeof PDF_ERROR_CODES)[keyof typeof PDF_ERROR_CODES]

/** Identifiants techniques reconnus comme « texte extrait hors bornes ». */
const PDF_TOO_LONG_CODES: Record<string, true> = { PDF_TOO_LONG: true }

/** Erreur liée au PDF fourni (422 côté HTTP). */
export class PdfError extends Error {
  readonly code: PdfErrorCode
  readonly status = 422

  constructor(code: PdfErrorCode, message: string) {
    super(message)
    this.name = "PdfError"
    this.code = code
  }
}

/** Erreur liée à un service interne (LLM, base) indisponible (502 côté HTTP). */
export class AnalysisServiceError extends Error {
  readonly code = "ANALYSIS_SERVICE_UNAVAILABLE"
  readonly status = 502

  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = "AnalysisServiceError"
  }
}

function asMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return typeof error === "string" ? error : ""
}

function asCode(error: unknown): string | null {
  const code = (error as { code?: unknown } | null)?.code
  return typeof code === "string" ? code : null
}

/**
 * Convertit n'importe quelle erreur d'extraction/lecture PDF en `PdfError`
 * exploitable par la couche HTTP (422 avec code stable).
 */
export function toPdfError(error: unknown): PdfError {
  if (error instanceof PdfError) return error

  const code = asCode(error)
  const message = asMessage(error)
  const name = error instanceof Error ? error.name : ""

  if (code !== null && PDF_TOO_LONG_CODES[code]) {
    return new PdfError(PDF_ERROR_CODES.TOO_LONG, message)
  }
  if (name === "PasswordException" || /password/i.test(message)) {
    return new PdfError(
      PDF_ERROR_CODES.PASSWORD_PROTECTED,
      "Ce PDF est protégé par mot de passe : retirez la protection puis réessayez.",
    )
  }
  if (/no text could be extracted/i.test(message)) {
    return new PdfError(
      PDF_ERROR_CODES.NO_TEXT,
      "Aucune couche texte détectée dans ce PDF (document scanné). L'OCR n'est pas pris en charge : fournissez un PDF texte.",
    )
  }
  if (/too (long|large)/i.test(message)) {
    return new PdfError(PDF_ERROR_CODES.TOO_LONG, message)
  }
  return new PdfError(
    PDF_ERROR_CODES.CORRUPTED,
    "Ce PDF est illisible ou corrompu : vérifiez le fichier puis réessayez.",
  )
}

/**
 * Convertit une erreur de la phase d'analyse (structuration/analyse LLM) :
 * une erreur PDF reste une 422, tout le reste devient un 502 service indisponible.
 */
export function toAnalysisError(error: unknown): PdfError | AnalysisServiceError {
  if (error instanceof PdfError || error instanceof AnalysisServiceError) return error

  const code = asCode(error)
  const message = asMessage(error)
  const name = error instanceof Error ? error.name : ""

  if (
    (code !== null && code.startsWith("PDF_")) ||
    name === "PasswordException" ||
    /password/i.test(message) ||
    /no text could be extracted/i.test(message)
  ) {
    return toPdfError(error)
  }

  return new AnalysisServiceError(
    "Le service d'analyse est momentanément indisponible.",
    error,
  )
}
