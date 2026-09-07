import { describe, it, expect } from "vitest"
import { validatePDFBuffer } from "@/server/pdf"

const HEADER = Buffer.from("%PDF-1.7\n")
const MAX = 10 * 1024 * 1024

function pdfOfSize(extra: number, header: Buffer = HEADER): Buffer {
  return Buffer.concat([header, Buffer.alloc(extra, " ")])
}

describe("validatePDFBuffer — edge cases", () => {
  it("rejette un buffer vide", () => {
    const r = validatePDFBuffer(Buffer.alloc(0))
    expect(r.valid).toBe(false)
    expect(r.error).toBe("Empty file buffer")
  })

  it("rejette un buffer undefined/null (sécurité)", () => {
    const r = validatePDFBuffer(undefined as unknown as Buffer)
    expect(r.valid).toBe(false)
    expect(r.error).toBe("Empty file buffer")
  })

  it("rejette une signature non-PDF", () => {
    const notPdf = pdfOfSize(2048, Buffer.from("ABCD-not-a-pdf"))
    const r = validatePDFBuffer(notPdf)
    expect(r.valid).toBe(false)
    expect(r.error).toBe("Invalid PDF file format")
  })

  it("rejette un PDF trop petit (< 1024 octets)", () => {
    const tiny = pdfOfSize(500)
    const r = validatePDFBuffer(tiny)
    expect(r.valid).toBe(false)
    expect(r.error).toBe("PDF file too small")
  })

  it("accepte un PDF à la limite basse (>= 1024 octets)", () => {
    const r = validatePDFBuffer(pdfOfSize(1024))
    expect(r.valid).toBe(true)
  })

  it("accepte un PDF de taille normale", () => {
    const r = validatePDFBuffer(pdfOfSize(4096))
    expect(r.valid).toBe(true)
  })

  it("rejette un PDF au-delà de 10 Mo", () => {
    const big = pdfOfSize(MAX + 64)
    const r = validatePDFBuffer(big)
    expect(r.valid).toBe(false)
    expect(r.error).toBe("PDF file too large (max 10MB)")
  })

  it("accepte un PDF exactement à 10 Mo (limite haute)", () => {
    // %PDF (7) + remplissage : total = MAX (bordures arrondies)
    const exact = pdfOfSize(MAX - HEADER.length)
    const r = validatePDFBuffer(exact)
    expect(r.valid).toBe(true)
  })

  it("ne fait jamais de crash sur des signatures partielles", () => {
    // "%P" seul (3 octets) → signature invalide (vérifiée avant la taille)
    const r = validatePDFBuffer(Buffer.from("%P"))
    expect(r.valid).toBe(false)
    expect(r.error).toBe("Invalid PDF file format")
  })
})
