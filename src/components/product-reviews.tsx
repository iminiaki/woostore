"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BadgeCheck, Star } from "lucide-react"

import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import type { ReviewListResponse, ReviewSort, ReviewSummary, ReviewView } from "@/lib/review-types"
import { emptySummary } from "@/lib/review-types"
import { cn } from "@/lib/utils"

const SORTS: { id: ReviewSort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "highest", label: "Highest" },
  { id: "lowest", label: "Lowest" },
  { id: "helpful", label: "Most helpful" },
]

function StarRating({
  value,
  size = "sm",
  onChange,
}: {
  value: number
  size?: "sm" | "md"
  onChange?: (value: number) => void
}) {
  const icon = size === "md" ? "size-6" : "size-4"
  return (
    <span className="inline-flex items-center" role={onChange ? "radiogroup" : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.min(1, Math.max(0, value - (star - 1)))
        const starIcon = (
          <span className={cn("relative inline-flex", icon)}>
            <Star className={cn(icon, "text-muted-foreground/35")} strokeWidth={1.75} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn(icon, "fill-foreground text-foreground")} strokeWidth={1.75} />
            </span>
          </span>
        )
        if (!onChange) return <span key={star}>{starIcon}</span>
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            onClick={() => onChange(star)}
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {starIcon}
          </button>
        )
      })}
    </span>
  )
}

function formatReviewDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
}

function ReviewCard({
  review,
  onHelpful,
  busy,
}: {
  review: ReviewView
  onHelpful?: () => void
  busy?: boolean
}) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{review.authorName}</p>
            {review.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-foreground">
                <BadgeCheck className="size-3.5" />
                Verified purchase
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{formatReviewDate(review.createdAt)}</p>
        </div>
        <StarRating value={review.rating} />
      </div>
      {review.headline ? <h3 className="mt-4 text-sm font-medium">{review.headline}</h3> : null}
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{review.body}</p>
      {onHelpful ? (
        <button
          type="button"
          onClick={onHelpful}
          disabled={busy}
          className={cn(
            "mt-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors",
            review.helpful ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Helpful{review.helpfulCount > 0 ? ` · ${review.helpfulCount}` : ""}
        </button>
      ) : review.helpfulCount > 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">{review.helpfulCount} found this helpful</p>
      ) : null}
    </article>
  )
}

