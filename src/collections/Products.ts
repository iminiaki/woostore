import type { CollectionConfig } from 'payload'

import { anyone, staffOnly } from '@/access/roles'
import { currencyPricesField, optionalCurrencyPricesField } from '@/fields/prices'
import { t } from '@/i18n/admin'
import { findRestockedVariantKeys, notifyPendingStockAlerts } from '@/lib/stock-notify'

export const Products: CollectionConfig = {
  slug: 'products',
  labels: t.products,
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['mainImage', 'title', 'sku', 'productType', 'updatedAt'],
    group: t.catalog,
  },
  versions: {
    drafts: {
      autosave: {
        interval: 400,
      },
    },
  },
  access: {
    create: staffOnly,
    delete: staffOnly,
    read: ({ req: { user } }) => {
      if (user) return true
      return {
        _status: {
          equals: 'published',
        },
      }
    },
    update: staffOnly,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req }) => {
        if (!data) return data

        const categoryId =
          typeof data.category === 'object' && data.category
            ? (data.category as { id?: string | number }).id
            : data.category
        const subRaw = data.subCategory
        const subId =
          typeof subRaw === 'object' && subRaw
            ? (subRaw as { id?: string | number }).id
            : subRaw

        if (!subId) return data
        if (!categoryId) {
          data.subCategory = null
          return data
        }

        const sub = await req.payload.findByID({
          collection: 'categories',
          id: String(subId),
          depth: 0,
          req,
        })
        const parentId =
          typeof sub.parent === 'object' && sub.parent
            ? (sub.parent as { id?: string | number }).id
            : sub.parent

        if (String(parentId ?? '') !== String(categoryId)) {
          data.subCategory = null
        }

        return data
      },
    ],
    beforeChange: [
      ({ data }) => {
        if (!data) return data
        // Keep mainImage in sync with the first gallery image for list thumbnails
        if (Array.isArray(data.images)) {
          const first = data.images[0]
          data.mainImage =
            first == null
              ? null
              : typeof first === 'object' && first !== null && 'id' in first
                ? (first as { id: string | number }).id
                : first
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        if (operation !== 'update' || !previousDoc) return

        const { productRestocked, variantKeys } = findRestockedVariantKeys(
          doc as { inStock?: boolean | null; variants?: { id?: string | number; inStock?: boolean | null }[] },
          previousDoc as {
            inStock?: boolean | null
            variants?: { id?: string | number; inStock?: boolean | null }[]
          },
        )

        const name = String((doc as { title?: string }).title || 'Product')
        const productId = doc.id

        try {
          if (productRestocked) {
            await notifyPendingStockAlerts({
              payload: req.payload,
              req,
              productId,
              variantKey: '',
              productName: name,
            })
          }
          for (const key of variantKeys) {
            await notifyPendingStockAlerts({
              payload: req.payload,
              req,
              productId,
              variantKey: key,
              productName: name,
            })
          }
        } catch (err) {
          req.payload.logger.error({ err, msg: 'stock-notify afterChange failed' })
        }
      },
    ],
  },
  fields: [
    {
      name: 'title',
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
      name: 'productType',
      type: 'select',
      required: true,
      defaultValue: 'variable',
      options: [
        { label: 'Simple', value: 'simple' },
        { label: 'Variable', value: 'variable' },
        { label: 'Digital', value: 'digital' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'mainImage',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Main image', fa: 'تصویر اصلی' },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: {
          en: 'Auto-filled from the first gallery image. Enable this column in the products list to show thumbnails.',
          fa: 'به‌صورت خودکار از اولین تصویر گالری. برای نمایش در لیست، ستون «تصویر اصلی» را فعال کنید.',
        },
      },
    },
    {
      name: 'images',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      required: true,
      label: { en: 'Images', fa: 'تصاویر' },
      admin: {
        description: {
          en: 'Gallery images. The first image is the main image (list + storefront). Variants can override with their own image.',
          fa: 'تصاویر گالری. تصویر اول، تصویر اصلی است (لیست + فروشگاه). واریانت‌ها می‌توانند تصویر جدا داشته باشند.',
        },
        components: {
          Cell: '@/components/admin/ProductMainImageCell#ProductMainImageCell',
        },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'category',
          type: 'relationship',
          relationTo: 'categories',
          required: true,
          label: { en: 'Category', fa: 'دسته‌بندی' },
          filterOptions: () => ({
            parent: {
              exists: false,
            },
          }),
          admin: {
            description: {
              en: 'Top-level category only (e.g. Men, Women).',
              fa: 'فقط دسته اصلی (مثل مردانه، زنانه).',
            },
          },
        },
        {
          name: 'subCategory',
          type: 'relationship',
          relationTo: 'categories',
          label: { en: 'Subcategory', fa: 'زیر‌دسته' },
          filterOptions: ({ siblingData }) => {
            const parent = (siblingData as { category?: string | number | null })?.category
            if (!parent) {
              return {
                parent: {
                  exists: true,
                },
              }
            }
            return {
              parent: {
                equals: parent,
              },
            }
          },
          admin: {
            description: {
              en: 'Must belong to the selected category.',
              fa: 'باید متعلق به دسته انتخاب‌شده باشد.',
            },
          },
        },
      ],
    },
    {
      name: 'brand',
      type: 'relationship',
      relationTo: 'brands',
    },
    {
      name: 'sku',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Base SKU (variants override)',
      },
    },
    currencyPricesField('prices', 'Base prices'),
    optionalCurrencyPricesField('compareAtPrices', 'Base compare-at prices'),

    // —— WooCommerce-style attributes ——
    {
      name: 'attributes',
      type: 'array',
      labels: {
        singular: 'Attribute',
        plural: 'Attributes',
      },
      admin: {
        description:
          'Assign global attributes and their values (like WooCommerce). Mark “Used for variations” for Color/Size etc.',
        initCollapsed: false,
      },
      fields: [
        {
          name: 'attribute',
          type: 'relationship',
          relationTo: 'attributes',
          required: true,
        },
        {
          name: 'terms',
          type: 'relationship',
          relationTo: 'attribute-terms',
          hasMany: true,
          required: true,
          filterOptions: ({ siblingData }) => {
            const attr = (siblingData as { attribute?: string | number })?.attribute
            if (!attr) return true
            return {
              attribute: {
                equals: attr,
              },
            }
          },
          admin: {
            description: 'Select values for this attribute on this product.',
          },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'visible',
              type: 'checkbox',
              defaultValue: true,
              admin: {
                description: 'Show on product page',
              },
            },
            {
              name: 'usedForVariations',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description: 'Use to generate / match variants',
              },
            },
          ],
        },
      ],
    },
    {
      name: 'customAttributes',
      type: 'array',
      labels: {
        singular: 'Custom attribute',
        plural: 'Custom attributes',
      },
      admin: {
        description:
          'Product-only key/value attributes (not global). Same idea as WooCommerce custom product attributes.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          localized: true,
          admin: {
            description: 'Attribute key, e.g. Composition / Care',
          },
        },
        {
          name: 'values',
          type: 'text',
          hasMany: true,
          required: true,
          admin: {
            description: 'One or more values',
          },
        },
        {
          name: 'visible',
          type: 'checkbox',
          defaultValue: true,
        },
      ],
    },

    // —— WooCommerce-style variation generator ——
    {
      name: 'generateVariants',
      type: 'ui',
      admin: {
        condition: (_, siblingData) => siblingData?.productType === 'variable',
        components: {
          Field: '@/components/admin/GenerateVariantsField#GenerateVariantsField',
        },
      },
    },

    // —— Variants (each can have its own image) ——
    {
      name: 'variants',
      type: 'array',
      labels: {
        singular: { en: 'Variant', fa: 'تنوع' },
        plural: { en: 'Variants', fa: 'تنوع‌ها' },
      },
      admin: {
        description: {
          en: 'Each combination of variation attributes. Use the generator above, or add manually. Optional image overrides the gallery.',
          fa: 'هر ترکیب از ویژگی‌های تنوع. از سازنده بالا استفاده کنید یا دستی اضافه کنید. تصویر اختیاری گالری را جایگزین می‌کند.',
        },
        initCollapsed: true,
        condition: (_, siblingData) => siblingData?.productType === 'variable',
      },
      fields: [
        {
          name: 'attributeValues',
          type: 'array',
          minRows: 1,
          labels: {
            singular: 'Attribute value',
            plural: 'Attribute values',
          },
          admin: {
            description: 'e.g. Color=Black, Size=M',
          },
          fields: [
            {
              name: 'attribute',
              type: 'relationship',
              relationTo: 'attributes',
              required: true,
            },
            {
              name: 'term',
              type: 'relationship',
              relationTo: 'attribute-terms',
              required: true,
              filterOptions: ({ siblingData }) => {
                const attr = (siblingData as { attribute?: string | number })?.attribute
                if (!attr) return true
                return {
                  attribute: {
                    equals: attr,
                  },
                }
              },
            },
          ],
        },
        {
          name: 'sku',
          type: 'text',
          required: true,
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description: 'Primary image for this variant (shown when selected).',
          },
        },
        {
          name: 'gallery',
          type: 'upload',
          relationTo: 'media',
          hasMany: true,
          admin: {
            description: 'Optional extra images for this variant.',
          },
        },
        currencyPricesField('prices', 'Variant prices'),
        optionalCurrencyPricesField('compareAtPrices', 'Variant compare-at'),
        {
          type: 'row',
          fields: [
            {
              name: 'stock',
              type: 'number',
              required: true,
              defaultValue: 0,
              min: 0,
            },
            {
              name: 'lowStockThreshold',
              type: 'number',
              min: 0,
              admin: {
                description: 'Overrides store default when set',
              },
            },
          ],
        },
        {
          name: 'allowBackorder',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'inStock',
          type: 'checkbox',
          defaultValue: true,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'stock',
          type: 'number',
          defaultValue: 0,
          min: 0,
          admin: {
            description: 'Used for simple products (no variants)',
            condition: (_, siblingData) => siblingData?.productType !== 'variable',
          },
        },
        {
          name: 'inStock',
          type: 'checkbox',
          defaultValue: true,
        },
        {
          name: 'allowBackorder',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'featured', type: 'checkbox', defaultValue: false },
        { name: 'newArrival', type: 'checkbox', defaultValue: false },
        { name: 'clearance', type: 'checkbox', defaultValue: false },
      ],
    },
    {
      name: 'rating',
      type: 'number',
      min: 0,
      max: 5,
      admin: {
        step: 0.1,
        position: 'sidebar',
      },
    },
    {
      name: 'reviewCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'tags',
      type: 'text',
      hasMany: true,
    },
    {
      type: 'collapsible',
      label: { en: 'Linked products', fa: 'محصولات مرتبط' },
      admin: {
        initCollapsed: false,
        description: {
          en: 'Woo-style related & cross-sells shown on the product page.',
          fa: 'محصولات مرتبط و فروش مکمل در صفحه محصول.',
        },
      },
      fields: [
        {
          name: 'relatedProducts',
          type: 'relationship',
          relationTo: 'products',
          hasMany: true,
          label: { en: 'Related products', fa: 'محصولات مرتبط' },
          filterOptions: ({ id }) =>
            id
              ? {
                  id: {
                    not_equals: id,
                  },
                }
              : true,
          admin: {
            components: {
              Field: '@/components/admin/ProductPickerField#ProductPickerField',
            },
            description: {
              en: 'Suggest similar items under the product details.',
              fa: 'پیشنهاد کالاهای مشابه زیر صفحه محصول.',
            },
          },
        },
        {
          name: 'crossSells',
          type: 'relationship',
          relationTo: 'products',
          hasMany: true,
          label: { en: 'Cross-sells', fa: 'فروش مکمل' },
          filterOptions: ({ id }) =>
            id
              ? {
                  id: {
                    not_equals: id,
                  },
                }
              : true,
          admin: {
            components: {
              Field: '@/components/admin/ProductPickerField#ProductPickerField',
            },
            description: {
              en: '“Often bought with” items (accessories, add-ons).',
              fa: 'کالاهایی که معمولاً همراه این محصول خریده می‌شوند.',
            },
          },
        },
      ],
    },
    {
      name: 'legacyId',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Original mock-data id for migration reference',
        readOnly: true,
      },
    },
  ],
}
