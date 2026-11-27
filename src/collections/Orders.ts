import type { CollectionConfig, Field } from 'payload'

import { staffOnly } from '@/access/roles'
import { t } from '@/i18n/admin'
import { syncOrderDocuments } from '@/lib/invoices'
import { applyWalletEntry, roundMoney } from '@/lib/wallet'

/**
 * Checkout snapshots stay as they were placed. Staff can change status and the
 * internal note. Locked fields are written back from the saved order so a status
 * update still passes validation.
 */
const LOCKED_ON_UPDATE = [
  'orderNumber',
  'currency',
  'customer',
  'email',
  'items',
  'subtotal',
  'discountTotal',
  'shippingTotal',
  'taxTotal',
  'total',
  'coupon',
  'couponCode',
  'freeShipping',
  'paymentMethod',
  'walletAmount',
  'walletRefunded',
  'customerNote',
  'billingName',
  'billingEmail',
  'billingPhone',
  'billingCountry',
  'billingState',
  'billingCity',
  'billingAddress1',
  'billingAddress2',
  'billingPostcode',
  'shippingName',
  'shippingEmail',
  'shippingPhone',
  'shippingCountry',
  'shippingState',
  'shippingCity',
  'shippingAddress1',
  'shippingAddress2',
  'shippingPostcode',
] as const

const addressFields = (prefix: string): Field[] =>
  [
    { name: `${prefix}Name`, type: 'text', label: { en: 'Full name', fa: 'نام کامل' } },
    { name: `${prefix}Email`, type: 'email', label: { en: 'Email', fa: 'ایمیل' } },
    { name: `${prefix}Phone`, type: 'text', label: { en: 'Phone', fa: 'تلفن' } },
    { name: `${prefix}Country`, type: 'text', label: { en: 'Country', fa: 'کشور' } },
    { name: `${prefix}State`, type: 'text', label: { en: 'State', fa: 'استان' } },
    { name: `${prefix}City`, type: 'text', label: { en: 'City', fa: 'شهر' } },
    { name: `${prefix}Address1`, type: 'text', label: { en: 'Address line 1', fa: 'آدرس ۱' } },
    { name: `${prefix}Address2`, type: 'text', label: { en: 'Address line 2', fa: 'آدرس ۲' } },
    { name: `${prefix}Postcode`, type: 'text', label: { en: 'Postcode', fa: 'کد پستی' } },
  ].map((field) => ({
    ...field,
    admin: {
      readOnly: true,
    },
  }))

const snapshot = {
  readOnly: true,
  description: {
    en: 'Locked snapshot from checkout — not editable.',
    fa: 'ثبت‌شده در تسویه — قابل ویرایش نیست.',
  },
} as const

