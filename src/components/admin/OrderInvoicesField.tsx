'use client'

import { Button, toast, useDocumentInfo, useFormFields, useTranslation } from '@payloadcms/ui'
import React, { useCallback, useEffect, useState } from 'react'

import { playErrorSound, playSuccessSound } from '@/lib/feedback-sounds'
import { formatDate, formatMoney, isExpired, voidReasonLabel } from '@/lib/invoice-format'
import { TomanMark } from '@/components/toman-mark'

type Kind = 'proforma' | 'invoice'

type DocSummary = {
  id: number | string
  number: string
  kind: Kind
  status: 'issued' | 'void' | 'superseded'
  issuedAt?: string | null
  validUntil?: string | null
  voidReason?: string | null
  total?: number | null
  currency?: 'usd' | 'irt' | null
  href?: string | null
}

type Payload = {
  sellerReady: boolean
  orderStatus: string
  documents: DocSummary[]
}

const copy = {
  en: {
    title: 'Invoices',
    intro:
      'Each order has one pre-invoice (the quote the customer can pay against) and, once you bill it, one invoice. Amounts are copied from the order and stay fixed.',
    proforma: 'Pre-invoice',
    invoice: 'Invoice',
    proformaHelp: 'Created when the order is placed. Not a tax invoice.',
    invoiceHelp: 'The official bill. Issued automatically when the order is marked Completed.',
    empty: 'Not issued yet',
    issueProforma: 'Issue pre-invoice',
    issueInvoice: 'Issue invoice',
    print: 'Print',
    copy: 'Copy link',
    void: 'Void',
    confirm: 'Void document',
    cancel: 'Cancel',
    reason: 'Reason',
    issued: 'Issued',
    voided: 'Void',
    superseded: 'Superseded by invoice',
    expired: 'Past the validity date',
    validUntil: 'Valid until',
    issuedOn: 'Issued',
    sellerWarning:
      'Seller legal name and address are empty. Fill them in Store Settings → Invoicing. Documents issued before that stay as they are.',
    unsaved: 'Save the order before issuing. These actions use the saved status.',
    cannotInvoice: 'The invoice can be issued while the order is processing, on hold, or completed.',
    closedInvoice:
      'This order is closed, but the invoice is still issued. Void it if it should not stand.',
    copied: 'Link copied',
    copyFailed: 'Could not copy the link',
    failed: 'Something went wrong',
    loading: 'Loading documents…',
  },
  fa: {
    title: 'فاکتور',
    intro:
      'هر سفارش یک پیش‌فاکتور دارد (مبلغ قابل پرداخت برای مشتری) و بعد از صدور، یک فاکتور. مبالغ از سفارش کپی می‌شوند و بعداً عوض نمی‌شوند.',
    proforma: 'پیش‌فاکتور',
    invoice: 'فاکتور',
    proformaHelp: 'با ثبت سفارش ساخته می‌شود. فاکتور رسمی نیست.',
    invoiceHelp: 'صورتحساب رسمی. با تکمیل سفارش به‌طور خودکار صادر می‌شود.',
    empty: 'هنوز صادر نشده',
    issueProforma: 'صدور پیش‌فاکتور',
    issueInvoice: 'صدور فاکتور',
    print: 'چاپ',
    copy: 'کپی لینک',
    void: 'ابطال',
    confirm: 'ابطال سند',
    cancel: 'انصراف',
    reason: 'دلیل',
    issued: 'صادر شده',
    voided: 'باطل',
    superseded: 'جایگزین با فاکتور',
    expired: 'اعتبار تمام شده',
    validUntil: 'اعتبار تا',
    issuedOn: 'تاریخ صدور',
    sellerWarning:
      'نام حقوقی و آدرس فروشنده خالی است. آن‌ها را در تنظیمات فروشگاه → فاکتور پر کنید. سندهایی که قبلاً صادر شده‌اند تغییر نمی‌کنند.',
    unsaved: 'قبل از صدور، سفارش را ذخیره کنید. این دکمه‌ها وضعیت ذخیره‌شده را می‌بینند.',
    cannotInvoice: 'فاکتور وقتی صادر می‌شود که سفارش در حال پردازش، معلق یا تکمیل‌شده باشد.',
    closedInvoice: 'سفارش بسته شده ولی فاکتور هنوز معتبر است. اگر نباید بماند، آن را باطل کنید.',
    copied: 'لینک کپی شد',
    copyFailed: 'کپی لینک انجام نشد',
    failed: 'خطا',
    loading: 'در حال بارگذاری…',
  },
} as const

