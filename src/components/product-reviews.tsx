"use client"

import { useEffect, useState } from "react"
import { LocaleLink as Link } from "@/components/locale-link"
import { BadgeCheck, Star } from "lucide-react"

import { useAuth } from "@/components/auth-context"
import { useI18n } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { formatLocaleNumber } from "@/i18n/languages"
import type { MessageKey } from "@/i18n/messages"
import { formatDate } from "@/lib/invoice-format"
import type { ReviewListResponse, ReviewSort, ReviewSummary, ReviewView } from "@/lib/review-types"
import { emptySummary } from "@/lib/review-types"
import { cn } from "@/lib/utils"

const SORTS: { id: ReviewSort; label: MessageKey }[] = [
  { id: "newest", label: "review.sort.newest" },
  { id: "highest", label: "review.sort.highest" },
  { id: "lowest", label: "review.sort.lowest" },
  { id: "helpful", label: "review.sort.helpful" },
]

function reviewLang(code: string) {
  return code.toLowerCase().startsWith("fa") ? "fa" : "en"
}

function StarRating({
  value,
  size = "sm",
  onChange,
}: {
  value: number
  size?: "sm" | "md"
  onChange?: (value: number) => void
}) {
  const { t, active } = useI18n()
  const icon = size === "md" ? "size-6" : "size-4"
  return (
    <span className="inline-flex items-center" role={onChange ? "radiogroup" : undefined} aria-label={t("review.rating")}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.min(1, Math.max(0, value - (star - 1)))
        const starIcon = (
          <span className={cn("relative inline-flex", icon)}>
            <Star className={cn(icon, "text-muted-foreground/35")} strokeWidth={1.75} />
            <span className="absolute inset-y-0 start-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star
                className={cn(icon, "absolute start-0 top-0 fill-foreground text-foreground")}
                strokeWidth={1.75}
              />
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
            aria-label={t(star === 1 ? "review.star" : "review.stars", {
              n: formatLocaleNumber(star, active.code),
            })}
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

function formatReviewDate(value: string, code: string) {
  return formatDate(value, reviewLang(code))
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
  const { t, active } = useI18n()
  const helpful = formatLocaleNumber(review.helpfulCount, active.code)
  return (
    <article className="rounded-2xl border border-border/70 bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{review.authorName}</p>
            {review.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-foreground">
                <BadgeCheck className="size-3.5" />
                {t("review.verified")}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{formatReviewDate(review.createdAt, active.code)}</p>
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
          {t("review.helpful")}
          {review.helpfulCount > 0 ? ` · ${helpful}` : ""}
        </button>
      ) : review.helpfulCount > 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          {t("review.helpfulCount", { count: helpful })}
        </p>
      ) : null}
    </article>
  )
}

export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth()
  const { t, active } = useI18n()
  const n = (value: number, options?: Intl.NumberFormatOptions) =>
    formatLocaleNumber(value, active.code, options)
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
      toast.success({ title: data?.mine ? t("review.updated") : t("review.saved") })
      await reload()
    } catch (error) {
      toast.error({
        title: t("review.saveFailed"),
        description: error instanceof Error ? error.message : t("review.tryAgain"),
      })
    } finally {
      setSaving(false)
    }
  }

  const markHelpful = async (review: ReviewView) => {
    if (!user?.email) {
      toast.error({ title: t("review.signInHelpful") })
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
        title: t("review.updateFailed"),
        description: error instanceof Error ? error.message : t("review.tryAgain"),
      })
    } finally {
      setHelpfulId(null)
    }
  }

  return (
    <section id="reviews" className="mt-16 scroll-mt-28 border-t border-border/70 pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("review.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary.count === 0
              ? t("review.none")
              : t(summary.count === 1 ? "review.countOne" : "review.count", {
                  count: n(summary.count),
                })}
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
            {data?.mine ? t("review.edit") : t("review.write")}
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/auth/login">{t("review.signIn")}</Link>
          </Button>
        )}
      </div>
      {data?.mine?.status === "hidden" && !writing ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("review.hidden")}</p>
      ) : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="rounded-2xl border border-border/70 bg-card p-5">
          <div className="flex items-end gap-3">
            <p className="text-6xl font-semibold tabular-nums tracking-tight">
              {summary.count
                ? n(summary.average, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                : "—"}
            </p>
            <div className="pb-1">
              <StarRating value={summary.average} />
              <p className="mt-1 text-xs text-muted-foreground">{t("review.outOf")}</p>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = summary.distribution[String(star) as "1" | "2" | "3" | "4" | "5"]
              const width = summary.count ? Math.round((count / summary.count) * 100) : 0
              return (
                <div key={star} className="grid grid-cols-[1.5rem_1fr_1.5rem] items-center gap-2 text-xs">
                  <span className="tabular-nums text-muted-foreground">{n(star)}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-foreground" style={{ width: `${width}%` }} />
                  </span>
                  <span className="text-end tabular-nums text-muted-foreground">{n(count)}</span>
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
                <p className="text-sm font-medium">{data?.mine ? t("review.update") : t("review.yours")}</p>
                <StarRating value={rating} size="md" onChange={setRating} />
              </div>
              {data?.verifiedPurchase ? (
                <p className="text-xs text-muted-foreground">{t("review.verifiedNote")}</p>
              ) : null}
              {data?.mine?.status === "hidden" ? (
                <p className="text-xs text-muted-foreground">{t("review.hiddenNote")}</p>
              ) : null}
              <Input
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                placeholder={t("review.headline")}
                maxLength={120}
              />
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={t("review.body")}
                rows={4}
                maxLength={2000}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setWriting(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={saving || rating < 1}>
                  {saving ? t("common.saving") : data?.mine ? t("common.save") : t("review.publish")}
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
                {t(item.label)}
              </button>
            ))}
          </div>

          {loading && !data ? (
            <div className="h-28 animate-pulse rounded-2xl bg-muted" />
          ) : data && data.reviews.length === 0 && !data.mine ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {t("review.first")}
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
                {t("common.previous")}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t("common.page", { page: n(data.page), pages: n(data.pages) })}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= data.pages}
                onClick={() => setPage((current) => current + 1)}
              >
                {t("common.next")}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export function ProductRatingLink({ rating, count }: { rating: number; count: number }) {
  const { t, active } = useI18n()
  const n = (value: number, options?: Intl.NumberFormatOptions) =>
    formatLocaleNumber(value, active.code, options)
  return (
    <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
      <StarRating value={rating} />
      <span>
        {count > 0
          ? `${n(rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} · ${t(
              count === 1 ? "review.countOne" : "review.count",
              { count: n(count) },
            )}`
          : t("review.none")}
      </span>
    </a>
  )
}
