import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import type { Mock } from "vitest"
import { candidateStore } from "@/server/store"
import { resetRateLimits } from "@/server/rate-limit"
import { PDF_ERROR_CODES, PdfError } from "@/server/errors"
import { MAX_BODY_BYTES, MAX_UPLOAD_BYTES } from "@/server/limits.js"
import type { ResumeAnalysis, StructuredResume } from "@/server/types"
import type * as PdfModule from "@/server/pdf"

// `vi.mock` est hissé au-dessus des imports : les fabriques doivent charger leurs
// dépendances dynamiquement (exception documentée au rule « ts-no-dynamic-import »).
vi.mock("@/server/storage-init", async () => {
  const store = await import("@/server/store")
  return { getRepository: async () => store.candidateStore }
})

vi.mock("@/server/pdf", async (importOriginal) => {
  const actual = await importOriginal<typeof PdfModule>()
  return { ...actual, processPDFBuffer: vi.fn() }
})

vi.mock("@/server/workers/comprehensiveResumeAnalyzer", () => ({
  analyzeResume: vi.fn(),
}))

import { POST } from "@/app/api/upload-cv/route"
import { processPDFBuffer } from "@/server/pdf"
import { analyzeResume } from "@/server/workers/comprehensiveResumeAnalyzer"

const processPDFBufferMock = processPDFBuffer as unknown as Mock
const analyzeResumeMock = analyzeResume as unknown as Mock

const STRUCTURED_PROFILE: StructuredResume = {
  name: "Sophie Martin",
  contact: { email: "sophie@exemple.fr", phone: null, location: "Lyon", links: [] },
  skills: ["React"],
  experience: [],
  education: [],
  certifications: [],
  languages: ["français"],
  summary: null,
}

const ANALYSIS: ResumeAnalysis = {
  skills: ["React"],
  experience_years: 6,
  experience_level: "Senior",
  strengths: ["Autonomie"],
  weaknesses: [],
  key_achievements: [],
  overall_score: 87,
  summary: "Bon profil.",
  confidence_score: 0.9,
  industries: ["Tech"],
}

function pdfFile(size = 2048, name = "cv.pdf"): File {
  const bytes = new Uint8Array(size)
  bytes.set(new TextEncoder().encode("%PDF-1.7\n"))
  return new File([bytes], name, { type: "application/pdf" })
}

function uploadRequest(file?: File, { field = "cv" } = {}): Request {
  const form = new FormData()
  if (file) form.append(field, file)
  return new Request("http://test.local/api/upload-cv", { method: "POST", body: form })
}

const ENV = { ...process.env }

beforeEach(async () => {
  await candidateStore.clear()
  resetRateLimits()
  vi.restoreAllMocks()
  processPDFBufferMock.mockReset()
  analyzeResumeMock.mockReset()
  processPDFBufferMock.mockResolvedValue({
    sourceText: "CV texte",
    structuredProfile: STRUCTURED_PROFILE,
  })
  analyzeResumeMock.mockResolvedValue(ANALYSIS)
  delete process.env.ADMIN_TOKEN
  delete process.env.ADMIN_OWNER_ID
})

afterEach(() => {
  process.env = { ...ENV }
})

describe("POST /api/upload-cv — validation de la requête", () => {
  it("rejette une requête sans fichier (400)", async () => {
    const response = await POST(uploadRequest())
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: "No PDF file uploaded" })
  })

  it("rejette un fichier déposé sous un mauvais champ (400)", async () => {
    const response = await POST(uploadRequest(pdfFile(), { field: "resume" }))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: "No PDF file uploaded" })
  })

  it("rejette un MIME non PDF (400)", async () => {
    const notPdf = new File([new Uint8Array(2048)], "cv.txt", { type: "text/plain" })
    const response = await POST(uploadRequest(notPdf))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: "Only PDF files allowed" })
  })

  it("rejette un fichier au-delà de 10 Mo (413)", async () => {
    const response = await POST(uploadRequest(pdfFile(MAX_UPLOAD_BYTES + 1)))
    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({ error: "File too large (max 10 MB)" })
  })

  it("rejette un corps trop gros AVANT de le tamponner (413)", async () => {
    const formData = vi.fn()
    const oversized = {
      headers: new Headers({ "content-length": String(MAX_BODY_BYTES + 1) }),
      formData,
    } as unknown as Request

    const response = await POST(oversized)
    expect(response.status).toBe(413)
    expect(formData).not.toHaveBeenCalled()
  })

  it("rejette une signature non PDF (400)", async () => {
    const notPdf = new File([new Uint8Array(2048).fill(65)], "faux.pdf", {
      type: "application/pdf",
    })
    const response = await POST(uploadRequest(notPdf))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: "Invalid PDF file format" })
  })
})

