import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

import { createStockAlertSubscription } from '@/lib/stock-notify'
import { getPayloadClient } from '@/lib/payload'

const hits = new Map<string, { count: number; resetAt: number }>()

function rateLimit(key: string, max = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const row = hits.get(key)
  if (!row || row.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  row.count += 1
  return row.count > max
}

export async function POST(req: Request) {
  try {
    const h = await headers()
    const ip =
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      h.get('x-real-ip') ||
      'unknown'

    if (rateLimit(`stock-alert:${ip}`)) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.', code: 'rate_limit' },
        { status: 429 },
      )
    }

    const body = (await req.json()) as {
      productId?: string | number
      variantKey?: string
      phone?: string
    }

    const productId = body.productId
    const phone = body.phone || ''
    const variantKey = body.variantKey || ''

    if (productId == null || productId === '') {
      return NextResponse.json({ error: 'Product is required.', code: 'missing_product' }, { status: 400 })
    }

    const payload = await getPayloadClient()
    const { user } = await payload.auth({ headers: h })

    const result = await createStockAlertSubscription({
      payload,
      productId,
      variantKey,
      phoneRaw: phone,
      userId: user?.id ?? null,
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      already: Boolean(result.already),
      message: result.already
        ? 'You’re already on the list. We’ll text you when it’s back.'
        : 'Request saved. We’ll text you as soon as it’s back in stock.',
    })
  } catch (err) {
    console.error('[stock-alerts]', err)
    return NextResponse.json({ error: 'Something went wrong.', code: 'server' }, { status: 500 })
  }
}
