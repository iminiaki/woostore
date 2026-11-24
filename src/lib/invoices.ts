import { randomBytes, timingSafeEqual } from 'crypto'

import type { Payload, PayloadRequest } from 'payload'

import { documentPath, type InvoiceKind } from '@/lib/invoice-format'

/**
 * One pre-invoice and one official invoice per order.
 *
 * The pre-invoice is issued when the order is placed (a payable quote).
 * The invoice is issued when the order is completed, or earlier by staff
 * while the order is processing or on hold. Totals are copied at issue time.
 * Voided numbers are never reused. A voided document frees its slot so staff
 * can issue a replacement of the same kind.
 */

const CLOSED = new Set(['cancelled', 'failed', 'refunded'])
const INVOICE_STATUSES = new Set(['processing', 'on-hold', 'completed'])

const DEFAULT_FOOTER =
  'مبالغ این برگه در زمان صدور از روی سفارش کپی شده‌اند و با تغییر قیمت کالا عوض نمی‌شوند.\nAmounts on this document were copied from the order when it was issued.'

export class InvoiceError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'InvoiceError'
    this.status = status
  }
}

export function newViewToken() {
  return randomBytes(24).toString('base64url')
}

export function tokensMatch(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length || a.length === 0) return false
  return timingSafeEqual(a, b)
}

export function orderKey(order: unknown): string {
  if (order && typeof order === 'object') {
    if ('id' in order && (order as { id?: unknown }).id != null) {
      return String((order as { id: unknown }).id)
    }
    if ('value' in order && (order as { value?: unknown }).value != null) {
      return orderKey((order as { value: unknown }).value)
    }
  }
  return String(order ?? '')
}

export function activeSlot(order: unknown, kind: string) {
  return `${orderKey(order)}:${kind}`
}

export function voidSlot(order: unknown, kind: string, id: unknown) {
  return `${orderKey(order)}:${kind}:void:${id}`
}

export function canTransition(kind: string, from: string, to: string) {
  if (from === to) return true
  if (from === 'issued' && to === 'void') return true
  if (kind === 'proforma' && from === 'issued' && to === 'superseded') return true
  if (kind === 'proforma' && from === 'superseded' && to === 'issued') return true
  return false
}

type OrderDoc = {
  id: number | string
  orderNumber?: string | null
  status?: string | null
  currency?: 'usd' | 'irt' | null
  email?: string | null
  items?: {
    productTitle?: string | null
    sku?: string | null
    color?: string | null
    size?: string | null
    quantity?: number | null
    unitPrice?: number | null
    lineTotal?: number | null
  }[] | null
  subtotal?: number | null
  discountTotal?: number | null
  shippingTotal?: number | null
  taxTotal?: number | null
  total?: number | null
  couponCode?: string | null
  freeShipping?: boolean | null
  paymentMethod?: string | null
  customerNote?: string | null
  billingName?: string | null
  billingEmail?: string | null
  billingPhone?: string | null
  billingCountry?: string | null
  billingState?: string | null
  billingCity?: string | null
  billingAddress1?: string | null
  billingAddress2?: string | null
  billingPostcode?: string | null
  shippingName?: string | null
  shippingEmail?: string | null
  shippingPhone?: string | null
  shippingCountry?: string | null
  shippingState?: string | null
  shippingCity?: string | null
  shippingAddress1?: string | null
  shippingAddress2?: string | null
  shippingPostcode?: string | null
}

type InvoiceDoc = {
  id: number | string
  number: string
  kind: InvoiceKind
  status: 'issued' | 'void' | 'superseded'
  viewToken?: string | null
  issuedAt?: string | null
  validUntil?: string | null
  voidReason?: string | null
  total?: number | null
  currency?: 'usd' | 'irt' | null
  order?: unknown
  orderNumber?: string | null
}

type Args = {
  payload: Payload
  req?: PayloadRequest
}

function text(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (value && typeof value === 'object') {
    const bag = value as Record<string, unknown>
    return text(bag.fa) || text(bag.en) || fallback
  }
  return fallback
}

