export type InvoiceLang = 'fa' | 'en'

export type InvoiceKind = 'proforma' | 'invoice'

export type InvoiceStatus = 'issued' | 'void' | 'superseded'

export type InvoiceParty = {
  name?: string | null
  email?: string | null
  phone?: string | null
  nationalId?: string | null
  economicCode?: string | null
  registrationNo?: string | null
  address?: string | null
  country?: string | null
  state?: string | null
  city?: string | null
  address1?: string | null
  address2?: string | null
  postalCode?: string | null
  postcode?: string | null
}

export type InvoiceLineView = {
  title: string
  sku?: string | null
  color?: string | null
  size?: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type InvoiceView = {
  number: string
  kind: InvoiceKind
  status: InvoiceStatus
  issuedAt: string
  validUntil?: string | null
  voidReason?: string | null
  orderNumber: string
  currency: 'usd' | 'irt'
  seller: InvoiceParty
  buyer: InvoiceParty
  lines: InvoiceLineView[]
  subtotal: number
  discountTotal: number
  shippingTotal: number
  taxTotal: number
  total: number
  couponCode?: string | null
  freeShipping?: boolean | null
  paymentMethod?: string | null
  customerNote?: string | null
  footerNote?: string | null
}

const VOID_REASONS: Record<string, { fa: string; en: string }> = {
  'order-cancelled': { fa: 'سفارش لغو شد', en: 'The order was cancelled' },
  'order-failed': { fa: 'سفارش ناموفق بود', en: 'The order failed' },
  'order-refunded': { fa: 'سفارش بازپرداخت شد', en: 'The order was refunded' },
}

const PAYMENT_METHODS: Record<string, { fa: string; en: string }> = {
  cod: { fa: 'پرداخت در محل', en: 'Cash on delivery' },
}

export function formatMoney(amount: number, currency: 'usd' | 'irt', lang: InvoiceLang) {
  const locale = lang === 'fa' ? 'fa-IR' : 'en-US'
  const value = Number(amount) || 0
  if (currency === 'irt') {
    const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
      Math.round(value),
    )
    return lang === 'fa' ? `${formatted} تومان` : `${formatted} IRT`
  }
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(value)
}

export function formatQty(amount: number, lang: InvoiceLang) {
  const locale = lang === 'fa' ? 'fa-IR' : 'en-US'
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Number(amount) || 0)
}

export function formatDate(iso: string | null | undefined, lang: InvoiceLang) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  if (lang === 'fa') {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'long' }).format(date)
  }
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(date)
}

export function isExpired(doc: Pick<InvoiceView, 'kind' | 'status' | 'validUntil'>, now = Date.now()) {
  if (doc.kind !== 'proforma' || doc.status !== 'issued' || !doc.validUntil) return false
  const until = new Date(doc.validUntil).getTime()
  return Number.isFinite(until) && until < now
}

export function paymentLabel(method: string | null | undefined, lang: InvoiceLang) {
  if (!method) return ''
  return PAYMENT_METHODS[method]?.[lang] || method
}

export function voidReasonLabel(reason: string | null | undefined, lang: InvoiceLang) {
  if (!reason) return ''
  return VOID_REASONS[reason]?.[lang] || reason
}

export function partyLines(party: InvoiceParty, lang: InvoiceLang) {
  const cityLine = [party.city, party.state].filter(Boolean).join(lang === 'fa' ? '، ' : ', ')
  const street = party.address || [party.address1, party.address2].filter(Boolean).join(lang === 'fa' ? '، ' : ', ')
  return [street, cityLine, party.postalCode || party.postcode, party.country].filter(
    (line): line is string => Boolean(line && String(line).trim()),
  )
}

export function lineDetail(line: Pick<InvoiceLineView, 'color' | 'size'>, lang: InvoiceLang) {
  const bits: string[] = []
  if (line.color) bits.push(lang === 'fa' ? `رنگ: ${line.color}` : `Color: ${line.color}`)
  if (line.size) bits.push(lang === 'fa' ? `سایز: ${line.size}` : `Size: ${line.size}`)
  return bits.join(lang === 'fa' ? ' · ' : ' · ')
}

export function documentPath(number: string, token: string, lang?: InvoiceLang) {
  const query = new URLSearchParams({ token })
  if (lang) query.set('lang', lang)
  return `/documents/${encodeURIComponent(number)}?${query.toString()}`
}

/** Customer-facing path only. Rejects anything that is not this site's document route. */
export function safeDocumentPath(value: string | undefined | null) {
  if (!value || !value.startsWith('/documents/')) return null
  if (value.includes('://') || value.includes('\\') || value.includes('..')) return null
  return value
}
