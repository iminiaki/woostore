"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams } from "next/navigation"
import { ArrowLeft, FileText, RotateCcw } from "lucide-react"

import { useAuth } from "@/components/auth-context"
import { useCart } from "@/components/cart-store"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { LogoTraceLoader } from "@/components/LogoTraceLoader"
import { OrderProcessTrace } from "@/components/order-process-trace"
import { PageShell } from "@/components/page-shell"
import { ProtectedRoute } from "@/components/protected-route"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DOCUMENT_KIND_LABEL,
  DOCUMENT_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  lineToCartProduct,
  paymentLabel,
  type CustomerOrder,
  type CustomerOrderAddress,
} from "@/lib/customer-order"
import { formatDate, formatMoney } from "@/lib/invoice-format"
import { cn } from "@/lib/utils"

const sectionTitleClass = "text-base font-semibold tracking-tight"

function statusVariant(status: CustomerOrder["status"]) {
  if (status === "completed") return "default" as const
  if (status === "cancelled" || status === "failed" || status === "refunded") return "destructive" as const
  return "secondary" as const
}

function Section({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_0_rgba(0,0,0,0.04)] sm:p-6 dark:shadow-[0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
    >
      <h2 className={sectionTitleClass}>{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function AddressBlock({ title, address }: { title: string; address: CustomerOrderAddress }) {
  const place = [address.address1, address.address2].filter(Boolean).join(", ")
  const cityLine = [address.city, address.state, address.postcode].filter(Boolean).join(", ")
  const lines = [address.name, place, cityLine, address.country, address.phone, address.email].filter(Boolean)
  return (
    <div className="rounded-xl bg-muted/40 p-4">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {lines.length ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {lines.map((line) => (
            <span key={line} dir="auto" className="block">
              {line}
            </span>
          ))}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No address on this order.</p>
      )}
    </div>
  )
}

function OrderDetail() {
  const params = useParams<{ orderNumber: string }>()
  const orderNumber = decodeURIComponent(params.orderNumber || "")
  const { user } = useAuth()
  const { dispatch } = useCart()
  const [order, setOrder] = useState<CustomerOrder | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.email || !orderNumber) return
    let cancelled = false
    setOrder(null)
    setError(null)
    fetch(
      `/api/store/account/orders/${encodeURIComponent(orderNumber)}?email=${encodeURIComponent(user.email)}`,
    )
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Order not found")
        return data.order as CustomerOrder
      })
      .then((next) => {
        if (!cancelled) setOrder(next)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [user?.email, orderNumber])

  const reorder = () => {
    if (!order) return
    for (const line of order.items) {
      dispatch({ type: "add", product: lineToCartProduct(line), quantity: line.quantity })
    }
  }

  const invoice = order?.documents.find((doc) => doc.kind === "invoice" && doc.status !== "void")
  const preInvoice = order?.documents.find((doc) => doc.kind === "proforma")
  const itemCount = order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0

  return (
    <PageShell className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Profile", href: "/profile?tab=orders" },
          { label: "Orders", href: "/profile?tab=orders" },
          { label: order?.orderNumber || orderNumber || "Order" },
        ]}
      />

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2 h-8 text-muted-foreground" asChild>
            <Link href="/profile?tab=orders">
              <ArrowLeft className="size-4" />
              All orders
            </Link>
          </Button>
          <div className="space-y-2">
            <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              Order detail
            </p>
            <h1 className="font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
              {order?.orderNumber || orderNumber || "Order"}
            </h1>
            {order ? (
              <p className="text-sm text-muted-foreground">
                Placed on {formatDate(order.createdAt, "en")}
                {itemCount > 0
                  ? ` · ${itemCount} ${itemCount === 1 ? "item" : "items"}`
                  : ""}
              </p>
            ) : null}
          </div>
        </div>
        {order ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(order.status)} className="rounded-full px-2.5 py-0.5">
              {ORDER_STATUS_LABEL[order.status]}
            </Badge>
            <Button variant="outline" size="sm" onClick={reorder}>
              <RotateCcw className="size-3.5" />
              Reorder
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <section className="rounded-2xl border border-border/70 bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/profile?tab=orders">Back to orders</Link>
          </Button>
        </section>
      ) : !order ? (
        <section className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/70 bg-card p-10">
          <LogoTraceLoader loading size={48} strokeWidth={40} ariaLabel="Loading order" />
          <p className="text-sm text-muted-foreground">Loading this order…</p>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="space-y-6">
            <Section title="Order progress">
              <OrderProcessTrace order={order} showTitle={false} />
            </Section>

            <Section title="Order details">
              <ul className="divide-y divide-border/60">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {item.image ? (
                        <Image src={item.image} alt="" fill className="object-cover" sizes="64px" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      {item.productId ? (
                        <Link
                          href={`/product/${item.productId}`}
                          className="font-medium hover:underline"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <p className="font-medium">{item.title}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {[
                          item.sku ? `SKU ${item.sku}` : "",
                          item.color ? `Color ${item.color}` : "",
                          item.size ? `Size ${item.size}` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Standard"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} × {formatMoney(item.unitPrice, order.currency, "en")}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatMoney(item.lineTotal, order.currency, "en")}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Addresses">
              <div className="grid gap-3 sm:grid-cols-2">
                <AddressBlock title="Shipping" address={order.shipping} />
                <AddressBlock title="Billing" address={order.billing} />
              </div>
            </Section>

            {order.customerNote ? (
              <Section title="Note">
                <p className="text-sm leading-relaxed text-muted-foreground">{order.customerNote}</p>
              </Section>
            ) : null}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24">
            <Section title="Summary">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">
                    {formatMoney(order.subtotal, order.currency, "en")}
                  </span>
                </div>
                {order.discountTotal > 0 ? (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">
                      Discount{order.couponCode ? ` (${order.couponCode})` : ""}
                    </span>
                    <span className="tabular-nums">
                      -{formatMoney(order.discountTotal, order.currency, "en")}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="tabular-nums">
                    {order.freeShipping && order.shippingTotal === 0
                      ? "Free"
                      : formatMoney(order.shippingTotal, order.currency, "en")}
                  </span>
                </div>
                {order.taxTotal > 0 ? (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="tabular-nums">
                      {formatMoney(order.taxTotal, order.currency, "en")}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4 border-t border-border/60 pt-3 text-base font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatMoney(order.total, order.currency, "en")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paid by {paymentLabel(order.paymentMethod)}
                </p>
              </div>
            </Section>

            <Section title="Documents">
              {[preInvoice, invoice].filter(Boolean).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No documents have been issued for this order.
                </p>
              ) : null}
              <div className="space-y-3">
                {order.documents.map((doc) => (
                  <div key={doc.number} className="rounded-xl border border-border/70 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{DOCUMENT_KIND_LABEL[doc.kind]}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {doc.number}
                        </p>
                      </div>
                      <Badge
                        variant={doc.status === "issued" ? "default" : "secondary"}
                        className="shrink-0 rounded-full"
                      >
                        {DOCUMENT_STATUS_LABEL[doc.status]}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Issued {formatDate(doc.issuedAt, "en")}
                      {doc.kind === "proforma" && doc.validUntil && doc.status === "issued"
                        ? ` · Valid until ${formatDate(doc.validUntil, "en")}`
                        : ""}
                    </p>
                    {doc.href ? (
                      <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                        <a href={doc.href} target="_blank" rel="noreferrer">
                          <FileText className="size-3.5" />
                          Open {DOCUMENT_KIND_LABEL[doc.kind].toLowerCase()}
                        </a>
                      </Button>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">
                        This document is no longer available.
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {!invoice &&
              order.status !== "cancelled" &&
              order.status !== "failed" &&
              order.status !== "refunded" ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  The invoice is issued when this order is completed.
                </p>
              ) : null}
            </Section>
          </aside>
        </div>
      )}
    </PageShell>
  )
}

export default function OrderDetailPage() {
  return (
    <ProtectedRoute>
      <OrderDetail />
    </ProtectedRoute>
  )
}
