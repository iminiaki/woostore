"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams } from "next/navigation"
import { ArrowLeft, FileText, RotateCcw } from "lucide-react"

import { useAuth } from "@/components/auth-context"
import { useCart } from "@/components/cart-store"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { PageShell } from "@/components/page-shell"
import { ProtectedRoute } from "@/components/protected-route"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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

function statusVariant(status: CustomerOrder["status"]) {
  if (status === "completed") return "default" as const
  if (status === "cancelled" || status === "failed" || status === "refunded") return "destructive" as const
  return "secondary" as const
}

function AddressBlock({ title, address }: { title: string; address: CustomerOrderAddress }) {
  const place = [address.address1, address.address2].filter(Boolean).join(", ")
  const cityLine = [address.city, address.state, address.postcode].filter(Boolean).join(", ")
  const lines = [address.name, place, cityLine, address.country, address.phone, address.email].filter(Boolean)
  return (
    <div>
      <h3 className="text-sm font-medium">{title}</h3>
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

  return (
    <PageShell className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Profile", href: "/profile?tab=orders" },
          { label: "Orders", href: "/profile?tab=orders" },
          { label: order?.orderNumber || orderNumber || "Order" },
        ]}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="-ml-2" asChild>
            <Link href="/profile?tab=orders">
              <ArrowLeft className="size-4" />
              All orders
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">{order?.orderNumber || "Order"}</h1>
          {order ? (
            <p className="text-sm text-muted-foreground">Placed on {formatDate(order.createdAt, "en")}</p>
          ) : null}
        </div>
        {order ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(order.status)}>{ORDER_STATUS_LABEL[order.status]}</Badge>
            <Button variant="outline" onClick={reorder}>
              <RotateCcw className="size-4" />
              Reorder
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button asChild variant="outline">
              <Link href="/profile?tab=orders">Back to orders</Link>
            </Button>
          </CardContent>
        </Card>
      ) : !order ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">Loading this order…</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-4 p-6">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.image ? (
                        <Image src={item.image} alt="" fill className="object-cover" sizes="64px" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      {item.productId ? (
                        <Link href={`/product/${item.productId}`} className="font-medium hover:underline">
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
                      <p className="mt-1 text-sm">
                        {item.quantity} × {formatMoney(item.unitPrice, order.currency, "en")}
                      </p>
                    </div>
                    <p className="text-sm font-medium">{formatMoney(item.lineTotal, order.currency, "en")}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="grid gap-6 p-6 sm:grid-cols-2">
                <AddressBlock title="Shipping address" address={order.shipping} />
                <AddressBlock title="Billing address" address={order.billing} />
              </CardContent>
            </Card>

            {order.customerNote ? (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium">Note</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{order.customerNote}</p>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-3 p-6 text-sm">
                <h2 className="font-medium">Summary</h2>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatMoney(order.subtotal, order.currency, "en")}</span>
                </div>
                {order.discountTotal > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Discount{order.couponCode ? ` (${order.couponCode})` : ""}
                    </span>
                    <span>-{formatMoney(order.discountTotal, order.currency, "en")}</span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>
                    {order.freeShipping && order.shippingTotal === 0
                      ? "Free"
                      : formatMoney(order.shippingTotal, order.currency, "en")}
                  </span>
                </div>
                {order.taxTotal > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatMoney(order.taxTotal, order.currency, "en")}</span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t pt-3 font-medium">
                  <span>Total</span>
                  <span>{formatMoney(order.total, order.currency, "en")}</span>
                </div>
                <p className="text-muted-foreground">Paid by {paymentLabel(order.paymentMethod)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-6">
                <h2 className="font-medium">Documents</h2>
                {[preInvoice, invoice].filter(Boolean).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents have been issued for this order.</p>
                ) : null}
                {order.documents.map((doc) => (
                  <div key={doc.number} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{DOCUMENT_KIND_LABEL[doc.kind]}</p>
                        <p className="text-sm text-muted-foreground">{doc.number}</p>
                      </div>
                      <Badge variant={doc.status === "issued" ? "default" : "secondary"}>
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
                      <p className="mt-3 text-xs text-muted-foreground">This document is no longer available.</p>
                    )}
                  </div>
                ))}
                {!invoice && order.status !== "cancelled" && order.status !== "failed" && order.status !== "refunded" ? (
                  <p className="text-sm text-muted-foreground">
                    The invoice is issued when this order is completed.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
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
