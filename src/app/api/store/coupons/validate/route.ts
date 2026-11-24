import { NextResponse } from 'next/server'

import { calculateCouponDiscount, type CouponDoc } from '@/lib/coupons'
import { getPayloadClient } from '@/lib/payload'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      code?: string
      email?: string
      lines?: {
        productId: string
        categoryId?: string
        quantity: number
        unitPrice: number
        onSale?: boolean
      }[]
    }

    const code = body.code?.trim().toUpperCase()
    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 })
    }

    const lines = Array.isArray(body.lines) ? body.lines : []
    if (!lines.length) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const payload = await getPayloadClient()
    const found = await payload.find({
      collection: 'coupons',
      where: { code: { equals: code } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const doc = found.docs[0] as unknown as CouponDoc | undefined
    if (!doc) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 404 })
    }

    let userUsageCount: number | undefined
    if (body.email && doc.usageLimitPerUser != null) {
      const used = await payload.find({
        collection: 'orders',
        where: {
          and: [
            { email: { equals: body.email } },
            { coupon: { equals: doc.id } },
            {
              status: {
                in: ['processing', 'completed', 'on-hold'],
              },
            },
          ],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      // Approximate: count docs via separate count if available
      const counted = await payload.count({
        collection: 'orders',
        where: {
          and: [
            { email: { equals: body.email } },
            { coupon: { equals: doc.id } },
            {
              status: {
                in: ['processing', 'completed', 'on-hold'],
              },
            },
          ],
        },
        overrideAccess: true,
      })
      userUsageCount = counted.totalDocs
      void used
    }

    const result = calculateCouponDiscount(doc, lines, {
      email: body.email,
      userUsageCount,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      discountAmount: result.discountAmount,
      freeShipping: result.freeShipping,
      coupon: result.coupon,
      finalPrice: Math.max(
        0,
        lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) - result.discountAmount,
      ),
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 })
  }
}
