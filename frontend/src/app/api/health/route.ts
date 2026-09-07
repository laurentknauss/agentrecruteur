import { getRepository } from "@/server/storage-init"

export const runtime = "nodejs"

export async function GET() {
  try {
    const store = await getRepository()
    return Response.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      storage: store.backend,
      candidatesCount: await store.count(),
    })
  } catch (error) {
    return Response.json(
      { status: "ERROR", error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
