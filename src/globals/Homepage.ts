import type { GlobalConfig } from 'payload'

import { anyone, staffOnly } from '@/access/roles'
import { t } from '@/i18n/admin'

export const Homepage: GlobalConfig = {
  slug: 'homepage',
  label: t.homepage,
  admin: {
    group: t.content,
    description: {
      en: 'Homepage content. Hero slides drive the storefront hero slider.',
      fa: 'محتوای صفحه اصلی. اسلایدهای هیرو اسلایدر فروشگاه را می‌سازند.',
    },
  },
  access: {
    read: anyone,
    update: staffOnly,
  },
  fields: [
    {
      name: 'heroSlides',
      type: 'array',
      labels: {
        singular: { en: 'Hero slide', fa: 'اسلاید هیرو' },
        plural: { en: 'Hero slides', fa: 'اسلایدهای هیرو' },
      },
      admin: {
        initCollapsed: true,
        description: {
          en: 'Brand lockup (logo + Lastore + rule) stays fixed. Each slide controls copy, CTAs, and images.',
          fa: 'لوگو، نام Lastore و خط ثابت می‌مانند. هر اسلاید متن، دکمه‌ها و تصاویر را کنترل می‌کند.',
        },
      },
      fields: [
        {
          name: 'title',
          type: 'textarea',
          required: true,
          localized: true,
          admin: {
            description: {
              en: 'Use a line break for a two-line headline.',
              fa: 'برای تیتر دوخطی از شکستن خط استفاده کنید.',
            },
          },
        },
        {
          name: 'description',
          type: 'textarea',
          localized: true,
        },
        {
          type: 'row',
          fields: [
            {
              name: 'desktopImage',
              type: 'upload',
              relationTo: 'media',
              required: true,
              admin: {
                width: '50%',
                description: { en: 'Shown from md and up.', fa: 'از سایز md به بالا.' },
              },
            },
            {
              name: 'mobileImage',
              type: 'upload',
              relationTo: 'media',
              admin: {
                width: '50%',
                description: {
                  en: 'Optional. Falls back to desktop image on small screens.',
                  fa: 'اختیاری. در موبایل در صورت خالی بودن از تصویر دسکتاپ استفاده می‌شود.',
                },
              },
            },
          ],
        },
        {
          name: 'primaryButton',
          type: 'group',
          label: { en: 'Primary button', fa: 'دکمه اصلی' },
          fields: [
            {
              name: 'label',
              type: 'text',
              required: true,
              localized: true,
              defaultValue: 'Shop now',
            },
            {
              name: 'href',
              type: 'text',
              required: true,
              defaultValue: '/shop',
            },
          ],
        },
        {
          name: 'secondaryButton',
          type: 'group',
          label: { en: 'Secondary button', fa: 'دکمه فرعی' },
          fields: [
            {
              name: 'enabled',
              type: 'checkbox',
              defaultValue: true,
            },
            {
              name: 'label',
              type: 'text',
              localized: true,
              defaultValue: 'About us',
              admin: {
                condition: (_, siblingData) => Boolean(siblingData?.enabled),
              },
            },
            {
              name: 'href',
              type: 'text',
              defaultValue: '/about',
              admin: {
                condition: (_, siblingData) => Boolean(siblingData?.enabled),
              },
            },
          ],
        },
      ],
    },
  ],
}
