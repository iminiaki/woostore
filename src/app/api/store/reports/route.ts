import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'

import { isStaff } from '@/access/roles'
import { getPayloadClient } from '@/lib/payload'
import { buildReportSummary, filterOrdersByRange, type ReportOrder } from '@/lib/reports'

export async function GET(req: Request) {
  try {
    const payload = await getPayloadClient()
    const headerStore = await getHeaders()
    let user: unknown = null
    try {
      ;({ user } = await payload.auth({ headers: headerStore }))
    } catch {
      user = null
    }
    if (!isStaff(user as { role?: 'admin' | 'shop-manager' | 'customer' } | null)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const result = await payload.find({
      collection: 'orders',
      depth: 1,
      limit: 1000,
      sort: '-createdAt',
      overrideAccess: true,
    })

    const orders = filterOrdersByRange(
      result.docs as unknown as ReportOrder[],
      from,
      to,
    )
    const summary = buildReportSummary(orders)

    return NextResponse.json(summary)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 })
  }
}
