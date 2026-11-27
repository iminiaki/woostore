import Link from 'next/link'
import type { ReactNode } from 'react'

import { TomanMark } from '@/components/toman-mark'
import { PrintButton } from '@/components/print-button'
import {
  formatDate,
  formatMoney,
  formatQty,
  isExpired,
  lineDetail,
  partyLines,
  paymentLabel,
  voidReasonLabel,
  type InvoiceLang,
  type InvoiceView,
} from '@/lib/invoice-format'

const text = {
  fa: {
    proforma: 'پیش‌فاکتور',
    invoice: 'فاکتور',
    proformaNote: 'این برگه پیش‌فاکتور است و فاکتور رسمی مالیاتی نیست.',
    invoiceNote: 'فاکتور فروش این سفارش.',
    print: 'چاپ',
    order: 'سفارش',
    issued: 'تاریخ صدور',
    valid: 'اعتبار تا',
    expired: 'مهلت این پیش‌فاکتور تمام شده. برای پرداخت با فروشگاه هماهنگ کنید.',
    seller: 'فروشنده',
    buyer: 'خریدار',
    nationalId: 'شناسه ملی',
    economic: 'کد اقتصادی',
    registration: 'شماره ثبت',
    item: 'شرح',
    sku: 'کد',
    qty: 'تعداد',
    unit: 'فی',
    amount: 'مبلغ',
    subtotal: 'جمع جزء',
    discount: 'تخفیف',
    shipping: 'ارسال',
    freeShipping: 'رایگان',
    tax: 'مالیات',
    total: 'قابل پرداخت',
    orderTotal: 'جمع کل',
    wallet: 'کیف پول',
    coupon: 'کد تخفیف',
    payment: 'روش پرداخت',
    note: 'یادداشت مشتری',
    void: 'باطل',
    superseded: 'جایگزین شده',
    supersededNote: 'فاکتور رسمی این سفارش جایگزین این پیش‌فاکتور شده است.',
  },
  en: {
    proforma: 'Pre-invoice',
    invoice: 'Invoice',
    proformaNote: 'This is a pre-invoice, not an official tax invoice.',
    invoiceNote: 'Sales invoice for this order.',
    print: 'Print',
    order: 'Order',
    issued: 'Issued',
    valid: 'Valid until',
    expired: 'This pre-invoice is past its validity date. Contact the store before paying.',
    seller: 'Seller',
    buyer: 'Buyer',
    nationalId: 'National ID',
    economic: 'Economic code',
    registration: 'Registration no.',
    item: 'Description',
    sku: 'SKU',
    qty: 'Qty',
    unit: 'Unit',
    amount: 'Amount',
    subtotal: 'Subtotal',
    discount: 'Discount',
    shipping: 'Shipping',
    freeShipping: 'Free',
    tax: 'Tax',
    total: 'Amount due',
    orderTotal: 'Order total',
    wallet: 'Wallet',
    coupon: 'Coupon',
    payment: 'Payment',
    note: 'Customer note',
    void: 'VOID',
    superseded: 'SUPERSEDED',
    supersededNote: 'The official invoice for this order replaced this pre-invoice.',
  },
} as const

