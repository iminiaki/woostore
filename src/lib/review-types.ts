export type ReviewSort = "newest" | "highest" | "lowest" | "helpful"

export type ReviewView = {
  id: number
  authorName: string
  rating: number
  headline: string
  body: string
  verified: boolean
  helpfulCount: number
  helpful: boolean
  createdAt: string
  status: "published" | "hidden"
}

export type ReviewSummary = {
  average: number
  count: number
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>
}

export type ReviewListResponse = {
  summary: ReviewSummary
  mine: ReviewView | null
  verifiedPurchase: boolean
  reviews: ReviewView[]
  page: number
  pages: number
  total: number
}

export const emptySummary = (): ReviewSummary => ({
  average: 0,
  count: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
})
