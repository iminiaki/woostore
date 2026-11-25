import type { Invoice, Order } from "@/payload-types"
import { publicDocumentPath } from "@/lib/invoices"
import { getPayloadClient } from "@/lib/payload"
import type {
  CustomerOrder,
  CustomerOrderAddress,
  CustomerOrderDocument,
  CustomerOrderStatus,
  CustomerOrderStatusEvent,
  OrderReceiptTotals,
} from "@/lib/customer-order"

function mediaUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null
  const media = value as {
    url?: string | null
    thumbnailURL?: string | null
    sizes?: { card?: { url?: string | null }; thumbnail?: { url?: string | null } }
  }
  return media.url || media.sizes?.card?.url || media.sizes?.thumbnail?.url || media.thumbnailURL || null
}

function productImage(product: Order["items"][number]["product"]): string | null {
  if (!product || typeof product !== "object") return null
  const doc = product as { mainImage?: unknown; images?: unknown[] | null }
  return mediaUrl(doc.mainImage) || (Array.isArray(doc.images) ? mediaUrl(doc.images[0]) : null)
}

function productId(product: Order["items"][number]["product"]): string | null {
  if (typeof product === "number") return String(product)
  if (product && typeof product === "object" && "id" in product) return String(product.id)
  return null
}

function address(order: Order, prefix: "billing" | "shipping"): CustomerOrderAddress {
  const doc = order as unknown as Record<string, string | null | undefined>
  const key = (name: string) => doc[`${prefix}${name}`]
  return {
    name: key("Name"),
    email: key("Email"),
    phone: key("Phone"),
    country: key("Country"),
    state: key("State"),
    city: key("City"),
    address1: key("Address1"),
    address2: key("Address2"),
    postcode: key("Postcode"),
  }
}

function toDocument(doc: Invoice): CustomerOrderDocument {
  return {
    kind: doc.kind,
    number: doc.number,
    status: doc.status,
    href: doc.status === "void" ? null : publicDocumentPath(doc),
    issuedAt: doc.issuedAt,
    validUntil: doc.validUntil,
  }
}

const ORDER_STATUSES = new Set<CustomerOrderStatus>([
  "pending",
  "processing",
  "on-hold",
  "completed",
  "cancelled",
  "failed",
  "refunded",
])

function toStatusHistory(order: Order): CustomerOrderStatusEvent[] {
  const raw = (order as Order & {
    statusHistory?: { status?: string; at?: string; note?: string | null }[] | null
  }).statusHistory

  const events: CustomerOrderStatusEvent[] = Array.isArray(raw)
    ? raw
        .filter((row): row is { status: CustomerOrderStatus; at: string; note?: string | null } =>
          Boolean(row?.status && row?.at && ORDER_STATUSES.has(row.status as CustomerOrderStatus)),
        )
        .map((row) => ({
          status: row.status as CustomerOrderStatus,
          at: row.at,
          note: row.note,
        }))
    : []

  // Legacy orders without history: synthesize from created/updated + current status.
  if (!events.length) {
    events.push({
      status: order.status === "pending" ? "pending" : order.status,
      at: order.createdAt,
      note: "Order placed",
    })
    if (order.status !== "pending" && order.updatedAt && order.updatedAt !== order.createdAt) {
      // If only one synthetic event and status isn't the "placed" status, keep single event as current.
      events[0] = {
        status: order.status,
        at: order.createdAt,
        note: "Order placed",
      }
    }
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}

export function toCustomerOrder(order: Order, invoices: Invoice[]): CustomerOrder {
  const documents = invoices
    .filter((doc) => {
      const orderId = typeof doc.order === "object" ? doc.order.id : doc.order
      return orderId === order.id
    })
    .map(toDocument)
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "proforma" ? -1 : 1
      if (a.status === b.status) return 0
      if (a.status === "issued") return -1
      if (b.status === "issued") return 1
      return 0
    })

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    currency: order.currency,
    email: order.email,
    subtotal: order.subtotal,
    discountTotal: order.discountTotal || 0,
    shippingTotal: order.shippingTotal || 0,
    taxTotal: order.taxTotal || 0,
    total: order.total,
    couponCode: order.couponCode,
    freeShipping: Boolean(order.freeShipping),
    paymentMethod: order.paymentMethod,
    customerNote: order.customerNote,
    items: (order.items || []).map((item, index) => ({
      id: item.id || `${order.id}-${index}`,
      title: item.productTitle,
      sku: item.sku,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      productId: productId(item.product),
      image: productImage(item.product),
    })),
    billing: address(order, "billing"),
    shipping: address(order, "shipping"),
    documents,
    statusHistory: toStatusHistory(order),
  }
}

async function invoicesFor(orderIds: number[]) {
  if (!orderIds.length) return [] as Invoice[]
  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: "invoices",
    where: { order: { in: orderIds } },
    limit: 200,
    depth: 0,
    overrideAccess: true,
    sort: "-createdAt",
  })
  return found.docs
}

export async function loadCustomerOrders(email: string) {
  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: "orders",
    where: { email: { equals: email } },
    sort: "-createdAt",
    limit: 50,
    depth: 2,
    overrideAccess: true,
  })
  const invoices = await invoicesFor(found.docs.map((order) => order.id))
  return found.docs.map((order) => toCustomerOrder(order, invoices))
}

export async function loadOrderReceipt(orderNumber: string): Promise<OrderReceiptTotals | null> {
  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: "orders",
    where: { orderNumber: { equals: orderNumber } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const order = found.docs[0]
  if (!order) return null
  return {
    currency: order.currency,
    subtotal: order.subtotal,
    discountTotal: order.discountTotal || 0,
    shippingTotal: order.shippingTotal || 0,
    taxTotal: order.taxTotal || 0,
    total: order.total,
    paymentMethod: order.paymentMethod || null,
    createdAt: order.createdAt,
  }
}

export async function loadCustomerOrder(email: string, orderNumber: string) {
  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: "orders",
    where: { orderNumber: { equals: orderNumber } },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  })
  const order = found.docs[0]
  if (!order || order.email.trim().toLowerCase() !== email) return null
  const invoices = await invoicesFor([order.id])
  return toCustomerOrder(order, invoices)
}
