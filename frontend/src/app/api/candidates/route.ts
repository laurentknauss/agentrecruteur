import { getRepository } from "@/server/storage-init"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const store = await getRepository()
  const candidates = await store.listSummary()
  return Response.json({ candidates })
}
