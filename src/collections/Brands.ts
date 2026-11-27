import type { CollectionConfig } from 'payload'

import { anyone, staffOnly } from '@/access/roles'
import { contentLanguageField, uniqueSlugPerLanguage } from '@/fields/language'
import { t } from '@/i18n/admin'

export const Brands: CollectionConfig = {
  slug: 'brands',
  labels: t.brands,
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'language', 'slug'],
    group: t.catalog,
    disableCopyToLocale: true,
  },
  access: {
    create: staffOnly,
    delete: staffOnly,
    read: anyone,
    update: staffOnly,
  },
  hooks: {
    beforeValidate: [uniqueSlugPerLanguage('brands')],
  },
  fields: [
    contentLanguageField,
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      index: true,
    },
  ],
}
