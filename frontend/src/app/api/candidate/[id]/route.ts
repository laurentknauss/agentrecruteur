import { getRepository } from "@/server/storage-init"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const store = await getRepository()
  const candidate = await store.get(id)

  if (!candidate) {
    return Response.json({ error: "Candidate not found" }, { status: 404 })
  }
  return Response.json(candidate)
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const store = await getRepository()
  const deleted = await store.delete(id)

  if (!deleted) {
    return Response.json({ error: "Candidate not found" }, { status: 404 })
  }
  return Response.json({ success: true, message: `Candidate ${id} deleted` })
}