const INVOICE_OK = new Set(['processing', 'on-hold', 'completed'])
const CLOSED = new Set(['cancelled', 'failed', 'refunded'])

function statusLabel(doc: DocSummary, lang: 'fa' | 'en') {
  const t = copy[lang]
  if (doc.status === 'void') return t.voided
  if (doc.status === 'superseded') return t.superseded
  if (isExpired(doc)) return t.expired
  return t.issued
}

export function OrderInvoicesField() {
  const { i18n } = useTranslation()
  const lang = i18n.language === 'fa' ? 'fa' : 'en'
  const t = copy[lang]
  const { id, lastUpdateTime } = useDocumentInfo()
  const formStatus = useFormFields(([fields]) => fields.status?.value) as string | undefined
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [voiding, setVoiding] = useState<DocSummary | null>(null)
  const [reason, setReason] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    try {
      const res = await fetch(`/api/store/orders/${id}/invoices`, { credentials: 'include' })
      const body = (await res.json()) as Payload & { error?: string }
      if (!res.ok) {
        setError(body.error || t.failed)
        return
      }
      setError(null)
      setData(body)
    } catch {
      setError(t.failed)
    }
  }, [id, t.failed])

  useEffect(() => {
    void load()
  }, [load, lastUpdateTime])

  const act = useCallback(
    async (payload: Record<string, unknown>, key: string) => {
      if (!id) return
      setBusy(key)
      try {
        const res = await fetch(`/api/store/orders/${id}/invoices`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const body = (await res.json()) as { error?: string }
        if (!res.ok) {
          playErrorSound()
          toast.error(body.error || t.failed)
          return
        }
        playSuccessSound()
        setVoiding(null)
        setReason('')
        await load()
      } catch {
        playErrorSound()
        toast.error(t.failed)
      } finally {
        setBusy(null)
      }
    },
    [id, load, t.failed],
  )

  const copyLink = useCallback(
    async (href: string) => {
      try {
        await navigator.clipboard.writeText(`${window.location.origin}${href}`)
        toast.success(t.copied)
      } catch {
        toast.error(t.copyFailed)
      }
    },
    [t.copied, t.copyFailed],
  )

  if (!id) return null

  const docs = data?.documents || []
  const proforma = docs.find((doc) => doc.kind === 'proforma' && doc.status !== 'void') || docs.find((doc) => doc.kind === 'proforma')
  const invoice = docs.find((doc) => doc.kind === 'invoice' && doc.status !== 'void') || docs.find((doc) => doc.kind === 'invoice')
  const orderStatus = data?.orderStatus || ''
  const unsaved = Boolean(formStatus && orderStatus && formStatus !== orderStatus)
  const liveInvoice = docs.some((doc) => doc.kind === 'invoice' && doc.status !== 'void')

  return (
    <div
      style={{
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 4,
        padding: 16,
        display: 'grid',
        gap: 14,
        marginBottom: 16,
      }}
    >
      <div>
        <strong>{t.title}</strong>
        <p style={{ margin: '6px 0 0', color: 'var(--theme-elevation-800)', fontSize: 13 }}>{t.intro}</p>
      </div>

      {!data && !error ? <p style={{ margin: 0, fontSize: 13 }}>{t.loading}</p> : null}
      {error ? <p style={{ margin: 0, fontSize: 13 }}>{error}</p> : null}
      {data && !data.sellerReady ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--theme-warning-600, #92400e)' }}>{t.sellerWarning}</p>
      ) : null}
      {unsaved ? <p style={{ margin: 0, fontSize: 13 }}>{t.unsaved}</p> : null}
      {CLOSED.has(orderStatus) && invoice?.status === 'issued' ? (
        <p style={{ margin: 0, fontSize: 13 }}>{t.closedInvoice}</p>
      ) : null}

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <DocumentCard
          title={t.proforma}
          help={t.proformaHelp}
          doc={proforma}
          lang={lang}
          busy={busy}
          onPrint={(href) => window.open(href, '_blank', 'noopener')}
          onCopy={copyLink}
          onVoid={(doc) => {
            setVoiding(doc)
            setReason('')
          }}
          issueLabel={t.issueProforma}
          canIssue={!liveInvoice && !CLOSED.has(orderStatus) && proforma?.status !== 'issued' && proforma?.status !== 'superseded'}
          onIssue={() => act({ action: 'issue', kind: 'proforma' }, 'issue-proforma')}
          labels={t}
        />
        <DocumentCard
          title={t.invoice}
          help={t.invoiceHelp}
          doc={invoice}
          lang={lang}
          busy={busy}
          onPrint={(href) => window.open(href, '_blank', 'noopener')}
          onCopy={copyLink}
          onVoid={(doc) => {
            setVoiding(doc)
            setReason('')
          }}
          issueLabel={t.issueInvoice}
          canIssue={!liveInvoice && INVOICE_OK.has(orderStatus)}
          cannotHint={!liveInvoice && !INVOICE_OK.has(orderStatus) ? t.cannotInvoice : undefined}
          onIssue={() => act({ action: 'issue', kind: 'invoice' }, 'issue-invoice')}
          labels={t}
        />
      </div>

      {voiding ? (
        <div style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            {t.reason}
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              style={{ padding: '8px 10px' }}
            />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              buttonStyle="secondary"
              disabled={busy !== null || reason.trim().length < 3}
              onClick={() =>
                act({ action: 'void', invoiceId: voiding.id, reason: reason.trim() }, `void-${voiding.id}`)
              }
              type="button"
            >
              {t.confirm}
            </Button>
            <Button buttonStyle="secondary" onClick={() => setVoiding(null)} type="button">
              {t.cancel}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function DocumentCard({
  title,
  help,
  doc,
  lang,
  busy,
  labels,
  canIssue,
  cannotHint,
  issueLabel,
  onIssue,
  onPrint,
  onCopy,
  onVoid,
}: {
  title: string
  help: string
  doc?: DocSummary
  lang: 'fa' | 'en'
  busy: string | null
  labels: (typeof copy)['en'] | (typeof copy)['fa']
  canIssue: boolean
  cannotHint?: string
  issueLabel: string
  onIssue: () => void
  onPrint: (href: string) => void
  onCopy: (href: string) => void
  onVoid: (doc: DocSummary) => void
}) {
  const currency = doc?.currency === 'irt' ? 'irt' : 'usd'
  return (
    <div
      style={{
        border: '1px solid var(--theme-elevation-100)',
        borderRadius: 4,
        padding: 12,
        display: 'grid',
        gap: 8,
        alignContent: 'start',
      }}
    >
      <div>
        <strong>{title}</strong>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--theme-elevation-700)' }}>{help}</p>
      </div>
      {!doc ? <p style={{ margin: 0, fontSize: 13 }}>{labels.empty}</p> : null}
      {doc ? (
        <div style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{doc.number}</span>
            {' · '}
            {statusLabel(doc, lang)}
          </div>
          {doc.issuedAt ? (
            <div>
              {labels.issuedOn}: {formatDate(doc.issuedAt, lang)}
            </div>
          ) : null}
          {doc.kind === 'proforma' && doc.validUntil && doc.status === 'issued' ? (
            <div>
              {labels.validUntil}: {formatDate(doc.validUntil, lang)}
            </div>
          ) : null}
          {doc.total != null ? (
            <div>
              {currency === 'irt' && lang === 'fa' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(Math.round(doc.total))}
                  <TomanMark className="text-current dark:text-current" />
                </span>
              ) : (
                formatMoney(doc.total, currency, lang)
              )}
            </div>
          ) : null}
          {doc.status === 'void' && doc.voidReason ? (
            <div>{voidReasonLabel(doc.voidReason, lang)}</div>
          ) : null}
        </div>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {canIssue ? (
          <Button buttonStyle="secondary" disabled={busy !== null} onClick={onIssue} type="button">
            {busy?.startsWith('issue') ? '…' : issueLabel}
          </Button>
        ) : null}
        {doc?.href && doc.status !== 'void' ? (
          <>
            <Button buttonStyle="secondary" onClick={() => onPrint(doc.href || '')} type="button">
              {labels.print}
            </Button>
            <Button buttonStyle="secondary" onClick={() => onCopy(doc.href || '')} type="button">
              {labels.copy}
            </Button>
          </>
        ) : null}
        {doc?.status === 'issued' ? (
          <Button buttonStyle="secondary" disabled={busy !== null} onClick={() => onVoid(doc)} type="button">
            {labels.void}
          </Button>
        ) : null}
      </div>
      {cannotHint ? <p style={{ margin: 0, fontSize: 12, color: 'var(--theme-elevation-700)' }}>{cannotHint}</p> : null}
    </div>
  )
}
