import { NextResponse } from "next/server"

import { getPayloadClient } from "@/lib/payload"
import { loadProductReviews, parseReviewSort, saveProductReview } from "@/lib/reviews"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  const url = new URL(req.url)
  const page = Number(url.searchParams.get("page") || "1")
  const email = url.searchParams.get("email") || ""
  try {
    const payload = await getPayloadClient()
    const result = await loadProductReviews(payload, id, {
      email,
      sort: parseReviewSort(url.searchParams.get("sort")),
      page: Number.isFinite(page) ? page : 1,
    })
    if (!result) return NextResponse.json({ error: "Product not found." }, { status: 404 })
    return NextResponse.json(result)
  } catch (error) {
    console.error("product reviews", error)
    return NextResponse.json({ error: "Could not load reviews." }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const body = (await req.json().catch(() => null)) as {
    email?: string
    authorName?: string
    rating?: number
    headline?: string
    body?: string
  } | null
  if (!body) return NextResponse.json({ error: "Review details are required." }, { status: 400 })

  try {
    const payload = await getPayloadClient()
    const result = await saveProductReview(payload, id, {
      email: body.email || "",
      authorName: body.authorName || "",
      rating: Number(body.rating),
      headline: body.headline || "",
      body: body.body || "",
    })
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result, { status: result.created ? 201 : 200 })
  } catch (error) {
    console.error("save product review", error)
    return NextResponse.json({ error: "Could not save the review." }, { status: 500 })
  }
}
