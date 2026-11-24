import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'

import { isStaff } from '@/access/roles'
import { getPayloadClient } from '@/lib/payload'

function randomCode(prefix: string, length: number) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let body = ''
  for (let i = 0; i < length; i++) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `${prefix}${body}`.toUpperCase()
}

export async function POST(req: Request) {
  try {
    const payload = await getPayloadClient()
    const headers = await getHeaders()
    const { user } = await payload.auth({ headers })
    if (!isStaff(user as { role?: 'admin' | 'shop-manager' | 'customer' } | null)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as {
      prefix?: string
      count?: number
      length?: number
      template?: Record<string, unknown>
    }

    const prefix = (body.prefix || 'SAVE').trim().toUpperCase()
    const count = Math.min(100, Math.max(1, Number(body.count) || 1))
    const length = Math.min(16, Math.max(4, Number(body.length) || 8))

    const codes: string[] = []
    for (let i = 0; i < count; i++) {
      let code = randomCode(prefix, length)
      let attempts = 0
      while (attempts < 8) {
        const exists = await payload.find({
          collection: 'coupons',
          where: { code: { equals: code } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
        if (!exists.docs[0]) break
        code = randomCode(prefix, length)
        attempts += 1
      }

      await payload.create({
        collection: 'coupons',
        data: {
          code,
          active: true,
          discountType: 'percent',
          amount: 10,
          description: 'Auto-generated coupon',
          ...(body.template || {}),
        },
        locale: 'en',
        overrideAccess: true,
      })
      codes.push(code)
    }

    return NextResponse.json({ codes })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to generate coupons' }, { status: 500 })
  }
}
