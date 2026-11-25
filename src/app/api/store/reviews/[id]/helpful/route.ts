import { NextResponse } from "next/server"

import { getPayloadClient } from "@/lib/payload"
import { toggleReviewHelpful } from "@/lib/reviews"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const body = (await req.json().catch(() => null)) as { email?: string } | null
  try {
    const payload = await getPayloadClient()
    const result = await toggleReviewHelpful(payload, id, body?.email || "")
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result)
  } catch (error) {
    console.error("review helpful", error)
    return NextResponse.json({ error: "Could not update this review." }, { status: 500 })
  }
}
