import { authorizeAdmin } from "@/server/auth/guard"
import { errorResponse } from "@/server/http"
import { getRepository } from "@/server/storage-init"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = authorizeAdmin(request)
  if (!auth.ok) return auth.response

  const { id } = await ctx.params

  try {
    const store = await getRepository()
    const candidate = await store.get(id, auth.auth.ownerId)

    if (!candidate) {
      return Response.json({ error: "Candidate not found" }, { status: 404 })
    }
    return Response.json(candidate)
  } catch (error) {
    return errorResponse("candidate-get", error)
  }
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = authorizeAdmin(request)
  if (!auth.ok) return auth.response

  const { id } = await ctx.params

  try {
    const store = await getRepository()
    const deleted = await store.delete(id, auth.auth.ownerId)

    if (!deleted) {
      return Response.json({ error: "Candidate not found" }, { status: 404 })
    }
    return Response.json({ success: true, message: `Candidate ${id} deleted` })
  } catch (error) {
    return errorResponse("candidate-delete", error)
  }
}
