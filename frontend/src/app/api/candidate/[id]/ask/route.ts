import { DEMO_ERROR, DEMO_LOCKED, getRepository } from "@/server/storage-init"
import { answerQuestion } from "@/server/llm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (DEMO_LOCKED) {
    return Response.json({ error: DEMO_ERROR }, { status: 403 })
  }

  const { id } = await ctx.params

  let question: string
  try {
    const body = (await request.json()) as { question?: unknown }
    question = typeof body.question === "string" ? body.question : ""
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!question.trim()) {
    return Response.json({ error: "Question is required" }, { status: 400 })
  }

  try {
    const store = await getRepository()
    const candidate = await store.get(id)
    if (!candidate) {
      return Response.json({ error: "Candidate not found" }, { status: 404 })
    }

    const answer = await answerQuestion(question, candidate)

    return Response.json({
      success: true,
      candidateId: id,
      question,
      answer,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Q&A error:", error)
    return Response.json(
      {
        error: "Failed to answer question",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