describe("POST /api/upload-cv — familles d'erreurs", () => {
  it("renvoie 422 PDF_PASSWORD_PROTECTED pour un PDF chiffré", async () => {
    processPDFBufferMock.mockRejectedValue(
      new PdfError(PDF_ERROR_CODES.PASSWORD_PROTECTED, "PDF protégé par mot de passe"),
    )
    const response = await POST(uploadRequest(pdfFile()))
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ code: PDF_ERROR_CODES.PASSWORD_PROTECTED })
  })

  it("renvoie 422 PDF_NO_TEXT pour un PDF sans couche texte", async () => {
    processPDFBufferMock.mockRejectedValue(
      new PdfError(PDF_ERROR_CODES.NO_TEXT, "Aucune couche texte détectée (OCR non pris en charge)"),
    )
    const response = await POST(uploadRequest(pdfFile()))
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ code: PDF_ERROR_CODES.NO_TEXT })
  })

  it("renvoie 422 PDF_CORRUPTED pour un PDF illisible", async () => {
    processPDFBufferMock.mockRejectedValue(
      new PdfError(PDF_ERROR_CODES.CORRUPTED, "PDF illisible ou corrompu"),
    )
    const response = await POST(uploadRequest(pdfFile()))
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ code: PDF_ERROR_CODES.CORRUPTED })
  })

  it("classe un PDF chiffré découvert pendant l'analyse en 422 (pas en 502)", async () => {
    analyzeResumeMock.mockRejectedValue(new Error("Resume analysis failed: No password given"))
    const response = await POST(uploadRequest(pdfFile()))
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ code: PDF_ERROR_CODES.PASSWORD_PROTECTED })
  })

  it("renvoie 502 quand le service d'analyse est indisponible", async () => {
    analyzeResumeMock.mockRejectedValue(new Error("Failed to run GPT-5.5 model: 503"))
    const response = await POST(uploadRequest(pdfFile()))
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ code: "ANALYSIS_SERVICE_UNAVAILABLE" })
  })

  it("renvoie un 500 générique corrélé sans fuite du message interne", async () => {
    const secret = "mongo://user:motdepasse@cluster/interne"
    vi.spyOn(candidateStore, "findByFingerprint").mockRejectedValue(new Error(secret))

    const response = await POST(uploadRequest(pdfFile()))
    expect(response.status).toBe(500)

    const body = (await response.json()) as { error: string; correlationId: string }
    expect(body.correlationId).toMatch(/[0-9a-f-]{36}/)
    expect(JSON.stringify(body)).not.toContain(secret)
    expect(JSON.stringify(body)).not.toContain("motdepasse")
  })
})

describe("POST /api/upload-cv — analyse et persistence", () => {
  it("analyse un CV, expose le mode de stockage et persiste la réponse", async () => {
    const response = await POST(uploadRequest(pdfFile()))
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body).toMatchObject({
      success: true,
      storage: "memory",
      deduplicated: false,
      analysis: { experience_years: 6, experience_level: "Senior", overall_score: 87 },
    })
    expect(body.profile.name).toBe("Sophie Martin")
    expect(await candidateStore.count()).toBe(1)
    expect(analyzeResumeMock).toHaveBeenCalledTimes(1)
  })

  it("déduplique un CV identique sans rappeler le LLM", async () => {
    const first = await POST(uploadRequest(pdfFile(3000, "cv-a.pdf")))
    const firstBody = await first.json()

    const second = await POST(uploadRequest(pdfFile(3000, "copie-du-meme-cv.pdf")))
    const secondBody = await second.json()

    expect(second.status).toBe(200)
    expect(secondBody.deduplicated).toBe(true)
    expect(secondBody.candidateId).toBe(firstBody.candidateId)
    expect(processPDFBufferMock).toHaveBeenCalledTimes(1)
    expect(analyzeResumeMock).toHaveBeenCalledTimes(1)
    expect(await candidateStore.count()).toBe(1)
  })

  it("limite les dépôts par IP (429 puis en-tête Retry-After)", async () => {
    for (let i = 0; i < 5; i += 1) {
      const response = await POST(uploadRequest(pdfFile()))
      expect(response.status).toBe(200)
    }

    const blocked = await POST(uploadRequest(pdfFile()))
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0)
  })
})
