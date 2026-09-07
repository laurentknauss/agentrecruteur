import { DEMO_ERROR, DEMO_LOCKED, getRepository } from "@/server/storage-init"
import { processPDFBuffer, validatePDFBuffer } from "@/server/pdf"
import { analyzeResume } from "@/server/workers/comprehensiveResumeAnalyzer"
import { v4 as uuidv4 } from "uuid"
import fs from "node:fs/promises"
import path from "node:path"
import type { CandidateProfile, ResumeAnalysis } from "@/server/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_SIZE = 10 * 1024 * 1024 // 10 Mo

export async function POST(request: Request) {
  if (DEMO_LOCKED) {
    return Response.json({ error: DEMO_ERROR }, { status: 403 })
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
  if (file.size > MAX_SIZE) {
    return Response.json({ error: "File too large (max 10 MB)" }, { status: 413 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    const validation = validatePDFBuffer(buffer)
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 })
    }

    const candidateId = uuidv4()

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
    } finally {
      await fs.unlink(tempPath).catch(() => {})
    }

    // 3) Persistance
    const store = await getRepository()
    const candidate: CandidateProfile = {
      id: candidateId,
      profile: structuredProfile,
      sourceText,
      analysis: fullAnalysis,
      uploadedAt: new Date().toISOString(),
      filename: file.name,
    }
    await store.set(candidateId, candidate)

    return Response.json({
      success: true,
      candidateId,
      profile: structuredProfile,
      analysis: {
        skills: fullAnalysis.skills || [],
        experience_years: fullAnalysis.experience_years || 0,
        experience_level: fullAnalysis.experience_level || "Unknown",
        overall_score: fullAnalysis.overall_score || 0,
      },
    })
  } catch (error) {
    console.error("❌ Upload error:", error)
    return Response.json(
      {
        error: "Failed to process CV",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
