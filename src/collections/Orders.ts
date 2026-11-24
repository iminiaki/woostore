import type { CollectionConfig, Field } from 'payload'

import { staffOnly } from '@/access/roles'
import { t } from '@/i18n/admin'

/** Fields staff may change after an order is placed (Woo-style). */
const EDITABLE_ON_UPDATE = new Set(['status', 'staffNote', 'updatedAt'])

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
      ({ data, operation }) => {
        if (operation !== 'update' || !data) return data

        // Drop any attempt to rewrite checkout snapshots (items, totals, addresses, …)
        const allowed: Record<string, unknown> = {}
        for (const key of Object.keys(data)) {
          if (EDITABLE_ON_UPDATE.has(key)) {
            allowed[key] = data[key as keyof typeof data]
          }
        }
        return allowed
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
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
