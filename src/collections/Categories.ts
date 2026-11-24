import type { CollectionConfig } from 'payload'

import { anyone, staffOnly } from '@/access/roles'
import { t } from '@/i18n/admin'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: t.categories,
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'parent', 'updatedAt'],
    group: t.catalog,
  },
  access: {
    create: staffOnly,
    delete: staffOnly,
    read: anyone,
    update: staffOnly,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req }) => {
        if (!data?.parent) return data

        const parentId =
          typeof data.parent === 'object' && data.parent
            ? (data.parent as { id?: string | number }).id
            : data.parent

        if (!parentId) return data

        const parent = await req.payload.findByID({
          collection: 'categories',
          id: String(parentId),
          depth: 0,
          req,
        })

        if (parent.parent) {
          throw new Error('Subcategories can only nest one level under a top-level category.')
        }

        return data
      },
    ],
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
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      filterOptions: ({ id }) => ({
        and: [
          {
            parent: {
              exists: false,
            },
          },
          ...(id
            ? [
                {
                  id: {
                    not_equals: id,
                  },
                },
              ]
            : []),
        ],
      }),
      admin: {
        description: 'Set a top-level parent to create a subcategory (one level deep).',
        position: 'sidebar',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
    },
  ],
}
