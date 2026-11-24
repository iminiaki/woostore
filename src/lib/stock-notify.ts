import type { Payload, PayloadRequest } from 'payload'

import { isValidPhone, normalizePhone } from '@/lib/stock-notify-shared'

export {
  buildVariantKey,
  isValidIranMobile,
  isValidPhone,
  normalizePhone,
  toWesternDigits,
} from '@/lib/stock-notify-shared'

type VariantRow = {
  id?: string | number | null
  inStock?: boolean | null
  sku?: string | null
}

export function variantRowKey(row: VariantRow): string {
  if (row.id != null && String(row.id)) return String(row.id)
  if (row.sku) return `sku:${row.sku}`
  return ''
}

/**
 * Send back-in-stock SMS. Set STOCK_NOTIFY_WEBHOOK_URL to a POST endpoint that
 * accepts `{ phone, productName, productUrl }`. Without it, logs and returns true
 * so pending alerts still clear in admin (same pattern as Diako’s filter stub).
 */
export async function sendStockNotifySms(args: {
  phone: string
  productName: string
  productUrl?: string
}): Promise<boolean> {
  const webhook = process.env.STOCK_NOTIFY_WEBHOOK_URL?.trim()
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      })
      return res.ok
    } catch {
      return false
    }
  }

  console.info(
    `[stock-notify] SMS stub → ${args.phone}: «${args.productName}» is back in stock` +
      (args.productUrl ? ` (${args.productUrl})` : ''),
  )
  return true
}

function isTargetOutOfStock(
  product: { inStock?: boolean | null; variants?: VariantRow[] | null },
  variantKey: string,
): boolean {
  const variants = Array.isArray(product.variants) ? product.variants : []

  if (variantKey) {
    const row = variants.find((v) => variantRowKey(v) === variantKey)
    if (row) return !Boolean(row.inStock)
    // Unresolved key (e.g. color|size) — trust the storefront OOS state
    return true
  }

  // Parent-level alert
  return !Boolean(product.inStock)
}

export async function createStockAlertSubscription(args: {
  payload: Payload
  req?: PayloadRequest
  productId: string | number
  variantKey?: string
  phoneRaw: string
  userId?: string | number | null
}): Promise<{ ok: true; already?: boolean } | { ok: false; code: string; message: string }> {
  const phone = normalizePhone(args.phoneRaw)
  if (!phone) {
    return { ok: false, code: 'empty_phone', message: 'Enter your mobile number.' }
  }
  if (!isValidPhone(phone)) {
    return {
      ok: false,
      code: 'invalid_phone',
      message: 'Enter a valid phone number (8–15 digits).',
    }
  }

  let product: {
    id: string | number
    title?: string | null
    inStock?: boolean | null
    variants?: VariantRow[] | null
  }
  try {
    product = (await args.payload.findByID({
      collection: 'products',
      id: String(args.productId),
      depth: 0,
      overrideAccess: true,
      req: args.req,
    })) as typeof product
  } catch {
    return { ok: false, code: 'not_found', message: 'Product not found.' }
  }

  const variantKey = args.variantKey?.trim() || ''

  if (!isTargetOutOfStock(product, variantKey)) {
    return { ok: false, code: 'in_stock', message: 'This product is already in stock.' }
  }

  const existing = await args.payload.find({
    collection: 'stock-alerts',
    where: {
      and: [
        { product: { equals: product.id } },
        { variantKey: { equals: variantKey } },
        { phone: { equals: phone } },
        { status: { equals: 'pending' } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req: args.req,
  })

  if (existing.docs.length) {
    return { ok: true, already: true }
  }

  await args.payload.create({
    collection: 'stock-alerts',
    data: {
      title: `${product.title || 'Product'} — ${phone}`,
      product: product.id,
      variantKey,
      phone,
      status: 'pending',
      ...(args.userId != null ? { user: args.userId } : {}),
    },
    overrideAccess: true,
    req: args.req,
  })

  return { ok: true }
}

export async function notifyPendingStockAlerts(args: {
  payload: Payload
  req?: PayloadRequest
  productId: string | number
  /** Empty = all pending for product; otherwise variant row id (+ parent-level '') */
  variantKey?: string
  productName: string
}): Promise<number> {
  const variantKey = args.variantKey?.trim() || ''
  const where =
    variantKey === ''
      ? {
          and: [
            { product: { equals: args.productId } },
            { status: { equals: 'pending' } },
          ],
        }
      : {
          and: [
            { product: { equals: args.productId } },
            { status: { equals: 'pending' } },
            {
              or: [
                { variantKey: { equals: variantKey } },
                { variantKey: { equals: '' } },
              ],
            },
          ],
        }

  const pending = await args.payload.find({
    collection: 'stock-alerts',
    where,
    limit: 500,
    depth: 0,
    overrideAccess: true,
    req: args.req,
  })

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || ''
  const productUrl = site ? `${site}/product/${args.productId}` : undefined
  let sentCount = 0

  for (const alert of pending.docs) {
    const phone = String((alert as { phone?: string }).phone || '')
    if (!isValidPhone(phone)) continue

    const sent = await sendStockNotifySms({
      phone,
      productName: args.productName,
      productUrl,
    })
    if (!sent) continue

    await args.payload.update({
      collection: 'stock-alerts',
      id: alert.id,
      data: {
        status: 'notified',
        notifiedAt: new Date().toISOString(),
      },
      overrideAccess: true,
      req: args.req,
    })
    sentCount += 1
  }

  return sentCount
}

export function findRestockedVariantKeys(
  doc: { inStock?: boolean | null; variants?: VariantRow[] | null },
  previous?: { inStock?: boolean | null; variants?: VariantRow[] | null } | null,
): { productRestocked: boolean; variantKeys: string[] } {
  const prev = previous || null
  const productRestocked = Boolean(doc.inStock) && !Boolean(prev?.inStock)

  const prevMap = new Map<string, boolean>()
  for (const row of Array.isArray(prev?.variants) ? prev!.variants! : []) {
    const key = variantRowKey(row)
    if (key) prevMap.set(key, Boolean(row.inStock))
  }

  const variantKeys: string[] = []
  for (const row of Array.isArray(doc.variants) ? doc.variants : []) {
    const key = variantRowKey(row)
    if (!key) continue
    const now = Boolean(row.inStock)
    const was = prevMap.has(key) ? Boolean(prevMap.get(key)) : false
    if (now && !was) variantKeys.push(key)
  }

  return { productRestocked, variantKeys }
}
