import { authorizeAdmin } from "@/server/auth/guard"
import { errorResponse } from "@/server/http"
import { getRepository } from "@/server/storage-init"
import { answerQuestion } from "@/server/llm"
import { MAX_QUESTION_CHARS } from "@/server/limits.js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = authorizeAdmin(request)
  if (!auth.ok) return auth.response

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
  if (question.length > MAX_QUESTION_CHARS) {
    return Response.json({ error: "Question too long" }, { status: 413 })
  }

  try {
    const store = await getRepository()
    const candidate = await store.get(id, auth.auth.ownerId)
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
    return errorResponse("candidate-ask", error)
  }
}
