import type { CollectionConfig } from 'payload'

import { staffOnly } from '@/access/roles'
import { t } from '@/i18n/admin'

export const Coupons: CollectionConfig = {
  slug: 'coupons',
  labels: t.coupons,
  admin: {
    useAsTitle: 'code',
    defaultColumns: ['code', 'discountType', 'amount', 'usageCount', 'expiryDate', 'active'],
    group: t.commerce,
    disableCopyToLocale: true,
  },
  access: {
    create: staffOnly,
    delete: staffOnly,
    // Public can read active coupons by code via Local/REST (validate API uses overrideAccess)
    read: staffOnly,
    update: staffOnly,
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: { en: 'Coupon code', fa: 'کد تخفیف' },
      admin: {
        description: {
          en: 'Customers enter this at checkout. Stored uppercase.',
          fa: 'مشتری این کد را در تسویه وارد می‌کند.',
        },
      },
      hooks: {
        beforeValidate: [
          ({ value }) =>
            typeof value === 'string' ? value.trim().toUpperCase() : value,
        ],
      },
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      label: { en: 'Description', fa: 'توضیحات' },
      admin: {
        description: {
          en: 'Shown to customers when the code is applied. Fill it in for each language.',
          fa: 'هنگام اعمال کد به مشتری نمایش داده می‌شود. برای هر زبان جداگانه وارد کنید.',
        },
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      label: { en: 'Active', fa: 'فعال' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'discountType',
      type: 'select',
      required: true,
      defaultValue: 'percent',
      label: { en: 'Discount type', fa: 'نوع تخفیف' },
      options: [
        { label: { en: 'Percentage discount', fa: 'درصدی' }, value: 'percent' },
        { label: { en: 'Fixed cart discount', fa: 'مبلغ ثابت سبد' }, value: 'fixed_cart' },
        {
          label: { en: 'Fixed product discount', fa: 'مبلغ ثابت محصول' },
          value: 'fixed_product',
        },
        { label: { en: 'Free shipping', fa: 'ارسال رایگان' }, value: 'free_shipping' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'amount',
          type: 'number',
          required: true,
          min: 0,
          defaultValue: 0,
          label: { en: 'Coupon amount (% or USD)', fa: 'مقدار تخفیف (درصد یا دلار)' },
          admin: {
            description: {
              en: 'Percent (0–100) for percentage coupons, otherwise the fixed USD amount. Ignored for free shipping.',
              fa: 'برای نوع درصدی، درصد (۰ تا ۱۰۰)؛ در غیر این صورت مبلغ ثابت به دلار. برای ارسال رایگان نادیده گرفته می‌شود.',
            },
            step: 0.01,
          },
        },
        {
          name: 'amountIrt',
          type: 'number',
          min: 0,
          label: { en: 'Fixed amount (Toman)', fa: 'مبلغ ثابت (تومان)' },
          admin: {
            step: 1,
            description: {
              en: 'Fixed discount for Toman carts. Required for the coupon to work in Toman.',
              fa: 'مبلغ تخفیف برای سبدهای تومانی. بدون آن، این کد در تومان کار نمی‌کند.',
            },
            condition: (_, siblingData) =>
              siblingData?.discountType === 'fixed_cart' ||
              siblingData?.discountType === 'fixed_product',
          },
        },
      ],
    },
    {
      name: 'freeShipping',
      type: 'checkbox',
      defaultValue: false,
      label: { en: 'Allow free shipping', fa: 'اجازه ارسال رایگان' },
      admin: {
        description: {
          en: 'Also mark order shipping as free when this coupon applies (Woo-style).',
          fa: 'با اعمال این کد، ارسال رایگان شود.',
        },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'expiryDate',
          type: 'date',
          label: { en: 'Coupon expiry date', fa: 'تاریخ انقضا' },
          admin: {
            date: { pickerAppearance: 'dayAndTime' },
          },
        },
        {
          name: 'startDate',
          type: 'date',
          label: { en: 'Coupon start date', fa: 'تاریخ شروع' },
          admin: {
            date: { pickerAppearance: 'dayAndTime' },
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'minimumAmount',
          type: 'number',
          min: 0,
          label: { en: 'Minimum spend (USD)', fa: 'حداقل خرید (دلار)' },
          admin: { step: 0.01 },
        },
        {
          name: 'minimumAmountIrt',
          type: 'number',
          min: 0,
          label: { en: 'Minimum spend (Toman)', fa: 'حداقل خرید (تومان)' },
          admin: {
            step: 1,
            description: {
              en: 'Toman carts use this. Empty = no limit in Toman.',
              fa: 'برای سبدهای تومانی. خالی = بدون محدودیت در تومان.',
            },
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'maximumAmount',
          type: 'number',
          min: 0,
          label: { en: 'Maximum spend (USD)', fa: 'حداکثر خرید (دلار)' },
          admin: {
            step: 0.01,
            description: {
              en: 'Coupon only valid if cart subtotal is at or below this amount.',
              fa: 'فقط اگر جمع سبد کمتر یا مساوی این مبلغ باشد.',
            },
          },
        },
        {
          name: 'maximumAmountIrt',
          type: 'number',
          min: 0,
          label: { en: 'Maximum spend (Toman)', fa: 'حداکثر خرید (تومان)' },
          admin: {
            step: 1,
            description: {
              en: 'Toman carts use this. Empty = no limit in Toman.',
              fa: 'برای سبدهای تومانی. خالی = بدون محدودیت در تومان.',
            },
          },
        },
      ],
    },
    {
      type: 'row',
      admin: {
        condition: (_, siblingData) => siblingData?.discountType === 'percent',
      },
      fields: [
        {
          name: 'maximumDiscount',
          type: 'number',
          min: 0,
          label: { en: 'Max discount (USD)', fa: 'سقف تخفیف (دلار)' },
          admin: {
            step: 0.01,
            description: {
              en: 'Cap for percentage discounts.',
              fa: 'سقف تخفیف برای نوع درصدی.',
            },
          },
        },
        {
          name: 'maximumDiscountIrt',
          type: 'number',
          min: 0,
          label: { en: 'Max discount (Toman)', fa: 'سقف تخفیف (تومان)' },
          admin: {
            step: 1,
            description: {
              en: 'Toman carts use this. Empty = no limit in Toman.',
              fa: 'برای سبدهای تومانی. خالی = بدون محدودیت در تومان.',
            },
          },
        },
      ],
    },
    {
      type: 'collapsible',
      label: { en: 'Usage limits', fa: 'محدودیت استفاده' },
      fields: [
        {
          name: 'usageLimit',
          type: 'number',
          min: 0,
          label: { en: 'Usage limit per coupon', fa: 'سقف کل استفاده' },
          admin: {
            description: { en: 'Leave empty for unlimited.', fa: 'خالی = نامحدود' },
          },
        },
        {
          name: 'usageLimitPerUser',
          type: 'number',
          min: 0,
          label: { en: 'Usage limit per user', fa: 'سقف استفاده هر کاربر' },
        },
        {
          name: 'usageCount',
          type: 'number',
          defaultValue: 0,
          min: 0,
          admin: {
            readOnly: true,
            description: { en: 'Incremented when orders complete.', fa: 'با تکمیل سفارش افزایش می‌یابد.' },
          },
          label: { en: 'Usage count', fa: 'تعداد استفاده' },
        },
      ],
    },
    {
      type: 'collapsible',
      label: { en: 'Product / category restrictions', fa: 'محدودیت محصول / دسته' },
      fields: [
        {
          name: 'productIds',
          type: 'relationship',
          relationTo: 'products',
          hasMany: true,
          label: { en: 'Products', fa: 'محصولات' },
          admin: {
            description: {
              en: 'Only these products get the discount (empty = all).',
              fa: 'فقط این محصولات — خالی = همه.',
            },
          },
        },
        {
          name: 'excludedProductIds',
          type: 'relationship',
          relationTo: 'products',
          hasMany: true,
          label: { en: 'Exclude products', fa: 'حذف محصولات' },
        },
        {
          name: 'categoryIds',
          type: 'relationship',
          relationTo: 'categories',
          hasMany: true,
          label: { en: 'Product categories', fa: 'دسته‌بندی‌ها' },
        },
        {
          name: 'excludedCategoryIds',
          type: 'relationship',
          relationTo: 'categories',
          hasMany: true,
          label: { en: 'Exclude categories', fa: 'حذف دسته‌ها' },
        },
        {
          name: 'excludeSaleItems',
          type: 'checkbox',
          defaultValue: false,
          label: { en: 'Exclude sale items', fa: 'حذف کالاهای حراج' },
        },
        {
          name: 'individualUse',
          type: 'checkbox',
          defaultValue: false,
          label: { en: 'Individual use only', fa: 'استفاده تکی' },
          admin: {
            description: {
              en: 'Cannot be combined with other coupons.',
              fa: 'با سایر کدها قابل ترکیب نیست.',
            },
          },
        },
      ],
    },
    {
      type: 'collapsible',
      label: { en: 'Email restrictions', fa: 'محدودیت ایمیل' },
      fields: [
        {
          name: 'emailRestrictions',
          type: 'text',
          hasMany: true,
          label: { en: 'Allowed emails', fa: 'ایمیل‌های مجاز' },
          admin: {
            description: {
              en: 'If set, only these emails can use the coupon.',
              fa: 'در صورت تنظیم، فقط این ایمیل‌ها می‌توانند استفاده کنند.',
            },
          },
        },
      ],
    },
    {
      name: 'generateCodes',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/admin/GenerateCouponCodesField#GenerateCouponCodesField',
        },
      },
      label: { en: 'Generate coupon codes', fa: 'تولید کدهای تخفیف' },
    },
  ],
}
