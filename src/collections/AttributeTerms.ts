import type { CollectionConfig } from 'payload'

import { anyone, staffOnly } from '@/access/roles'
import { t } from '@/i18n/admin'

/**
 * Attribute values / terms (WooCommerce-style).
 * Example: Color → Black (#000), Size → M
 */
export const AttributeTerms: CollectionConfig = {
  slug: 'attribute-terms',
  labels: t.attributeTerms,
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'attribute', 'slug', 'hex'],
    group: t.catalog,
    description: {
      en: 'Values belonging to a global attribute.',
      fa: 'مقادیر متعلق به یک ویژگی سراسری.',
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
      name: 'attribute',
      type: 'relationship',
      relationTo: 'attributes',
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
      admin: {
        components: {
          Cell: '@/components/admin/AttributeTermNameCell#AttributeTermNameCell',
        },
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Unique per attribute (e.g. black, m).',
      },
    },
    {
      name: 'hex',
      type: 'text',
      label: { en: 'Hex color', fa: 'کد رنگ' },
      admin: {
        description: {
          en: 'Color swatch for color-type attributes.',
          fa: 'نمونه رنگ برای ویژگی‌های از نوع رنگ.',
        },
        components: {
          Field: '@/components/admin/ColorPickerField#ColorPickerField',
        },
      },
      validate: (value: string | null | undefined) => {
        if (!value) return true
        if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)) {
          return 'Enter a valid hex color like #000 or #000000'
        }
        return true
      },
    },
    {
      name: 'swatchImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Optional image swatch (pattern/fabric) instead of solid hex.',
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
