import type { CollectionConfig } from 'payload'

import { anyone, staffOnly } from '@/access/roles'
import { t } from '@/i18n/admin'

/**
 * Global product attributes (WooCommerce-style).
 * Example keys: Color, Size, Material — terms live in `attribute-terms`.
 */
export const Attributes: CollectionConfig = {
  slug: 'attributes',
  labels: t.attributes,
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'type', 'filterable', 'sortOrder'],
    group: t.catalog,
    description: {
      en: 'Reusable attribute keys (like WooCommerce global attributes).',
      fa: 'کلیدهای ویژگی قابل استفاده مجدد (مشابه ویژگی‌های سراسری ووکامرس).',
    },
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
      admin: {
        description: 'Display name, e.g. Color / رنگ',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Stable key, e.g. color, size (like pa_color in Woo).',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'select',
      options: [
        { label: 'Select (text values)', value: 'select' },
        { label: 'Color swatch', value: 'color' },
        { label: 'Button / label', value: 'button' },
      ],
      admin: {
        description: 'Color type shows hex/image swatches on the storefront.',
      },
    },
    {
      name: 'filterable',
      type: 'checkbox',
      defaultValue: true,
      label: { en: 'Use as filter', fa: 'استفاده به‌عنوان فیلتر' },
      admin: {
        position: 'sidebar',
        description: {
          en: 'When enabled, this attribute appears in shop/category filters.',
          fa: 'در صورت فعال بودن، این ویژگی در فیلترهای فروشگاه/دسته نمایش داده می‌شود.',
        },
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
