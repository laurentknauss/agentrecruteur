import { authorizeAdmin } from "@/server/auth/guard"
import { errorResponse } from "@/server/http"
import { getRepository } from "@/server/storage-init"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const auth = authorizeAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const store = await getRepository()
    const candidates = await store.listSummary(auth.auth.ownerId)
    return Response.json({ candidates })
  } catch (error) {
    return errorResponse("candidates-list", error)
  }
}
