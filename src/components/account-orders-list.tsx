"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, FileText, Package, RotateCcw } from "lucide-react"

import { useAuth } from "@/components/auth-context"
import { useI18n } from "@/components/locale-provider"
import { useCart } from "@/components/cart-store"
import { LogoTraceLoader } from "@/components/LogoTraceLoader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatLocaleNumber } from "@/i18n/languages"
import type { MessageKey } from "@/i18n/messages"
import {
  lineToCartProduct,
  type CustomerOrder,
  type CustomerOrderDocument,
  type CustomerOrderStatus,
} from "@/lib/customer-order"
import { StoreMoney } from "@/components/store-money"
import { documentHrefForLocale, formatDate } from "@/lib/invoice-format"

function invoiceLang(code: string) {
  return code.toLowerCase().startsWith("fa") ? "fa" : "en"
}

function statusKey(status: CustomerOrderStatus): MessageKey {
  return `status.${status}` as MessageKey
}

function docKey(kind: CustomerOrderDocument["kind"]): MessageKey {
  return kind === "invoice" ? "doc.invoice" : "doc.proforma"
}

function statusVariant(status: CustomerOrder["status"]) {
  if (status === "completed") return "default" as const
  if (status === "cancelled" || status === "failed" || status === "refunded") return "destructive" as const
  return "secondary" as const
}

export function AccountOrdersList() {
  const router = useRouter()
  const { localize, t, active } = useI18n()
  const lang = invoiceLang(active.code)
  const countLabel = (count: number) =>
    t(count === 1 ? "orders.item" : "orders.items", {
      count: formatLocaleNumber(count, active.code),
    })
  const { user } = useAuth()
  const { dispatch } = useCart()
  const [orders, setOrders] = useState<CustomerOrder[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.email) return
    let cancelled = false
    setOrders(null)
    setError(null)
    fetch(`/api/store/account/orders?email=${encodeURIComponent(user.email)}`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error("load")
        return data.orders as CustomerOrder[]
      })
      .then((next) => {
        if (!cancelled) setOrders(next)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(t("orders.loadFailed"))
      })
    return () => {
      cancelled = true
    }
  }, [user?.email, t])

  const reorder = (order: CustomerOrder) => {
    for (const line of order.items) {
      dispatch({ type: "add", product: lineToCartProduct(line), quantity: line.quantity })
    }
  }

  if (user?.email && !user.email.includes("@")) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{t("orders.title")}</h2>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">{t("orders.emailOnly")}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t("orders.title")}</h2>
      {error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : orders === null ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 p-10">
            <LogoTraceLoader loading size={48} strokeWidth={40} ariaLabel={t("orders.loading")} />
            <p className="text-sm text-muted-foreground">{t("orders.loading")}</p>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-medium">{t("orders.empty")}</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {user?.email ? t("orders.forEmail", { email: user.email }) : t("orders.emptyHint")}
            </p>
            <Button onClick={() => router.push(localize("/shop"))}>{t("profile.browse")}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => {
            const open = () => router.push(localize(`/profile/orders/${encodeURIComponent(order.orderNumber)}`))
            // Prefer the official invoice once it exists; otherwise the live pre-invoice.
            const primaryDoc =
              order.documents.find((doc) => doc.kind === "invoice" && doc.href && doc.status !== "void") ||
              order.documents.find(
                (doc) => doc.kind === "proforma" && doc.href && doc.status === "issued",
              ) ||
              null
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
            const isDone = order.status === "completed"
            const isBad =
              order.status === "cancelled" ||
              order.status === "failed" ||
              order.status === "refunded"
            return (
              <article
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={open}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    open()
                  }
                }}
                className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-[0_12px_28px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:shadow-[0_1px_0_rgba(255,255,255,0.04)] dark:hover:shadow-[0_16px_36px_rgba(0,0,0,0.35)]"
              >
                <div className="flex flex-1 flex-col gap-5 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className={
                            isBad
                              ? "size-2 shrink-0 rounded-full bg-destructive"
                              : isDone
                                ? "size-2 shrink-0 rounded-full bg-foreground"
                                : "size-2 shrink-0 rounded-full bg-foreground/35"
                          }
                        />
                        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                          {t("orders.order")}
                        </p>
                      </div>
                      <h3 className="truncate font-mono text-sm font-medium tracking-tight text-foreground">
                        {order.orderNumber}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt, lang)}
                      </p>
                    </div>
                    <Badge
                      variant={statusVariant(order.status)}
                      className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                    >
                      {t(statusKey(order.status))}
                    </Badge>
                  </div>

                  <div className="mt-auto flex items-end justify-between gap-3 border-t border-border/60 pt-4">
                    <div>
                      <p className="text-[11px] text-muted-foreground">{t("cart.total")}</p>
                      <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">
                        <StoreMoney
                          amount={order.total}
                          currency={order.currency === "irt" ? "IRT" : "USD"}
                          locale={active.code}
                        />
                      </p>
                    </div>
                    <p className="pb-1 text-xs text-muted-foreground">{countLabel(itemCount)}</p>
                  </div>

                  <div
                    className="grid grid-cols-2 gap-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Button variant="default" size="sm" onClick={open}>
                      <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
                      {t("orders.details")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => reorder(order)}>
                      <RotateCcw className="size-3.5" />
                      {t("orders.reorder")}
                    </Button>
                    {primaryDoc ? (
                      <Button variant="outline" size="sm" className="col-span-2" asChild>
                        <a
                          href={primaryDoc.href ? documentHrefForLocale(primaryDoc.href, active.code) : "#"}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FileText className="size-3.5" />
                          {t(docKey(primaryDoc.kind))}
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
