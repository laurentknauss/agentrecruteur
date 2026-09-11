import { describe, it, expect } from "vitest"
import {
  AnalysisServiceError,
  PDF_ERROR_CODES,
  PdfError,
  toAnalysisError,
  toPdfError,
} from "@/server/errors"

function namedError(name: string, message: string): Error {
  const error = new Error(message)
  error.name = name
  return error
}

describe("toPdfError — classification des incidents PDF", () => {
  it("classe un PDF chiffré (PasswordException) en 422 PDF_PASSWORD_PROTECTED", () => {
    const result = toPdfError(namedError("PasswordException", "No password given"))
    expect(result).toBeInstanceOf(PdfError)
    expect(result.code).toBe(PDF_ERROR_CODES.PASSWORD_PROTECTED)
    expect(result.status).toBe(422)
  })

  it("classe un dépassement de bornes (code PDF_TOO_LONG) en 422 PDF_TOO_LONG", () => {
    const tooLong = new Error("PDF trop long : 42 pages (maximum 20).")
    Object.assign(tooLong, { code: "PDF_TOO_LONG" })
    const result = toPdfError(tooLong)
    expect(result.code).toBe(PDF_ERROR_CODES.TOO_LONG)
    expect(result.message).toContain("42 pages")
  })

  it("classe un PDF sans couche texte en 422 PDF_NO_TEXT avec message explicite", () => {
    const result = toPdfError(new Error("No text could be extracted from PDF"))
    expect(result.code).toBe(PDF_ERROR_CODES.NO_TEXT)
    expect(result.message).toContain("OCR")
  })

  it("classe toute autre erreur d'extraction en 422 PDF_CORRUPTED", () => {
    const result = toPdfError(namedError("InvalidPDFException", "Invalid PDF structure"))
    expect(result.code).toBe(PDF_ERROR_CODES.CORRUPTED)
    expect(result.status).toBe(422)
  })

  it("est idempotent sur une erreur déjà classée", () => {
    const already = new PdfError(PDF_ERROR_CODES.CORRUPTED, "déjà classé")
    expect(toPdfError(already)).toBe(already)
  })
})

describe("toAnalysisError — séparation PDF (422) / service (502)", () => {
  it("convertit un échec LLM en 502 ANALYSIS_SERVICE_UNAVAILABLE", () => {
    const result = toAnalysisError(new Error("Resume analysis failed: Failed to run GPT-5.5 model"))
    expect(result).toBeInstanceOf(AnalysisServiceError)
    expect(result.status).toBe(502)
    expect(result.code).toBe("ANALYSIS_SERVICE_UNAVAILABLE")
  })

  it("ne déguise pas un PDF chiffré en erreur de service", () => {
    const result = toAnalysisError(new Error("Resume analysis failed: No password given"))
    expect(result).toBeInstanceOf(PdfError)
    expect(result.status).toBe(422)
  })

  it("reconnaît une erreur de borne remontée par un worker", () => {
    const tooLong = new Error("Resume text too long: 90000 characters (max 60000)")
    Object.assign(tooLong, { code: "PDF_TOO_LONG" })
    const result = toAnalysisError(tooLong)
    expect(result).toBeInstanceOf(PdfError)
    expect(result.code).toBe(PDF_ERROR_CODES.TOO_LONG)
  })
})
