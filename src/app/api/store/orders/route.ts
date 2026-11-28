import { NextResponse } from 'next/server'
import { APIError } from 'payload'

import { calculateCouponDiscount, type CouponDoc } from '@/lib/coupons'
import { publicDocumentPath } from '@/lib/invoices'
import { getPayloadClient } from '@/lib/payload'
import { applyWalletEntry, roundMoney } from '@/lib/wallet'

type OrderBody = {
  email: string
  name?: string
  phone?: string
  note?: string
  paymentMethod?: string
  useWallet?: boolean
  currency?: 'usd' | 'irt'
  couponCode?: string
  shippingTotal?: number
  billing?: Record<string, string>
  shipping?: Record<string, string>
  items: {
    productId: string
    quantity: number
    variantKey?: string
    color?: string
    size?: string
    unitPrice: number
  }[]
}

export async function POST(req: Request) {
  let walletSpent = 0
  let walletEmail = ''
  let orderPlaced = false

  try {
    const body = (await req.json()) as OrderBody
    if (!body.email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    if (!Array.isArray(body.items) || !body.items.length) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const payload = await getPayloadClient()
    const lineRows: Record<string, unknown>[] = []
    let subtotal = 0

    for (const item of body.items) {
      let product: Awaited<ReturnType<typeof payload.findByID>> | null = null
      try {
        product = await payload.findByID({
          collection: 'products',
          id: item.productId,
          depth: 2,
          locale: 'en',
          overrideAccess: true,
        })
      } catch {
        product = null
      }

      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 400 },
        )
      }

      const qty = Math.max(1, Number(item.quantity) || 1)
      const unitPrice = Number(item.unitPrice)
      const lineTotal = unitPrice * qty
      subtotal += lineTotal

      const category =
        typeof product.category === 'object' && product.category
          ? (product.category as { id?: string | number; slug?: string; name?: string })
          : null

      lineRows.push({
        product: product.id,
        productTitle: String(product.title || 'Product'),
        sku: product.sku || undefined,
        variantKey: item.variantKey,
        color: item.color,
        size: item.size,
        quantity: qty,
        unitPrice,
        lineTotal,
        category: category?.id,
        categorySlug: category?.slug,
        categoryName: category?.name,
      })
    }

    let discountTotal = 0
    let couponId: string | number | undefined
    let couponCode: string | undefined
    let freeShipping = false

    if (body.couponCode?.trim()) {
      const found = await payload.find({
        collection: 'coupons',
        where: { code: { equals: body.couponCode.trim().toUpperCase() } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      const coupon = found.docs[0] as unknown as CouponDoc | undefined
      if (!coupon) {
        return NextResponse.json({ error: 'Invalid coupon code' }, { status: 400 })
      }

      const result = calculateCouponDiscount(
        coupon,
        body.items.map((i, idx) => ({
          productId: String(i.productId),
          categoryId: lineRows[idx]?.category != null ? String(lineRows[idx].category) : undefined,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        { email: body.email, currency: body.currency === 'irt' ? 'irt' : 'usd' },
      )
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      discountTotal = result.discountAmount
      freeShipping = result.freeShipping
      couponId = coupon.id
      couponCode = coupon.code
    }

    const shippingTotal = freeShipping ? 0 : Number(body.shippingTotal || 0)
    const taxTotal = 0
    const total = roundMoney(Math.max(0, subtotal - discountTotal + shippingTotal + taxTotal))

    if (body.useWallet && (body.currency || 'usd') !== 'usd') {
      return NextResponse.json({ error: 'Wallet payments are in USD.' }, { status: 400 })
    }

    let walletAmount = 0
    let walletTransactionId: number | string | null = null
    if (body.useWallet && total > 0) {
      walletEmail = body.email.trim().toLowerCase()
      const applied = await applyWalletEntry({
        payload,
        email: walletEmail,
        type: 'debit',
        amount: total,
        note: 'Checkout',
        upTo: true,
      })
      walletAmount = applied.amount
      walletTransactionId = applied.id
      walletSpent = walletAmount
    }

    const paymentMethod =
      walletAmount <= 0
        ? body.paymentMethod || 'cod'
        : walletAmount + 0.009 >= total
          ? 'wallet'
          : 'wallet+cod'

    const billing = body.billing || {}
    const shipping = body.shipping || {}

    const order = await payload.create({
      collection: 'orders',
      data: {
        status: 'processing',
        currency: body.currency || 'usd',
        email: body.email.trim().toLowerCase(),
        items: lineRows,
        subtotal,
        discountTotal,
        shippingTotal,
        taxTotal,
        total,
        coupon: couponId,
        couponCode,
        freeShipping,
        paymentMethod,
        walletAmount,
        walletRefunded: false,
        customerNote: body.note,
        billingName: billing.name || body.name,
        billingEmail: body.email,
        billingPhone: billing.phone || body.phone,
        billingCountry: billing.country,
        billingState: billing.state,
        billingCity: billing.city,
        billingAddress1: billing.address1,
        billingAddress2: billing.address2,
        billingPostcode: billing.postcode,
        shippingName: shipping.name || body.name,
        shippingEmail: body.email,
        shippingPhone: shipping.phone || body.phone,
        shippingCountry: shipping.country,
        shippingState: shipping.state,
        shippingCity: shipping.city,
        shippingAddress1: shipping.address1,
        shippingAddress2: shipping.address2,
        shippingPostcode: shipping.postcode,
      },
      overrideAccess: true,
    })
    orderPlaced = true

    if (walletTransactionId) {
      try {
        await payload.update({
          collection: 'wallet-transactions',
          id: walletTransactionId,
          data: {
            order: order.id,
            note: `Order ${order.orderNumber}`,
          },
          overrideAccess: true,
          context: { linkWalletOrder: true },
        })
      } catch (err) {
        console.error('wallet order link', err)
      }
    }

    let proformaUrl: string | null = null
    let proformaNumber: string | null = null
    try {
      const docs = await payload.find({
        collection: 'invoices',
        where: {
          and: [
            { order: { equals: order.id } },
            { kind: { equals: 'proforma' } },
            { status: { not_equals: 'void' } },
          ],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      const proforma = docs.docs[0]
      if (proforma) {
        proformaNumber = proforma.number
        proformaUrl = publicDocumentPath(proforma)
      }
    } catch (err) {
      console.error(err)
    }

    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      walletAmount: order.walletAmount || 0,
      status: order.status,
      proformaNumber,
      proformaUrl,
    })
  } catch (err) {
    if (!orderPlaced && walletSpent > 0 && walletEmail) {
      try {
        await applyWalletEntry({
          payload: await getPayloadClient(),
          email: walletEmail,
          type: 'refund',
          amount: walletSpent,
          note: 'Checkout reversed because the order was not created',
        })
      } catch (refundErr) {
        console.error('wallet checkout refund', refundErr)
      }
    }
    if (err instanceof APIError && err.status < 500) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error(err)
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 })
  }
}
