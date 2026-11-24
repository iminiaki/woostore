import type { CollectionConfig } from 'payload'

import { anyone, staffOnly } from '@/access/roles'
import { t } from '@/i18n/admin'

export const Brands: CollectionConfig = {
  slug: 'brands',
  labels: t.brands,
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug'],
    group: t.catalog,
  },
  access: {
    create: staffOnly,
    delete: staffOnly,
    read: anyone,
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
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
  ],
}
