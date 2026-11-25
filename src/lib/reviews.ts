import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Payload, PayloadRequest } from "payload"

import type { ReviewSort, ReviewSummary, ReviewView } from "@/lib/review-types"
import { emptySummary } from "@/lib/review-types"

const PAGE_SIZE = 5
const PURCHASE_STATUSES = ["pending", "processing", "on-hold", "completed"]

type ReviewDoc = {
  id: number
  product?: number | { id?: number | null } | null
  email?: string | null
  authorName?: string | null
  rating?: number | null
  headline?: string | null
  body?: string | null
  status?: "published" | "hidden" | null
  verified?: boolean | null
  helpfulCount?: number | null
  helpfulEmails?: string[] | null
  createdAt: string
}

export function relationId(value: unknown): number | string | null {
  if (typeof value === "number" || typeof value === "string") return value
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: number | string | null }).id
    return id ?? null
  }
  return null
}

export function normalizeReviewEmail(email: string) {
  return email.trim().toLowerCase()
}

function authorLabel(name: string, email: string) {
  const trimmed = name.trim()
  if (trimmed) return trimmed.slice(0, 80)
  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim()
  return local || "Customer"
}

export function toReviewView(doc: ReviewDoc, email = ""): ReviewView {
  const helpfulEmails = (doc.helpfulEmails || []).map((item) => item.toLowerCase())
  return {
    id: doc.id,
    authorName: doc.authorName || "Customer",
    rating: Number(doc.rating || 0),
    headline: doc.headline || "",
    body: doc.body || "",
    verified: Boolean(doc.verified),
    helpfulCount: Number(doc.helpfulCount || 0),
    helpful: email ? helpfulEmails.includes(email) : false,
    createdAt: doc.createdAt,
    status: doc.status === "hidden" ? "hidden" : "published",
  }
}