export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth()
  const [sort, setSort] = useState<ReviewSort>("newest")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ReviewListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [writing, setWriting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [helpfulId, setHelpfulId] = useState<number | null>(null)
  const [rating, setRating] = useState(0)
  const [headline, setHeadline] = useState("")
  const [body, setBody] = useState("")

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ sort, page: String(page) })
    if (user?.email) params.set("email", user.email)
    fetch(`/api/store/products/${encodeURIComponent(productId)}/reviews?${params}`)
      .then(async (response) => {
        const json = (await response.json()) as ReviewListResponse & { error?: string }
        if (!response.ok) throw new Error(json.error || "Could not load reviews")
        return json
      })
      .then((next) => {
        if (!cancelled) setData(next)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [productId, sort, page, user?.email])

  const summary: ReviewSummary = data?.summary ?? emptySummary()

  const reload = () => {
    setPage(1)
    setSort("newest")
    setData((current) => current)
    const params = new URLSearchParams({ sort: "newest", page: "1" })
    if (user?.email) params.set("email", user.email)
    return fetch(`/api/store/products/${encodeURIComponent(productId)}/reviews?${params}`)
      .then(async (response) => {
        const json = (await response.json()) as ReviewListResponse & { error?: string }
        if (!response.ok) throw new Error(json.error || "Could not load reviews")
        setData(json)
        setWriting(false)
      })
  }

  const submit = async () => {
    if (!user?.email) return
    setSaving(true)
    try {
      const response = await fetch(`/api/store/products/${encodeURIComponent(productId)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          authorName: [user.firstName, user.lastName].filter(Boolean).join(" "),
          rating,
          headline,
          body,
        }),
      })
      const json = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(json.error || "Could not save the review")
      toast.success({ title: data?.mine ? "Review updated" : "Review published" })
      await reload()
    } catch (error) {
      toast.error({
        title: "Could not save the review",
        description: error instanceof Error ? error.message : "Try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  const markHelpful = async (review: ReviewView) => {
    if (!user?.email) {
      toast.error({ title: "Sign in to mark a review helpful" })
      return
    }
    setHelpfulId(review.id)
    try {
      const response = await fetch(`/api/store/reviews/${review.id}/helpful`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      })
      const json = (await response.json()) as { error?: string; review?: ReviewView }
      if (!response.ok || !json.review) throw new Error(json.error || "Could not update this review")
      setData((current) =>
        current
          ? { ...current, reviews: current.reviews.map((item) => (item.id === review.id ? json.review! : item)) }
          : current,
      )
    } catch (error) {
      toast.error({
        title: "Could not update this review",
        description: error instanceof Error ? error.message : "Try again.",
      })
    } finally {
      setHelpfulId(null)
    }
  }

  return (
    <section id="reviews" className="mt-16 scroll-mt-28 border-t border-border/70 pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Reviews</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary.count === 0 ? "No reviews yet." : `${summary.count} review${summary.count === 1 ? "" : "s"}`}
          </p>
        </div>
        {user ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!writing && data?.mine) {
                setRating(data.mine.rating)
                setHeadline(data.mine.headline)
                setBody(data.mine.body)
              }
              setWriting((open) => !open)
            }}
          >
            {data?.mine ? "Edit your review" : "Write a review"}
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/auth/login">Sign in to review</Link>
          </Button>
        )}
      </div>
      {data?.mine?.status === "hidden" && !writing ? (
        <p className="mt-3 text-sm text-muted-foreground">Your review is hidden. Edit it to publish it again.</p>
      ) : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="rounded-2xl border border-border/70 bg-card p-5">
          <div className="flex items-end gap-3">
            <p className="text-4xl font-semibold tabular-nums tracking-tight">
              {summary.count ? summary.average.toFixed(1) : "—"}
            </p>
            <div className="pb-1">
              <StarRating value={summary.average} />
              <p className="mt-1 text-xs text-muted-foreground">out of 5</p>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = summary.distribution[String(star) as "1" | "2" | "3" | "4" | "5"]
              const width = summary.count ? Math.round((count / summary.count) * 100) : 0
              return (
                <div key={star} className="grid grid-cols-[1.5rem_1fr_1.5rem] items-center gap-2 text-xs">
                  <span className="tabular-nums text-muted-foreground">{star}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-foreground" style={{ width: `${width}%` }} />
                  </span>
                  <span className="text-right tabular-nums text-muted-foreground">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          {writing && user ? (
            <form
              className="space-y-4 rounded-2xl border border-border/70 bg-card p-5"
              onSubmit={(event) => {
                event.preventDefault()
                void submit()
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium">{data?.mine ? "Update your review" : "Your review"}</p>
                <StarRating value={rating} size="md" onChange={setRating} />
              </div>
              {data?.verifiedPurchase ? (
                <p className="text-xs text-muted-foreground">This review will show a verified purchase badge.</p>
              ) : null}
              {data?.mine?.status === "hidden" ? (
                <p className="text-xs text-muted-foreground">This review is hidden. Saving it publishes it again.</p>
              ) : null}
              <Input
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                placeholder="Headline"
                maxLength={120}
              />
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="What should other shoppers know?"
                rows={4}
                maxLength={2000}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setWriting(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || rating < 1}>
                  {saving ? "Saving…" : data?.mine ? "Save changes" : "Publish review"}
                </Button>
              </div>
            </form>
          ) : null}

          {data?.mine && data.mine.status === "published" ? (
            <ReviewCard review={data.mine} />
          ) : null}

          <div className="flex flex-wrap gap-2">
            {SORTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSort(item.id)
                  setPage(1)
                }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  sort === item.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loading && !data ? (
            <div className="h-28 animate-pulse rounded-2xl bg-muted" />
          ) : data && data.reviews.length === 0 && !data.mine ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Be the first to review this product.
            </div>
          ) : (
            data?.reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                busy={helpfulId === review.id}
                onHelpful={() => void markHelpful(review)}
              />
            ))
          )}

          {data && data.pages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                Previous
              </Button>
              <p className="text-xs text-muted-foreground">
                Page {data.page} of {data.pages}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= data.pages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export function ProductRatingLink({ rating, count }: { rating: number; count: number }) {
  return (
    <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
      <StarRating value={rating} />
      <span>{count > 0 ? `${rating.toFixed(1)} · ${count} review${count === 1 ? "" : "s"}` : "No reviews yet"}</span>
    </a>
  )
}
