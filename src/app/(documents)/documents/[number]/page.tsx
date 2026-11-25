import type { Metadata } from 'next'

import { InvoiceDocument } from '@/components/invoice-document'
import type { InvoiceLang, InvoiceView } from '@/lib/invoice-format'
import { tokensMatch } from '@/lib/invoices'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

type Params = { number: string }
type Search = { token?: string; lang?: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { number } = await params
  return {
    title: decodeURIComponent(number),
    robots: { index: false, follow: false },
  }
}

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<Search>
}) {
  const { number } = await params
  const query = await searchParams
  const token = query.token || ''
  const lang: InvoiceLang = query.lang === 'en' ? 'en' : 'fa'
  const doc = await loadDocument(decodeURIComponent(number), token)

  if (!doc) {
    return (
      <main className="page">
        <article className="sheet">
          <h1>{lang === 'fa' ? 'این لینک معتبر نیست' : 'This link is not valid'}</h1>
          <p className="muted">
            {lang === 'fa'
              ? 'شماره یا رمز سند را از ایمیل یا صفحه سفارش دوباره باز کنید.'
              : 'Open the document again from the link on the order confirmation.'}
          </p>
        </article>
      </main>
    )
  }

  return <InvoiceDocument doc={doc} lang={lang} token={token} />
}

async function loadDocument(number: string, token: string): Promise<InvoiceView | null> {
  if (!number || !token) return null
  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: 'invoices',
    where: { number: { equals: number } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const raw = found.docs[0]
  if (!raw?.viewToken || !tokensMatch(token, raw.viewToken)) return null

  const seller = raw.seller || { name: 'Lastore' }
  const buyer = raw.buyer || {}
  return {
    number: raw.number,
    kind: raw.kind,
    status: raw.status,
    issuedAt: raw.issuedAt,
    validUntil: raw.validUntil,
    voidReason: raw.voidReason,
    orderNumber: raw.orderNumber,
    currency: raw.currency === 'irt' ? 'irt' : 'usd',
    seller: {
      name: seller.name,
      nationalId: seller.nationalId,
      economicCode: seller.economicCode,
      registrationNo: seller.registrationNo,
      address: seller.address,
      postalCode: seller.postalCode,
      phone: seller.phone,
      email: seller.email,
    },
    buyer: {
      name: buyer.name,
      email: buyer.email,
      phone: buyer.phone,
      country: buyer.country,
      state: buyer.state,
      city: buyer.city,
      address1: buyer.address1,
      address2: buyer.address2,
      postcode: buyer.postcode,
    },
    lines: (raw.lines || []).map((line) => ({
      title: line.title,
      sku: line.sku,
      color: line.color,
      size: line.size,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
    })),
    subtotal: raw.subtotal,
    discountTotal: raw.discountTotal || 0,
    shippingTotal: raw.shippingTotal || 0,
    taxTotal: raw.taxTotal || 0,
    total: raw.total,
    couponCode: raw.couponCode,
    freeShipping: raw.freeShipping,
    paymentMethod: raw.paymentMethod,
    walletAmount: Number(raw.walletAmount || 0),
    customerNote: raw.customerNote,
    footerNote: raw.footerNote,
  }
}