async function resolveProductId(payload: Payload, idOrSlug: string) {
  const numeric = /^\d+$/.test(idOrSlug) ? Number(idOrSlug) : null
  const found = await payload.find({
    collection: "products",
    where: numeric != null ? { id: { equals: numeric } } : { slug: { equals: idOrSlug } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  const id = found.docs[0]?.id
  return id == null ? null : id
}

export async function customerBoughtProduct(payload: Payload, email: string, productId: number | string) {
  const orders = await payload.find({
    collection: "orders",
    where: {
      and: [{ email: { equals: email } }, { status: { in: PURCHASE_STATUSES } }],
    },
    depth: 0,
    limit: 100,
    overrideAccess: true,
  })
  const wanted = String(productId)
  return orders.docs.some((order) => {
    const items = Array.isArray(order.items) ? order.items : []
    return items.some((item) => String(relationId(item?.product) ?? "") === wanted)
  })
}

async function publishedReviews(payload: Payload, productId: number | string, req?: PayloadRequest) {
  const docs: ReviewDoc[] = []
  let page = 1
  let pages = 1
  while (page <= pages && docs.length < 2000) {
    const result = await payload.find({
      collection: "reviews",
      where: {
        and: [{ product: { equals: productId } }, { status: { equals: "published" } }],
      },
      depth: 0,
      limit: 200,
      page,
      overrideAccess: true,
      req,
    })
    docs.push(...(result.docs as ReviewDoc[]))
    pages = result.totalPages || 1
    page += 1
  }
  return docs
}

export function summarizeReviews(docs: ReviewDoc[]): ReviewSummary {
  const summary = emptySummary()
  if (!docs.length) return summary
  let total = 0
  for (const doc of docs) {
    const rating = Math.min(5, Math.max(1, Math.round(Number(doc.rating || 0)))) as 1 | 2 | 3 | 4 | 5
    summary.distribution[String(rating) as "1" | "2" | "3" | "4" | "5"] += 1
    total += Number(doc.rating || 0)
  }
  summary.count = docs.length
  summary.average = Math.round((total / docs.length) * 10) / 10
  return summary
}

export async function syncProductRating(payload: Payload, productId: number | string, req?: PayloadRequest) {
  const docs = await publishedReviews(payload, productId, req)
  const summary = summarizeReviews(docs)
  await payload.update({
    collection: "products",
    id: productId,
    data: { rating: summary.average, reviewCount: summary.count },
    overrideAccess: true,
    depth: 0,
    req,
  })
}

const sortMap: Record<ReviewSort, string> = {
  newest: "-createdAt",
  highest: "-rating",
  lowest: "rating",
  helpful: "-helpfulCount",
}

export function parseReviewSort(value: string | null): ReviewSort {
  if (value === "highest" || value === "lowest" || value === "helpful" || value === "newest") return value
  return "newest"
}

export async function loadProductReviews(
  payload: Payload,
  idOrSlug: string,
  options: { email?: string; sort?: ReviewSort; page?: number },
) {
  const productId = await resolveProductId(payload, idOrSlug)
  if (productId == null) return null
  const email = options.email ? normalizeReviewEmail(options.email) : ""
  const page = Math.max(1, options.page || 1)
  const sort = options.sort || "newest"

  const published = await publishedReviews(payload, productId)
  const summary = summarizeReviews(published)

  const mineResult = email
    ? await payload.find({
        collection: "reviews",
        where: {
          and: [{ product: { equals: productId } }, { email: { equals: email } }],
        },
        depth: 0,
        limit: 1,
        overrideAccess: true,
      })
    : null
  const mineDoc = (mineResult?.docs[0] as ReviewDoc | undefined) ?? null

  const where = {
    and: [
      { product: { equals: productId } },
      { status: { equals: "published" } },
      ...(email ? [{ email: { not_equals: email } }] : []),
    ],
  }
  const list = await payload.find({
    collection: "reviews",
    where,
    sort: sortMap[sort],
    page,
    limit: PAGE_SIZE,
    depth: 0,
    overrideAccess: true,
  })

  return {
    summary,
    mine: mineDoc ? toReviewView(mineDoc, email) : null,
    verifiedPurchase: email ? await customerBoughtProduct(payload, email, productId) : false,
    reviews: (list.docs as ReviewDoc[]).map((doc) => toReviewView(doc, email)),
    page: list.page || page,
    pages: list.totalPages || 1,
    total: list.totalDocs || 0,
  }
}

export async function saveProductReview(
  payload: Payload,
  idOrSlug: string,
  input: { email: string; authorName: string; rating: number; headline: string; body: string },
) {
  const productId = await resolveProductId(payload, idOrSlug)
  if (productId == null) return { error: "Product not found.", status: 404 as const }

  const email = normalizeReviewEmail(input.email)
  if (!email.includes("@")) return { error: "Sign in with an email to review this product.", status: 400 as const }

  const rating = Math.round(Number(input.rating))
  if (rating < 1 || rating > 5) return { error: "Choose a star rating from 1 to 5.", status: 400 as const }

  const body = input.body.trim()
  if (body.length < 8) return { error: "Write at least a short note about the product.", status: 400 as const }
  if (body.length > 2000) return { error: "Keep the review under 2000 characters.", status: 400 as const }

  const headline = input.headline.trim().slice(0, 120)
  const authorName = authorLabel(input.authorName, email)
  const verified = await customerBoughtProduct(payload, email, productId)
  const productEmail = `${productId}:${email}`

  const existing = await payload.find({
    collection: "reviews",
    where: { productEmail: { equals: productEmail } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  const current = existing.docs[0]

  const data = {
    product: productId,
    email,
    authorName,
    rating,
    headline,
    body,
    verified,
    status: "published" as const,
    productEmail,
  }

  const saved = current
    ? await payload.update({
        collection: "reviews",
        id: current.id,
        data,
        overrideAccess: true,
        depth: 0,
      })
    : await payload.create({
        collection: "reviews",
        data: { ...data, helpfulCount: 0, helpfulEmails: [] },
        overrideAccess: true,
        depth: 0,
      })

  return { review: toReviewView(saved as ReviewDoc, email), created: !current }
}

export async function toggleReviewHelpful(payload: Payload, reviewId: string, emailRaw: string) {
  const email = normalizeReviewEmail(emailRaw)
  if (!email.includes("@")) return { error: "Sign in to mark a review helpful.", status: 400 as const }
  if (!/^\d+$/.test(reviewId)) return { error: "Review not found.", status: 404 as const }

  let doc: ReviewDoc
  try {
    doc = (await payload.findByID({
      collection: "reviews",
      id: Number(reviewId),
      depth: 0,
      overrideAccess: true,
    })) as ReviewDoc
  } catch {
    return { error: "Review not found.", status: 404 as const }
  }
  if (doc.status === "hidden") return { error: "Review not found.", status: 404 as const }
  if (normalizeReviewEmail(doc.email || "") === email) {
    return { error: "You can’t mark your own review helpful.", status: 400 as const }
  }

  const current = new Set((doc.helpfulEmails || []).map((item) => item.toLowerCase()))
  if (current.has(email)) current.delete(email)
  else current.add(email)
  const helpfulEmails = [...current]

  const saved = (await payload.update({
    collection: "reviews",
    id: doc.id,
    data: { helpfulEmails, helpfulCount: helpfulEmails.length },
    overrideAccess: true,
    depth: 0,
  })) as ReviewDoc

  return { review: toReviewView(saved, email) }
}

function reviewChangesRating(doc: ReviewDoc, previousDoc?: ReviewDoc | null) {
  if (!previousDoc) return true
  return (
    previousDoc.status !== doc.status ||
    Number(previousDoc.rating) !== Number(doc.rating) ||
    String(relationId(previousDoc.product) ?? "") !== String(relationId(doc.product) ?? "")
  )
}

async function syncChangedProducts(
  payload: Payload,
  req: PayloadRequest,
  nextProduct: unknown,
  previousProduct?: unknown,
) {
  const ids = new Set<number | string>()
  const next = relationId(nextProduct)
  const previous = relationId(previousProduct)
  if (next != null) ids.add(next)
  if (previous != null) ids.add(previous)
  for (const id of ids) {
    await syncProductRating(payload, id, req)
  }
}

export const syncReviewStats: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  if (!reviewChangesRating(doc as ReviewDoc, previousDoc as ReviewDoc | undefined)) return doc
  await syncChangedProducts(req.payload, req, doc.product, previousDoc?.product)
  return doc
}

export const syncReviewStatsAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await syncChangedProducts(req.payload, req, doc.product)
  return doc
}
