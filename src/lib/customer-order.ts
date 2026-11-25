import type { Product } from "@/types"

export type CustomerOrderStatus =
  | "pending"
  | "processing"
  | "on-hold"
  | "completed"
  | "cancelled"
  | "refunded"
  | "failed"

export type CustomerOrderItem = {
  id: string
  title: string
  sku?: string | null
  color?: string | null
  size?: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
  productId?: string | null
  image?: string | null
}

export type CustomerOrderAddress = {
  name?: string | null
  email?: string | null
  phone?: string | null
  country?: string | null
  state?: string | null
  city?: string | null
  address1?: string | null
  address2?: string | null
  postcode?: string | null
}

export type CustomerOrderDocument = {
  kind: "proforma" | "invoice"
  number: string
  status: "issued" | "void" | "superseded"
  href: string | null
  issuedAt?: string | null
  validUntil?: string | null
}

export type CustomerOrderStatusEvent = {
  status: CustomerOrderStatus
  at: string
  note?: string | null
}

export type CustomerOrder = {
  id: number
  orderNumber: string
  status: CustomerOrderStatus
  createdAt: string
  updatedAt?: string
  currency: "usd" | "irt"
  email: string
  subtotal: number
  discountTotal: number
  shippingTotal: number
  taxTotal: number
  total: number
  couponCode?: string | null
  freeShipping: boolean
  paymentMethod?: string | null
  customerNote?: string | null
  items: CustomerOrderItem[]
  billing: CustomerOrderAddress
  shipping: CustomerOrderAddress
  documents: CustomerOrderDocument[]
  /** Chronological status events from Payload (dynamic progress source). */
  statusHistory: CustomerOrderStatusEvent[]
}

export const ORDER_STATUS_LABEL: Record<CustomerOrderStatus, string> = {
  pending: "Pending payment",
  processing: "Processing",
  "on-hold": "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  failed: "Failed",
}

export const DOCUMENT_KIND_LABEL: Record<CustomerOrderDocument["kind"], string> = {
  proforma: "Pre-invoice",
  invoice: "Invoice",
}

export const DOCUMENT_STATUS_LABEL: Record<CustomerOrderDocument["status"], string> = {
  issued: "Issued",
  void: "Void",
  superseded: "Replaced by invoice",
}

export type OrderReceiptTotals = {
  currency: "usd" | "irt"
  subtotal: number
  discountTotal: number
  shippingTotal: number
  taxTotal: number
  total: number
  paymentMethod: string | null
  createdAt: string
}

export function paymentLabel(value?: string | null) {
  if (!value) return "Not recorded"
  if (value === "cod") return "Cash on delivery"
  if (value === "card") return "Card"
  return value
}

export function lineToCartProduct(line: CustomerOrderItem): Product {
  const now = new Date()
  return {
    id: line.productId || `line-${line.title}`,
    name: line.title,
    description: "",
    price: line.unitPrice,
    images: line.image ? [line.image] : [],
    category: "",
    subCategory: "",
    brand: "",
    material: "",
    colors: line.color ? [line.color] : [],
    sizes: line.size ? [line.size] : [],
    attributeValues: {},
    rating: 0,
    reviews: 0,
    inStock: true,
    featured: false,
    newArrival: false,
    clearance: false,
    tags: [],
    createdAt: now,
    updatedAt: now,
    selectedColor: line.color || undefined,
    selectedSize: line.size || undefined,
  }
}
