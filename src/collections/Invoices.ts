import type { CollectionConfig } from 'payload'

import { staffOnly } from '@/access/roles'
import { t } from '@/i18n/admin'
import { activeSlot, canTransition, newViewToken, voidSlot } from '@/lib/invoices'

const lockedOnUpdate = [
  'number',
  'kind',
  'viewToken',
  'issuedAt',
  'validUntil',
  'order',
  'orderNumber',
  'currency',
  'seller',
  'buyer',
  'lines',
  'subtotal',
  'discountTotal',
  'shippingTotal',
  'taxTotal',
  'total',
  'couponCode',
  'freeShipping',
  'paymentMethod',
  'walletAmount',
  'customerNote',
  'footerNote',
] as const

const readOnly = { readOnly: true } as const

export const Invoices: CollectionConfig = {
  slug: 'invoices',
  labels: t.invoices,
  // Issued from checkout and the order screen, not by duplicating a document.
  disableDuplicate: true,
  admin: {
    useAsTitle: 'number',
    defaultColumns: ['number', 'kind', 'status', 'orderNumber', 'total', 'issuedAt'],
    group: t.commerce,
    description: {
      en: 'One pre-invoice and one invoice per order. Issued from the order. Snapshots are locked.',
      fa: 'هر سفارش یک پیش‌فاکتور و یک فاکتور دارد. از داخل سفارش صادر می‌شود و بعد از صدور قفل است.',
    },
  },
  access: {
    create: () => false,
    delete: () => false,
    read: staffOnly,
    update: staffOnly,
  },
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (!data || operation !== 'create') return data
        if (!data.viewToken) data.viewToken = newViewToken()
        if (!data.issuedAt) data.issuedAt = new Date().toISOString()
        if (!data.slot && data.order && data.kind) data.slot = activeSlot(data.order, String(data.kind))
        if (!data.status) data.status = 'issued'
        return data
      },
    ],
    beforeChange: [
      ({ data, originalDoc, operation }) => {
        if (operation !== 'update' || !data || !originalDoc) return data

        const kind = String(originalDoc.kind || '')
        const from = String(originalDoc.status || '')
        const to = String(data.status || from)
        if (!canTransition(kind, from, to)) {
          throw new Error('Issued documents are locked. Void the document instead of editing it.')
        }

        for (const key of lockedOnUpdate) {
          if (originalDoc[key] !== undefined) {
            data[key] = originalDoc[key]
          }
        }

        data.status = to
        if (to === 'void') {
          data.voidedAt = originalDoc.voidedAt || new Date().toISOString()
          data.voidReason = data.voidReason || originalDoc.voidReason || ''
          data.slot = voidSlot(originalDoc.order, kind, originalDoc.id)
        } else {
          data.voidedAt = null
          data.voidReason = null
          data.slot = activeSlot(originalDoc.order, kind)
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'printLink',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/admin/InvoicePrintLink#InvoicePrintLink',
        },
      },
    },
    {
      name: 'number',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: { en: 'Number', fa: 'شماره' },
      admin: { ...readOnly },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'kind',
          type: 'select',
          required: true,
          label: { en: 'Type', fa: 'نوع' },
          options: [
            { label: { en: 'Pre-invoice', fa: 'پیش‌فاکتور' }, value: 'proforma' },
            { label: { en: 'Invoice', fa: 'فاکتور' }, value: 'invoice' },
          ],
          admin: { ...readOnly },
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'issued',
          index: true,
          label: { en: 'Status', fa: 'وضعیت' },
          options: [
            { label: { en: 'Issued', fa: 'صادر شده' }, value: 'issued' },
            { label: { en: 'Void', fa: 'باطل' }, value: 'void' },
            { label: { en: 'Superseded by invoice', fa: 'جایگزین با فاکتور' }, value: 'superseded' },
          ],
          admin: { ...readOnly },
        },
      ],
    },
    {
      name: 'slot',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'viewToken',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: { en: 'Link token', fa: 'رمز لینک' },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: {
          en: 'Secret part of the customer link. Prefer the print button.',
          fa: 'بخش محرمانه لینک مشتری. دکمه چاپ را ترجیح بدهید.',
        },
      },
    },
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
      index: true,
      label: { en: 'Order', fa: 'سفارش' },
      admin: { position: 'sidebar', ...readOnly },
    },
    {
      name: 'orderNumber',
      type: 'text',
      required: true,
      index: true,
      label: { en: 'Order number', fa: 'شماره سفارش' },
      admin: { position: 'sidebar', ...readOnly },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'issuedAt',
          type: 'date',
          required: true,
          label: { en: 'Issued', fa: 'تاریخ صدور' },
          admin: { ...readOnly, date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'validUntil',
          type: 'date',
          label: { en: 'Valid until', fa: 'اعتبار تا' },
          admin: {
            ...readOnly,
            date: { pickerAppearance: 'dayAndTime' },
            description: {
              en: 'Pre-invoices only. The order is not cancelled when this date passes.',
              fa: 'فقط پیش‌فاکتور. با پایان اعتبار، سفارش لغو نمی‌شود.',
            },
          },
        },
        {
          name: 'voidedAt',
          type: 'date',
          label: { en: 'Voided', fa: 'تاریخ ابطال' },
          admin: { ...readOnly, date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      name: 'voidReason',
      type: 'textarea',
      label: { en: 'Void reason', fa: 'دلیل ابطال' },
      admin: { ...readOnly },
    },
    {
      name: 'currency',
      type: 'select',
      required: true,
      options: [
        { label: 'USD', value: 'usd' },
        { label: 'IRT', value: 'irt' },
      ],
      admin: { ...readOnly },
    },
    {
      name: 'seller',
      type: 'group',
      label: { en: 'Seller (snapshot)', fa: 'فروشنده' },
      admin: { ...readOnly },
      fields: [
        { name: 'name', type: 'text', required: true, admin: readOnly },
        { name: 'nationalId', type: 'text', label: { en: 'National ID', fa: 'شناسه ملی' }, admin: readOnly },
        { name: 'economicCode', type: 'text', label: { en: 'Economic code', fa: 'کد اقتصادی' }, admin: readOnly },
        {
          name: 'registrationNo',
          type: 'text',
          label: { en: 'Registration no.', fa: 'شماره ثبت' },
          admin: readOnly,
        },
        { name: 'address', type: 'textarea', admin: readOnly },
        { name: 'postalCode', type: 'text', admin: readOnly },
        { name: 'phone', type: 'text', admin: readOnly },
        { name: 'email', type: 'text', admin: readOnly },
      ],
    },
    {
      name: 'buyer',
      type: 'group',
      label: { en: 'Buyer (snapshot)', fa: 'خریدار' },
      admin: { ...readOnly },
      fields: [
        { name: 'name', type: 'text', admin: readOnly },
        { name: 'email', type: 'text', admin: readOnly },
        { name: 'phone', type: 'text', admin: readOnly },
        { name: 'country', type: 'text', admin: readOnly },
        { name: 'state', type: 'text', admin: readOnly },
        { name: 'city', type: 'text', admin: readOnly },
        { name: 'address1', type: 'text', admin: readOnly },
        { name: 'address2', type: 'text', admin: readOnly },
        { name: 'postcode', type: 'text', admin: readOnly },
      ],
    },
    {
      name: 'lines',
      type: 'array',
      required: true,
      minRows: 1,
      label: { en: 'Lines', fa: 'اقلام' },
      admin: { ...readOnly, initCollapsed: false },
      fields: [
        { name: 'title', type: 'text', required: true, admin: readOnly },
        { name: 'sku', type: 'text', admin: readOnly },
        { name: 'color', type: 'text', admin: readOnly },
        { name: 'size', type: 'text', admin: readOnly },
        { name: 'quantity', type: 'number', required: true, min: 1, admin: readOnly },
        { name: 'unitPrice', type: 'number', required: true, min: 0, admin: readOnly },
        { name: 'lineTotal', type: 'number', required: true, min: 0, admin: readOnly },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'subtotal', type: 'number', required: true, min: 0, admin: readOnly },
        { name: 'discountTotal', type: 'number', defaultValue: 0, min: 0, admin: readOnly },
        { name: 'shippingTotal', type: 'number', defaultValue: 0, min: 0, admin: readOnly },
        { name: 'taxTotal', type: 'number', defaultValue: 0, min: 0, admin: readOnly },
        { name: 'total', type: 'number', required: true, min: 0, admin: readOnly },
      ],
    },
    { name: 'couponCode', type: 'text', admin: readOnly },
    { name: 'freeShipping', type: 'checkbox', defaultValue: false, admin: readOnly },
    { name: 'paymentMethod', type: 'text', admin: readOnly },
    {
      name: 'walletAmount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      label: { en: 'Paid from wallet', fa: 'پرداخت از کیف پول' },
      admin: { ...readOnly, step: 0.01 },
    },
    { name: 'customerNote', type: 'textarea', admin: readOnly },
    {
      name: 'footerNote',
      type: 'textarea',
      label: { en: 'Footer', fa: 'پاورقی' },
      admin: { ...readOnly },
    },
  ],
}
