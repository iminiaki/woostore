import type { CollectionConfig } from 'payload'

import { staffOnly } from '@/access/roles'
import { t } from '@/i18n/admin'

export const Warehouses: CollectionConfig = {
  slug: 'warehouses',
  labels: t.warehouses,
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'code', 'isDefault'],
    group: t.inventory,
    description: {
      en: 'Multi-warehouse ready. Seed starts with a single default warehouse.',
      fa: 'آماده برای چند انبار. در شروع یک انبار پیش‌فرض ایجاد می‌شود.',
    },
  },
  access: {
    create: staffOnly,
    delete: staffOnly,
    read: staffOnly,
    update: staffOnly,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'address',
      type: 'group',
      fields: [
        { name: 'line1', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'province', type: 'text' },
        { name: 'country', type: 'text', defaultValue: 'IR' },
        { name: 'postalCode', type: 'text' },
      ],
    },
  ],
}