function cleanPrefix(value: unknown, fallback: string) {
  const cleaned = text(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
  return cleaned || fallback
}

export async function loadInvoicingSettings({ payload, req }: Args) {
  try {
    const settings = (await payload.findGlobal({
      slug: 'store-settings',
      depth: 0,
      overrideAccess: true,
      req,
    })) as unknown as Record<string, unknown>
    return settings
  } catch {
    return {} as Record<string, unknown>
  }
}

export function isSellerReady(settings: Record<string, unknown>) {
  return Boolean(text(settings.legalName) && text(settings.sellerAddress))
}

async function findLive({
  payload,
  req,
  orderId,
  kind,
}: Args & { orderId: string | number; kind: InvoiceKind }) {
  const found = await payload.find({
    collection: 'invoices',
    where: {
      and: [
        { order: { equals: orderId } },
        { kind: { equals: kind } },
        { status: { not_equals: 'void' } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return (found.docs[0] as InvoiceDoc | undefined) || null
}

async function nextNumber({
  payload,
  req,
  kind,
  prefix,
}: Args & { kind: InvoiceKind; prefix: string }) {
  const year = new Date().getFullYear()
  const head = `${prefix}-${year}-`
  const found = await payload.find({
    collection: 'invoices',
    where: {
      and: [{ kind: { equals: kind } }, { number: { contains: head } }],
    },
    sort: '-createdAt',
    limit: 100,
    depth: 0,
    overrideAccess: true,
    req,
  })
  let max = 0
  for (const doc of found.docs) {
    const seq = Number(String((doc as { number?: string }).number || '').split('-').pop())
    if (Number.isFinite(seq) && seq > max) max = seq
  }
  return `${head}${String(max + 1).padStart(5, '0')}`
}

function snapshotFromOrder(order: OrderDoc, settings: Record<string, unknown>, kind: InvoiceKind) {
  const issuedAt = new Date().toISOString()
  const days = Math.min(365, Math.max(1, Number(settings.proformaValidityDays) || 7))
  const validUntil = new Date(issuedAt)
  validUntil.setDate(validUntil.getDate() + days)

  const billing = {
    name: order.billingName || order.shippingName || '',
    email: order.billingEmail || order.email || '',
    phone: order.billingPhone || order.shippingPhone || '',
    country: order.billingCountry || order.shippingCountry || '',
    state: order.billingState || order.shippingState || '',
    city: order.billingCity || order.shippingCity || '',
    address1: order.billingAddress1 || order.shippingAddress1 || '',
    address2: order.billingAddress2 || order.shippingAddress2 || '',
    postcode: order.billingPostcode || order.shippingPostcode || '',
  }

  return {
    issuedAt,
    validUntil: kind === 'proforma' ? validUntil.toISOString() : null,
    currency: (order.currency === 'irt' ? 'irt' : 'usd') as 'usd' | 'irt',
    orderNumber: order.orderNumber || '',
    seller: {
      name: text(settings.legalName) || text(settings.storeName) || 'Lastore',
      nationalId: text(settings.sellerNationalId),
      economicCode: text(settings.sellerEconomicCode),
      registrationNo: text(settings.sellerRegistrationNo),
      address: text(settings.sellerAddress),
      postalCode: text(settings.sellerPostalCode),
      phone: text(settings.sellerPhone) || text(settings.supportPhone),
      email: text(settings.sellerEmail) || text(settings.supportEmail),
    },
    buyer: billing,
    lines: (order.items || []).map((item) => ({
      title: item.productTitle || 'Item',
      sku: item.sku || '',
      color: item.color || '',
      size: item.size || '',
      quantity: Math.max(1, Number(item.quantity) || 1),
      unitPrice: Number(item.unitPrice) || 0,
      lineTotal: Number(item.lineTotal) || 0,
    })),
    subtotal: Number(order.subtotal) || 0,
    discountTotal: Number(order.discountTotal) || 0,
    shippingTotal: Number(order.shippingTotal) || 0,
    taxTotal: Number(order.taxTotal) || 0,
    total: Number(order.total) || 0,
    couponCode: order.couponCode || '',
    freeShipping: Boolean(order.freeShipping),
    paymentMethod: order.paymentMethod || '',
    customerNote: order.customerNote || '',
    footerNote: text(settings.invoiceFooter) || DEFAULT_FOOTER,
  }
}

export async function issueOrderDocument({
  payload,
  req,
  orderId,
  kind,
  skipStatusCheck = false,
}: Args & { orderId: string | number; kind: InvoiceKind; skipStatusCheck?: boolean }) {
  const order = (await payload.findByID({
    collection: 'orders',
    id: orderId,
    depth: 0,
    overrideAccess: true,
    req,
  })) as unknown as OrderDoc

  const status = String(order.status || '')
  if (!skipStatusCheck) {
    if (kind === 'invoice' && !INVOICE_STATUSES.has(status)) {
      throw new InvoiceError(
        'Issue an invoice when the order is processing, on hold, or completed.',
      )
    }
    if (kind === 'proforma' && CLOSED.has(status)) {
      throw new InvoiceError('A closed order cannot get a new pre-invoice.')
    }
  }

  const existing = await findLive({ payload, req, orderId: order.id, kind })
  if (existing) return existing

  if (kind === 'proforma') {
    const invoice = await findLive({ payload, req, orderId: order.id, kind: 'invoice' })
    if (invoice) {
      throw new InvoiceError('This order already has an invoice, so a new pre-invoice is not issued.')
    }
  }

  const settings = await loadInvoicingSettings({ payload, req })
  const prefix = cleanPrefix(
    kind === 'proforma' ? settings.proformaPrefix : settings.invoicePrefix,
    kind === 'proforma' ? 'PF' : 'INV',
  )
  const snapshot = snapshotFromOrder(order, settings, kind)

  let created: InvoiceDoc | null = null
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    const number = await nextNumber({ payload, req, kind, prefix })
    try {
      created = (await payload.create({
        collection: 'invoices',
        data: {
          number,
          kind,
          status: 'issued',
          slot: activeSlot(order.id, kind),
          viewToken: newViewToken(),
          order: typeof order.id === 'number' ? order.id : Number(order.id),
          ...snapshot,
        },
        overrideAccess: true,
        req,
      })) as unknown as InvoiceDoc
      break
    } catch (err) {
      lastError = err
      const winner = await findLive({ payload, req, orderId: order.id, kind })
      if (winner) return winner
    }
  }
  if (!created) {
    throw lastError instanceof Error ? lastError : new InvoiceError('Could not issue the document', 500)
  }

  if (kind === 'invoice') {
    const proforma = await findLive({ payload, req, orderId: order.id, kind: 'proforma' })
    if (proforma && proforma.status === 'issued') {
      await payload.update({
        collection: 'invoices',
        id: proforma.id,
        data: { status: 'superseded' },
        overrideAccess: true,
        req,
      })
    }
  }

  return created
}

export async function voidOrderDocument({
  payload,
  req,
  orderId,
  invoiceId,
  reason,
}: Args & { orderId: string | number; invoiceId: string | number; reason: string }) {
  const cleanReason = reason.trim()
  if (cleanReason.length < 3) {
    throw new InvoiceError('A void reason is required.')
  }

  const doc = (await payload.findByID({
    collection: 'invoices',
    id: invoiceId,
    depth: 0,
    overrideAccess: true,
    req,
  })) as unknown as InvoiceDoc

  if (orderKey(doc.order) !== orderKey(orderId)) {
    throw new InvoiceError('That document does not belong to this order.', 404)
  }
  if (doc.status === 'void') throw new InvoiceError('This document is already void.')
  if (doc.status === 'superseded') {
    throw new InvoiceError('This pre-invoice was replaced by the invoice. Void the invoice instead.')
  }
  if (doc.status !== 'issued') throw new InvoiceError('This document cannot be voided.')

  await payload.update({
    collection: 'invoices',
    id: doc.id,
    data: {
      status: 'void',
      voidReason: cleanReason,
    },
    overrideAccess: true,
    req,
  })

  if (doc.kind === 'invoice') {
    const found = await payload.find({
      collection: 'invoices',
      where: {
        and: [
          { order: { equals: orderId } },
          { kind: { equals: 'proforma' } },
          { status: { equals: 'superseded' } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const proforma = found.docs[0] as InvoiceDoc | undefined
    if (proforma) {
      await payload.update({
        collection: 'invoices',
        id: proforma.id,
        data: { status: 'issued' },
        overrideAccess: true,
        req,
      })
    }
  }
}

async function voidIssuedProforma({
  payload,
  req,
  orderId,
  reason,
}: Args & { orderId: string | number; reason: string }) {
  const invoice = await findLive({ payload, req, orderId, kind: 'invoice' })
  if (invoice) return
  const proforma = await findLive({ payload, req, orderId, kind: 'proforma' })
  if (!proforma || proforma.status !== 'issued') return
  await payload.update({
    collection: 'invoices',
    id: proforma.id,
    data: { status: 'void', voidReason: reason },
    overrideAccess: true,
    req,
  })
}

export async function syncOrderDocuments({
  payload,
  req,
  doc,
  previousDoc,
  operation,
}: Args & {
  doc: OrderDoc
  previousDoc?: OrderDoc | null
  operation: string
}) {
  const status = String(doc.status || '')
  const previous = previousDoc ? String(previousDoc.status || '') : ''

  if (operation === 'create') {
    if (!CLOSED.has(status)) {
      await issueOrderDocument({
        payload,
        req,
        orderId: doc.id,
        kind: 'proforma',
        skipStatusCheck: true,
      })
    }
    if (status === 'completed') {
      await issueOrderDocument({ payload, req, orderId: doc.id, kind: 'invoice' })
    }
    return
  }

  if (operation !== 'update' || status === previous) return

  if (status === 'cancelled') {
    await voidIssuedProforma({ payload, req, orderId: doc.id, reason: 'order-cancelled' })
    return
  }
  if (status === 'failed') {
    await voidIssuedProforma({ payload, req, orderId: doc.id, reason: 'order-failed' })
    return
  }
  if (status === 'refunded') {
    await voidIssuedProforma({ payload, req, orderId: doc.id, reason: 'order-refunded' })
    return
  }
  if (status === 'completed') {
    await issueOrderDocument({ payload, req, orderId: doc.id, kind: 'invoice' })
  }
}

export function publicDocumentPath(doc: Pick<InvoiceDoc, 'number' | 'viewToken'>) {
  if (!doc.number || !doc.viewToken) return null
  return documentPath(doc.number, doc.viewToken)
}
