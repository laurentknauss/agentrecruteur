import { createHash } from "node:crypto"
import { getRepository } from "@/server/storage-init"
import { processPDFBuffer, validatePDFBuffer } from "@/server/pdf"
import { analyzeResume } from "@/server/workers/comprehensiveResumeAnalyzer"
import { toAnalysisError } from "@/server/errors"
import { errorResponse } from "@/server/http"
import { optionalOwnerId } from "@/server/auth/guard"
import { checkRateLimit, clientIp } from "@/server/rate-limit"
import { MAX_BODY_BYTES, MAX_UPLOAD_BYTES, UPLOAD_RATE_LIMIT } from "@/server/limits.js"
import { v4 as uuidv4 } from "uuid"
import fs from "node:fs/promises"
import path from "node:path"
import type { CandidateProfile, ResumeAnalysis, UploadResponse } from "@/server/types"
import type { CandidateRepository } from "@/server/store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// L'analyse complète (structuration + analyse) dépasse la limite par défaut de 10 s.
export const maxDuration = 60

/** Corps de réponse d'upload, partagé entre analyse neuve et déduplication. */
function uploadPayload(
  candidateId: string,
  candidate: CandidateProfile,
  storage: CandidateRepository["backend"],
  deduplicated: boolean,
): UploadResponse {
  return {
    success: true,
    candidateId,
    profile: candidate.profile,
    analysis: {
      skills: candidate.analysis.skills || [],
      experience_years: candidate.analysis.experience_years || 0,
      experience_level: candidate.analysis.experience_level || "Unknown",
      overall_score: candidate.analysis.overall_score || 0,
    },
    storage,
    deduplicated,
  }
}

export async function POST(request: Request) {
  // Pré-contrôle : rejeter un corps trop gros AVANT de le tamponner en mémoire.
  const declaredLength = request.headers.get("content-length")
  if (
    declaredLength !== null &&
    Number.isFinite(Number(declaredLength)) &&
    Number(declaredLength) > MAX_BODY_BYTES
  ) {
    return Response.json(
      { error: `Requête trop volumineuse (maximum ${MAX_BODY_BYTES} octets).` },
      { status: 413 },
    )
  }

  // Amortisseur : quelques dépôts par IP et par heure (un quota par compte viendra ensuite).
  const quota = checkRateLimit(clientIp(request), UPLOAD_RATE_LIMIT)
  if (!quota.allowed) {
    return Response.json(
      { error: "Trop de dépôts de CV depuis cette adresse. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(quota.retryAfterSeconds) } },
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: "Invalid multipart payload" }, { status: 400 })
  }

  const file = form.get("cv")
  if (!(file instanceof File)) {
    return Response.json({ error: "No PDF file uploaded" }, { status: 400 })
  }
  if (!file.type.includes("pdf")) {
    return Response.json({ error: "Only PDF files allowed" }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "File too large (max 10 MB)" }, { status: 413 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const validation = validatePDFBuffer(buffer)
  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 })
  }

  const candidateId = uuidv4()

  try {
    const store = await getRepository()
    const ownerId = optionalOwnerId(request)
    const fingerprint = createHash("sha256").update(buffer).digest("hex")

    // Déduplication : un CV déjà analysé est renvoyé tel quel, sans nouvel appel LLM.
    const existing = await store.findByFingerprint(fingerprint, ownerId)
    if (existing) {
      console.log(`♻️ upload-cv: doublon détecté (${fingerprint.slice(0, 12)}…) → ${existing.id}`)
      return Response.json(uploadPayload(existing.id, existing, store.backend, true))
    }

    // 1) Extraction + structuration
    const { sourceText, structuredProfile } = await processPDFBuffer(buffer, candidateId)

    // 2) Analyse complète via le pipeline worker (nécessite un fichier temporaire)
    const tempDir = path.join(process.cwd(), "temp")
    const tempPath = path.join(tempDir, `${candidateId}.pdf`)
    await fs.mkdir(tempDir, { recursive: true })
    await fs.writeFile(tempPath, buffer)

    let fullAnalysis: ResumeAnalysis
    try {
      fullAnalysis = (await analyzeResume(tempPath)) as ResumeAnalysis
    } catch (analysisError) {
      throw toAnalysisError(analysisError)
    } finally {
      await fs.unlink(tempPath).catch(() => {})
    }

    // 3) Persistance
    const candidate: CandidateProfile = {
      id: candidateId,
      profile: structuredProfile,
      sourceText,
      analysis: fullAnalysis,
      uploadedAt: new Date().toISOString(),
      filename: file.name,
      ownerId,
      fingerprint,
    }

    try {
      await store.set(candidateId, candidate)
    } catch (storageError) {
      throw toAnalysisError(storageError)
    }

    return Response.json(uploadPayload(candidateId, candidate, store.backend, false))
  } catch (error) {
    return errorResponse("upload-cv", error)
  }
}