export function InvoiceDocument({
  doc,
  lang,
  token,
}: {
  doc: InvoiceView
  lang: InvoiceLang
  token: string
}) {
  const t = text[lang]
  const title = doc.kind === 'proforma' ? t.proforma : t.invoice
  const expired = isExpired(doc)
  const stamp = doc.status === 'void' ? t.void : doc.status === 'superseded' ? t.superseded : null
  const other = lang === 'fa' ? 'en' : 'fa'
  const switchHref = `/documents/${encodeURIComponent(doc.number)}?${new URLSearchParams({
    token,
    lang: other,
  }).toString()}`
  const sellerLines = partyLines(doc.seller, lang)
  const buyerLines = partyLines(doc.buyer, lang)
  const money = (amount: number) => {
    if (doc.currency === 'irt' && lang === 'fa') {
      const formatted = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(
        Math.round(Number(amount) || 0),
      )
      return (
        <span className="money">
          {formatted}
          <TomanMark className="text-current dark:text-current" />
        </span>
      )
    }
    return formatMoney(amount, doc.currency, lang)
  }

  return (
    <div className="page" data-lang={lang}>
      <div className="toolbar no-print">
        <div className="langs">
          <Link href={switchHref} className="toolbar-btn">
            {lang === 'fa' ? 'English' : 'فارسی'}
          </Link>
        </div>
        <PrintButton label={t.print} />
      </div>

      <article className="sheet" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
        {stamp ? <div className="stamp">{stamp}</div> : null}
        <header className="head">
          <div>
            <p className="seller-name">{doc.seller.name || 'Lastore'}</p>
            {sellerLines.map((line) => (
              <p key={line} className="muted">
                {line}
              </p>
            ))}
            {doc.seller.phone ? (
              <p className="muted">
                <span className="ltr">{doc.seller.phone}</span>
              </p>
            ) : null}
            {doc.seller.email ? (
              <p className="muted">
                <span className="ltr">{doc.seller.email}</span>
              </p>
            ) : null}
            <dl className="ids">
              {doc.seller.nationalId ? (
                <div>
                  <dt>{t.nationalId}</dt>
                  <dd>
                    <span className="ltr">{doc.seller.nationalId}</span>
                  </dd>
                </div>
              ) : null}
              {doc.seller.economicCode ? (
                <div>
                  <dt>{t.economic}</dt>
                  <dd>
                    <span className="ltr">{doc.seller.economicCode}</span>
                  </dd>
                </div>
              ) : null}
              {doc.seller.registrationNo ? (
                <div>
                  <dt>{t.registration}</dt>
                  <dd>
                    <span className="ltr">{doc.seller.registrationNo}</span>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
          <div className="title-block">
            <h1>{title}</h1>
            <p className="doc-number">
              <span className="ltr">{doc.number}</span>
            </p>
            <p className="muted">{doc.kind === 'proforma' ? t.proformaNote : t.invoiceNote}</p>
            <dl className="meta">
              <div>
                <dt>{t.order}</dt>
                <dd>
                  <span className="ltr">{doc.orderNumber}</span>
                </dd>
              </div>
              <div>
                <dt>{t.issued}</dt>
                <dd>{formatDate(doc.issuedAt, lang)}</dd>
              </div>
              {doc.kind === 'proforma' && doc.validUntil ? (
                <div>
                  <dt>{t.valid}</dt>
                  <dd>{formatDate(doc.validUntil, lang)}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </header>

        {expired ? <p className="banner">{t.expired}</p> : null}
        {doc.status === 'superseded' ? <p className="banner">{t.supersededNote}</p> : null}
        {doc.status === 'void' && doc.voidReason ? (
          <p className="banner">{voidReasonLabel(doc.voidReason, lang)}</p>
        ) : null}

        <section className="buyer">
          <h2>{t.buyer}</h2>
          <p className="buyer-name">{doc.buyer.name}</p>
          {buyerLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {doc.buyer.phone ? (
            <p>
              <span className="ltr">{doc.buyer.phone}</span>
            </p>
          ) : null}
          {doc.buyer.email ? (
            <p>
              <span className="ltr">{doc.buyer.email}</span>
            </p>
          ) : null}
        </section>

        <table>
          <thead>
            <tr>
              <th>{t.item}</th>
              <th>{t.sku}</th>
              <th className="num">{t.qty}</th>
              <th className="num">{t.unit}</th>
              <th className="num">{t.amount}</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((line, index) => {
              const detail = lineDetail(line, lang)
              return (
                <tr key={`${line.title}-${index}`}>
                  <td>
                    <div>{line.title}</div>
                    {detail ? <div className="muted">{detail}</div> : null}
                  </td>
                  <td>
                    <span className="ltr">{line.sku}</span>
                  </td>
                  <td className="num">{formatQty(line.quantity, lang)}</td>
                  <td className="num">{money(line.unitPrice)}</td>
                  <td className="num">{money(line.lineTotal)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <section className="totals">
          <Row label={t.subtotal} value={money(doc.subtotal)} />
          {doc.discountTotal > 0 ? (
            <Row
              label={doc.couponCode ? `${t.discount} (${doc.couponCode})` : t.discount}
              value={money(doc.discountTotal)}
            />
          ) : null}
          <Row
            label={t.shipping}
            value={doc.freeShipping || doc.shippingTotal === 0 ? t.freeShipping : money(doc.shippingTotal)}
          />
          {doc.taxTotal > 0 ? <Row label={t.tax} value={money(doc.taxTotal)} /> : null}
          {(doc.walletAmount || 0) > 0 ? (
            <>
              <Row label={t.orderTotal} value={money(doc.total)} />
              <Row label={t.wallet} value={money(doc.walletAmount || 0)} />
              <Row
                label={t.total}
                value={money(Math.max(0, doc.total - (doc.walletAmount || 0)))}
                strong={true}
              />
            </>
          ) : (
            <Row label={t.total} value={money(doc.total)} strong={true} />
          )}
        </section>

        <footer className="foot">
          {doc.paymentMethod ? (
            <p>
              {t.payment}: {paymentLabel(doc.paymentMethod, lang)}
            </p>
          ) : null}
          {doc.customerNote ? (
            <p>
              {t.note}: {doc.customerNote}
            </p>
          ) : null}
          {doc.footerNote ? <p className="footer-note">{doc.footerNote}</p> : null}
        </footer>
      </article>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className={strong ? 'total-row is-strong' : 'total-row'}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
