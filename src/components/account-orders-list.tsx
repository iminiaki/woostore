"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { FileText, Package, RotateCcw } from "lucide-react"

import { useAuth } from "@/components/auth-context"
import { useCart } from "@/components/cart-store"
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

function itemMeta(item: CustomerOrder["items"][number]) {
  const parts = [
    item.color ? `Color: ${item.color}` : "",
    item.size ? `Size: ${item.size}` : "",
    `Qty: ${item.quantity}`,
  ].filter(Boolean)
  return parts.join(" · ")
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
          <CardContent className="p-8 text-center text-sm text-muted-foreground">Loading your orders…</CardContent>
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
        <div className="space-y-4">
          {orders.map((order) => {
            const open = () => router.push(`/profile/orders/${encodeURIComponent(order.orderNumber)}`)
            const liveDocs = order.documents.filter((doc) => doc.href)
            return (
              <Card
                key={order.id}
                className="cursor-pointer transition-colors hover:bg-muted/40"
                onClick={open}
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium">{order.orderNumber}</h3>
                      <p className="text-sm text-muted-foreground">
                        Placed on {formatDate(order.createdAt, "en")}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={statusVariant(order.status)} className="mb-2">
                        {ORDER_STATUS_LABEL[order.status]}
                      </Badge>
                      <p className="font-medium">{formatMoney(order.total, order.currency, "en")}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                          {item.image ? (
                            <Image src={item.image} alt="" fill className="object-cover" sizes="48px" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{itemMeta(item)}</p>
                          <p className="text-sm font-medium">
                            {formatMoney(item.lineTotal, order.currency, "en")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t pt-4" onClick={(event) => event.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={open}>
                      View details
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => reorder(order)}>
                      <RotateCcw className="size-3.5" />
                      Reorder
                    </Button>
                    {liveDocs.map((doc) => (
                      <Button key={doc.number} variant="outline" size="sm" asChild>
                        <a href={doc.href || "#"} target="_blank" rel="noreferrer">
                          <FileText className="size-3.5" />
                          {DOCUMENT_KIND_LABEL[doc.kind]}
                        </a>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
