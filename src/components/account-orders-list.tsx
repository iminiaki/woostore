"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, FileText, Package, RotateCcw } from "lucide-react"

import { useAuth } from "@/components/auth-context"
import { useCart } from "@/components/cart-store"
import { LogoTraceLoader } from "@/components/LogoTraceLoader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DOCUMENT_KIND_LABEL,
  ORDER_STATUS_LABEL,
  lineToCartProduct,
  type CustomerOrder,
} from "@/lib/customer-order"
import { formatDate, formatMoney } from "@/lib/invoice-format"

function statusVariant(status: CustomerOrder["status"]) {
  if (status === "completed") return "default" as const
  if (status === "cancelled" || status === "failed" || status === "refunded") return "destructive" as const
  return "secondary" as const
}

export function AccountOrdersList() {
  const router = useRouter()
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
        if (!response.ok) throw new Error(data.error || "Could not load orders")
        return data.orders as CustomerOrder[]
      })
      .then((next) => {
        if (!cancelled) setOrders(next)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [user?.email])

  const reorder = (order: CustomerOrder) => {
    for (const line of order.items) {
      dispatch({ type: "add", product: lineToCartProduct(line), quantity: line.quantity })
    }
  }

  if (user?.email && !user.email.includes("@")) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Your Orders</h2>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Orders are kept under the email used at checkout. Sign in with that email to see them.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Your Orders</h2>
      {error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : orders === null ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 p-10">
            <LogoTraceLoader loading size={48} strokeWidth={40} ariaLabel="Loading orders" />
            <p className="text-sm text-muted-foreground">Loading your orders…</p>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-medium">No orders yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Orders placed with {user?.email} show up here.
            </p>
            <Button onClick={() => router.push("/shop")}>Browse products</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => {
            const open = () => router.push(`/profile/orders/${encodeURIComponent(order.orderNumber)}`)
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
                          Order
                        </p>
                      </div>
                      <h3 className="truncate font-mono text-sm font-medium tracking-tight text-foreground">
                        {order.orderNumber}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt, "en")}
                      </p>
                    </div>
                    <Badge
                      variant={statusVariant(order.status)}
                      className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                    >
                      {ORDER_STATUS_LABEL[order.status]}
                    </Badge>
                  </div>

                  <div className="mt-auto flex items-end justify-between gap-3 border-t border-border/60 pt-4">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Total</p>
                      <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">
                        {formatMoney(order.total, order.currency, "en")}
                      </p>
                    </div>
                    <p className="pb-1 text-xs text-muted-foreground">
                      {itemCount} {itemCount === 1 ? "item" : "items"}
                    </p>
                  </div>

                  <div
                    className="grid grid-cols-2 gap-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Button variant="default" size="sm" onClick={open}>
                      <ArrowUpRight className="size-3.5" />
                      Details
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => reorder(order)}>
                      <RotateCcw className="size-3.5" />
                      Reorder
                    </Button>
                    {primaryDoc ? (
                      <Button variant="outline" size="sm" className="col-span-2" asChild>
                        <a href={primaryDoc.href || "#"} target="_blank" rel="noreferrer">
                          <FileText className="size-3.5" />
                          {DOCUMENT_KIND_LABEL[primaryDoc.kind]}
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
