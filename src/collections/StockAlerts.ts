import type { CollectionConfig } from 'payload'

import { staffOnly } from '@/access/roles'
import { t } from '@/i18n/admin'

export const StockAlerts: CollectionConfig = {
  slug: 'stock-alerts',
  labels: t.stockAlerts,
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'product', 'phone', 'status', 'updatedAt'],
    group: t.commerce,
    description: {
      en: 'Back-in-stock notification requests from the storefront.',
      fa: 'درخواست‌های اعلان موجودی از فروشگاه.',
    },
  },
  access: {
    create: () => false, // storefront uses Local API with overrideAccess
    delete: staffOnly,
    read: staffOnly,
    update: staffOnly,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      label: { en: 'Product', fa: 'محصول' },
    },
    {
      name: 'variantKey',
      type: 'text',
      defaultValue: '',
      label: { en: 'Variant key', fa: 'کلید تنوع' },
      admin: {
        description: {
          en: 'Payload variant row id, or empty for the whole product.',
          fa: 'شناسه ردیف تنوع در Payload، یا خالی برای کل محصول.',
        },
      },
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
      label: { en: 'Mobile', fa: 'موبایل' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      label: { en: 'Status', fa: 'وضعیت' },
      options: [
        { label: { en: 'Pending', fa: 'در انتظار' }, value: 'pending' },
        { label: { en: 'Notified', fa: 'اطلاع‌رسانی شده' }, value: 'notified' },
      ],
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: { en: 'User', fa: 'کاربر' },
    },
    {
      name: 'notifiedAt',
      type: 'date',
      label: { en: 'Notified at', fa: 'زمان اطلاع‌رسانی' },
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
  ],
}