export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: t.orders,
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'status', 'email', 'total', 'createdAt'],
    group: t.commerce,
    disableCopyToLocale: true,
    // Orders are created by storefront checkout, not manually in admin
    disableCreate: true,
  },
  access: {
    create: staffOnly,
    delete: staffOnly,
    read: staffOnly,
    update: staffOnly,
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation }) => {
        if (!data) return data
        if (operation === 'create' && !data.orderNumber) {
          const stamp = Date.now().toString(36).toUpperCase()
          const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
          data.orderNumber = `LS-${stamp}-${rand}`
        }
        if (!data.email && data.billingEmail) {
          data.email = data.billingEmail
        }
        return data
      },
    ],
    beforeChange: [
      ({ data, originalDoc, operation }) => {
        if (!data) return data

        const now = new Date().toISOString()

        if (operation === 'create') {
          const initialStatus = String(data.status || 'pending')
          data.statusHistory = [
            {
              status: initialStatus,
              at: now,
              note: 'Order placed',
            },
          ]
          return data
        }

        if (operation !== 'update' || !originalDoc) return data

        for (const key of LOCKED_ON_UPDATE) {
          if (originalDoc[key] !== undefined) data[key] = originalDoc[key]
        }

        // Preserve history; append when status changes.
        const previousHistory = Array.isArray(originalDoc.statusHistory)
          ? [...originalDoc.statusHistory]
          : []
        const nextStatus = data.status !== undefined ? String(data.status) : String(originalDoc.status)
        const prevStatus = String(originalDoc.status)
        if (nextStatus !== prevStatus) {
          previousHistory.push({
            status: nextStatus,
            at: now,
            note: `Status changed to ${nextStatus}`,
          })
        }
        data.statusHistory = previousHistory

        return data
      },
      async ({ data, originalDoc, operation, req }) => {
        if (!data || operation !== 'update' || !originalDoc) return data

        const previous = originalDoc as typeof originalDoc & {
          walletAmount?: number | null
          walletRefunded?: boolean | null
        }
        const walletAmount = roundMoney(Number(previous.walletAmount || 0))
        if (walletAmount <= 0 || previous.walletRefunded) return data

        const nextStatus = String(data.status || previous.status)
        const prevStatus = String(previous.status || '')
        const closing = ['cancelled', 'refunded', 'failed']
        if (closing.includes(prevStatus) || !closing.includes(nextStatus)) return data

        await applyWalletEntry({
          payload: req.payload,
          req,
          email: String(previous.email || ''),
          type: 'refund',
          amount: walletAmount,
          note: `Refund for ${previous.orderNumber || 'order'}`,
          orderId: previous.id,
        })
        data.walletRefunded = true
        return data
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const docs = await req.payload.find({
          collection: 'invoices',
          where: { order: { equals: id } },
          limit: 20,
          depth: 0,
          overrideAccess: true,
          req,
        })
        for (const doc of docs.docs) {
          await req.payload.delete({
            collection: 'invoices',
            id: doc.id,
            overrideAccess: true,
            req,
          })
        }
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        try {
          await syncOrderDocuments({
            payload: req.payload,
            req,
            doc,
            previousDoc,
            operation,
          })
        } catch (err) {
          req.payload.logger.error({ err, msg: 'Invoice sync failed' })
        }

        const couponId =
          typeof doc.coupon === 'object' && doc.coupon
            ? doc.coupon.id
            : doc.coupon
        if (!couponId) return

        const becamePaid =
          operation === 'create'
            ? ['processing', 'completed', 'on-hold'].includes(String(doc.status))
            : previousDoc &&
              !['processing', 'completed', 'on-hold'].includes(String(previousDoc.status)) &&
              ['processing', 'completed', 'on-hold'].includes(String(doc.status))

        if (!becamePaid) return

        try {
          const coupon = await req.payload.findByID({
            collection: 'coupons',
            id: String(couponId),
            depth: 0,
            req,
          })
          await req.payload.update({
            collection: 'coupons',
            id: String(couponId),
            data: {
              usageCount: Number(coupon.usageCount || 0) + 1,
            },
            req,
            overrideAccess: true,
          })
        } catch {
          // ignore coupon bump failures
        }
      },
    ],
  },
  fields: [
    {
      name: 'documents',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/admin/OrderInvoicesField#OrderInvoicesField',
        },
      },
    },
    {
      name: 'orderNumber',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar', readOnly: true },
      label: { en: 'Order number', fa: 'شماره سفارش' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      label: { en: 'Status', fa: 'وضعیت' },
      options: [
        { label: { en: 'Pending payment', fa: 'در انتظار پرداخت' }, value: 'pending' },
        { label: { en: 'Processing', fa: 'در حال پردازش' }, value: 'processing' },
        { label: { en: 'On hold', fa: 'معلق' }, value: 'on-hold' },
        { label: { en: 'Completed', fa: 'تکمیل‌شده' }, value: 'completed' },
        { label: { en: 'Cancelled', fa: 'لغوشده' }, value: 'cancelled' },
        { label: { en: 'Refunded', fa: 'بازپرداخت‌شده' }, value: 'refunded' },
        { label: { en: 'Failed', fa: 'ناموفق' }, value: 'failed' },
      ],
      admin: {
        position: 'sidebar',
        description: {
          en: 'Only status (and staff note) can be changed after checkout.',
          fa: 'بعد از ثبت سفارش فقط وضعیت (و یادداشت داخلی) قابل تغییر است.',
        },
      },
    },
    {
      name: 'staffNote',
      type: 'textarea',
      label: { en: 'Staff note', fa: 'یادداشت داخلی' },
      admin: {
        position: 'sidebar',
        description: {
          en: 'Internal only — not shown to the customer.',
          fa: 'فقط داخلی — به مشتری نشان داده نمی‌شود.',
        },
      },
    },
    {
      name: 'statusHistory',
      type: 'array',
      label: { en: 'Status history', fa: 'تاریخچه وضعیت' },
      admin: {
        readOnly: true,
        description: {
          en: 'Auto-logged when the order status changes. Shown on the customer order page.',
          fa: 'با تغییر وضعیت به‌صورت خودکار ثبت می‌شود و در صفحه سفارش مشتری دیده می‌شود.',
        },
      },
      fields: [
        {
          name: 'status',
          type: 'select',
          required: true,
          options: [
            { label: { en: 'Pending payment', fa: 'در انتظار پرداخت' }, value: 'pending' },
            { label: { en: 'Processing', fa: 'در حال پردازش' }, value: 'processing' },
            { label: { en: 'On hold', fa: 'معلق' }, value: 'on-hold' },
            { label: { en: 'Completed', fa: 'تکمیل‌شده' }, value: 'completed' },
            { label: { en: 'Cancelled', fa: 'لغوشده' }, value: 'cancelled' },
            { label: { en: 'Refunded', fa: 'بازپرداخت‌شده' }, value: 'refunded' },
            { label: { en: 'Failed', fa: 'ناموفق' }, value: 'failed' },
          ],
        },
        {
          name: 'at',
          type: 'date',
          required: true,
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'note',
          type: 'text',
        },
      ],
    },
    {
      name: 'currency',
      type: 'select',
      required: true,
      defaultValue: 'usd',
      options: [
        { label: 'USD', value: 'usd' },
        { label: 'IRT', value: 'irt' },
      ],
      admin: { position: 'sidebar', ...snapshot },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      label: { en: 'Customer', fa: 'مشتری' },
      admin: {
        position: 'sidebar',
        ...snapshot,
      },
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      index: true,
      label: { en: 'Customer email', fa: 'ایمیل مشتری' },
      admin: { ...snapshot },
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      label: { en: 'Line items', fa: 'اقلام' },
      admin: {
        ...snapshot,
        initCollapsed: false,
      },
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          admin: { readOnly: true },
        },
        {
          name: 'productTitle',
          type: 'text',
          required: true,
          label: { en: 'Product name (snapshot)', fa: 'نام محصول' },
          admin: { readOnly: true },
        },
        {
          name: 'sku',
          type: 'text',
          admin: { readOnly: true },
        },
        {
          name: 'variantKey',
          type: 'text',
          admin: { readOnly: true },
        },
        {
          name: 'color',
          type: 'text',
          admin: { readOnly: true },
        },
        {
          name: 'size',
          type: 'text',
          admin: { readOnly: true },
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
          defaultValue: 1,
          admin: { readOnly: true },
        },
        {
          name: 'unitPrice',
          type: 'number',
          required: true,
          min: 0,
          admin: { readOnly: true },
        },
        {
          name: 'lineTotal',
          type: 'number',
          required: true,
          min: 0,
          admin: { readOnly: true },
        },
        {
          name: 'category',
          type: 'relationship',
          relationTo: 'categories',
          admin: {
            readOnly: true,
            description: { en: 'For reporting', fa: 'برای گزارش' },
          },
        },
        {
          name: 'categorySlug',
          type: 'text',
          admin: { readOnly: true },
        },
        {
          name: 'categoryName',
          type: 'text',
          admin: { readOnly: true },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'subtotal',
          type: 'number',
          required: true,
          min: 0,
          label: { en: 'Subtotal', fa: 'جمع جزء' },
          admin: { readOnly: true },
        },
        {
          name: 'discountTotal',
          type: 'number',
          defaultValue: 0,
          min: 0,
          label: { en: 'Discount', fa: 'تخفیف' },
          admin: { readOnly: true },
        },
        {
          name: 'shippingTotal',
          type: 'number',
          defaultValue: 0,
          min: 0,
          label: { en: 'Shipping', fa: 'ارسال' },
          admin: { readOnly: true },
        },
        {
          name: 'taxTotal',
          type: 'number',
          defaultValue: 0,
          min: 0,
          label: { en: 'Tax', fa: 'مالیات' },
          admin: { readOnly: true },
        },
        {
          name: 'total',
          type: 'number',
          required: true,
          min: 0,
          label: { en: 'Total', fa: 'جمع کل' },
          admin: { readOnly: true },
        },
      ],
    },
    {
      name: 'coupon',
      type: 'relationship',
      relationTo: 'coupons',
      label: { en: 'Coupon', fa: 'کد تخفیف' },
      admin: { ...snapshot },
    },
    {
      name: 'couponCode',
      type: 'text',
      label: { en: 'Coupon code (snapshot)', fa: 'کد تخفیف' },
      admin: { readOnly: true },
    },
    {
      name: 'freeShipping',
      type: 'checkbox',
      defaultValue: false,
      admin: { readOnly: true },
    },
    {
      name: 'paymentMethod',
      type: 'text',
      label: { en: 'Payment method', fa: 'روش پرداخت' },
      defaultValue: 'cod',
      admin: { readOnly: true },
    },
    {
      name: 'walletAmount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      label: { en: 'Paid from wallet', fa: 'پرداخت از کیف پول' },
      admin: { readOnly: true, step: 0.01 },
    },
    {
      name: 'walletRefunded',
      type: 'checkbox',
      defaultValue: false,
      label: { en: 'Wallet refunded', fa: 'بازگشت به کیف پول' },
      admin: {
        readOnly: true,
        description: {
          en: 'Set when a cancelled, failed, or refunded order returns its wallet payment.',
          fa: 'وقتی سفارش لغو، ناموفق یا بازپرداخت شود، مبلغ کیف پول برمی‌گردد.',
        },
      },
    },
    {
      name: 'customerNote',
      type: 'textarea',
      label: { en: 'Customer note', fa: 'یادداشت مشتری' },
      admin: { ...snapshot },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: { en: 'Billing', fa: 'صورتحساب' },
          fields: addressFields('billing'),
        },
        {
          label: { en: 'Shipping', fa: 'ارسال' },
          fields: addressFields('shipping'),
        },
      ],
    },
  ],
}
