import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'

import { isStaff, type UserWithRole } from '@/access/roles'
import {
  InvoiceError,
  isSellerReady,
  issueOrderDocument,
  loadInvoicingSettings,
  publicDocumentPath,
  voidOrderDocument,
} from '@/lib/invoices'
import { getPayloadClient } from '@/lib/payload'

async function requireStaff() {
  const payload = await getPayloadClient()
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!isStaff(user as UserWithRole | null)) return { payload, user: null }
  return { payload, user }
}

function summary(doc: {
  id: number | string
  number: string
  kind: 'proforma' | 'invoice'
  status: 'issued' | 'void' | 'superseded'
  issuedAt?: string | null
  validUntil?: string | null
  voidReason?: string | null
  total?: number | null
  currency?: 'usd' | 'irt' | null
  viewToken?: string | null
}) {
  return {
    id: doc.id,
    number: doc.number,
    kind: doc.kind,
    status: doc.status,
    issuedAt: doc.issuedAt,
    validUntil: doc.validUntil,
    voidReason: doc.voidReason,
    total: doc.total,
    currency: doc.currency,
    href: doc.status === 'void' ? null : publicDocumentPath(doc),
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { payload, user } = await requireStaff()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await ctx.params
    const order = await payload.findByID({
      collection: 'orders',
      id,
      depth: 0,
      overrideAccess: true,
    })
    const [docs, settings] = await Promise.all([
      payload.find({
        collection: 'invoices',
        where: { order: { equals: order.id } },
        sort: '-createdAt',
        limit: 20,
        depth: 0,
        overrideAccess: true,
      }),
      loadInvoicingSettings({ payload }),
    ])

    return NextResponse.json({
      sellerReady: isSellerReady(settings),
      orderStatus: order.status,
      documents: docs.docs.map((doc) => summary(doc)),
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load invoices' }, { status: 500 })
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { payload, user } = await requireStaff()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await ctx.params
    const body = (await req.json()) as {
      action?: string
      kind?: 'proforma' | 'invoice'
      invoiceId?: string | number
      reason?: string
    }

    if (body.action === 'issue') {
      if (body.kind !== 'proforma' && body.kind !== 'invoice') {
        return NextResponse.json({ error: 'Choose a pre-invoice or an invoice.' }, { status: 400 })
      }
      const doc = await issueOrderDocument({ payload, orderId: id, kind: body.kind })
      return NextResponse.json({ document: summary(doc) })
    }

    if (body.action === 'void') {
      if (body.invoiceId == null) {
        return NextResponse.json({ error: 'Missing document.' }, { status: 400 })
      }
      await voidOrderDocument({
        payload,
        orderId: id,
        invoiceId: body.invoiceId,
        reason: body.reason || '',
      })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (err) {
    if (err instanceof InvoiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error(err)
    return NextResponse.json({ error: 'Failed to update the document' }, { status: 500 })
  }
}
