import type { GlobalConfig } from 'payload'

import { adminOnly, staffOnly } from '@/access/roles'
import { t } from '@/i18n/admin'
import { applyLanguageDefaults } from '@/i18n/languages'

export const StoreSettings: GlobalConfig = {
  slug: 'store-settings',
  label: t.storeSettings,
  admin: {
    group: t.system,
    description: {
      en: 'Store-wide defaults. Higher-level settings are admin-only.',
      fa: 'تنظیمات کلی فروشگاه. تنظیمات سطح بالا فقط برای ادمین است.',
    },
  },
  access: {
    read: staffOnly,
    update: adminOnly,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data || typeof data !== 'object') return data
        return applyLanguageDefaults(data as Record<string, unknown>)
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'General',
          fields: [
            {
              name: 'storeName',
              type: 'text',
              required: true,
              localized: true,
              defaultValue: 'Lastore',
            },
            {
              name: 'supportEmail',
              type: 'email',
            },
            {
              name: 'supportPhone',
              type: 'text',
            },
          ],
        },
        {
          label: { en: 'Languages', fa: 'زبان‌ها' },
          fields: [
            {
              name: 'websiteLanguages',
              type: 'array',
              label: { en: 'Website languages', fa: 'زبان‌های وب‌سایت' },
              labels: {
                singular: { en: 'Language', fa: 'زبان' },
                plural: { en: 'Languages', fa: 'زبان‌ها' },
              },
              admin: {
                components: {
                  Field: '@/components/admin/WebsiteLanguagesField#WebsiteLanguagesField',
                },
                description: {
                  en: 'Each language sets the storefront direction and currency. Defaults fill in when you add one — Persian is right-to-left with Toman — and you can change both. A new language shows up on the site immediately. Persian and English labels are translated. Any other language uses English labels, and product text uses Persian or English.',
                  fa: 'هر زبان جهت و واحد پول فروشگاه را مشخص می‌کند. با افزودن زبان، مقدار پیش‌فرض پر می‌شود — فارسی راست‌به‌چپ با تومان است — و هر دو قابل تغییرند. زبان جدید همان لحظه در سایت دیده می‌شود. متن رابط برای فارسی و انگلیسی ترجمه شده است. زبان‌های دیگر از برچسب انگلیسی استفاده می‌کنند و متن محصول فارسی یا انگلیسی می‌ماند.',
                },
              },
              fields: [
                { name: 'code', type: 'text', required: true },
                { name: 'label', type: 'text', required: true },
                {
                  name: 'direction',
                  type: 'select',
                  required: true,
                  defaultValue: 'ltr',
                  options: [
                    { label: 'Left to right', value: 'ltr' },
                    { label: 'Right to left', value: 'rtl' },
                  ],
                },
                {
                  name: 'currency',
                  type: 'select',
                  required: true,
                  defaultValue: 'USD',
                  options: [
                    { label: 'Iranian Toman (IRT)', value: 'IRT' },
                    { label: 'US Dollar (USD)', value: 'USD' },
                  ],
                },
                { name: 'isDefault', type: 'checkbox', defaultValue: false },
              ],
            },
            {
              name: 'unprefixedDefault',
              type: 'checkbox',
              defaultValue: false,
              label: {
                en: 'Default language uses the main URL',
                fa: 'زبان پیش‌فرض روی آدرس اصلی',
              },
              admin: {
                description: {
                  en: 'Off: every language has its own prefix, such as /fa and /en. On: the default language is served at / and /shop, and the other languages keep their prefix.',
                  fa: 'خاموش: هر زبان پیشوند خودش را دارد، مثل /fa و /en. روشن: زبان پیش‌فرض روی / و /shop است و زبان‌های دیگر پیشوند خود را نگه می‌دارند.',
                },
              },
            },
            {
              name: 'defaultLocale',
              type: 'select',
              required: true,
              defaultValue: 'fa',
              options: [
                { label: 'Persian (fa)', value: 'fa' },
                { label: 'English (en)', value: 'en' },
              ],
              admin: {
                hidden: true,
                description: 'Content locale used when a website language has no Persian or English copy. Kept in sync with the default website language.',
              },
            },
            {
              name: 'defaultCurrency',
              type: 'select',
              required: true,
              defaultValue: 'IRT',
              options: [
                { label: 'Iranian Toman (IRT)', value: 'IRT' },
                { label: 'US Dollar (USD)', value: 'USD' },
              ],
              admin: { hidden: true },
            },
            {
              name: 'enabledCurrencies',
              type: 'select',
              hasMany: true,
              required: true,
              defaultValue: ['IRT', 'USD'],
              options: [
                { label: 'Iranian Toman (IRT)', value: 'IRT' },
                { label: 'US Dollar (USD)', value: 'USD' },
              ],
            },
            {
              name: 'reportingExchangeRate',
              type: 'number',
              admin: {
                description:
                  'Optional USD→IRT rate for reports only. Product prices are always manual per currency.',
                step: 1,
              },
            },
          ],
        },
        {
          label: 'Inventory',
          fields: [
            {
              name: 'lowStockThreshold',
              type: 'number',
              required: true,
              defaultValue: 5,
              min: 0,
            },
            {
              name: 'allowBackordersDefault',
              type: 'checkbox',
              defaultValue: false,
            },
          ],
        },
        {
          label: { en: 'Invoicing', fa: 'فاکتور' },
          fields: [
            {
              name: 'legalName',
              type: 'text',
              label: { en: 'Legal name', fa: 'نام حقوقی فروشنده' },
              admin: {
                description: {
                  en: 'Printed on every new pre-invoice and invoice. Later edits do not change documents already issued.',
                  fa: 'روی پیش‌فاکتور و فاکتور جدید چاپ می‌شود. تغییر بعدی، سندهای صادرشده را عوض نمی‌کند.',
                },
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'sellerNationalId',
                  type: 'text',
                  label: { en: 'National ID', fa: 'شناسه ملی' },
                },
                {
                  name: 'sellerEconomicCode',
                  type: 'text',
                  label: { en: 'Economic code', fa: 'کد اقتصادی' },
                },
                {
                  name: 'sellerRegistrationNo',
                  type: 'text',
                  label: { en: 'Registration no.', fa: 'شماره ثبت' },
                },
              ],
            },
            {
              name: 'sellerAddress',
              type: 'textarea',
              label: { en: 'Seller address', fa: 'آدرس فروشنده' },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'sellerPostalCode',
                  type: 'text',
                  label: { en: 'Postal code', fa: 'کد پستی' },
                },
                {
                  name: 'sellerPhone',
                  type: 'text',
                  label: { en: 'Phone', fa: 'تلفن' },
                },
                {
                  name: 'sellerEmail',
                  type: 'email',
                  label: { en: 'Email', fa: 'ایمیل' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'proformaPrefix',
                  type: 'text',
                  defaultValue: 'PF',
                  label: { en: 'Pre-invoice prefix', fa: 'پیشوند پیش‌فاکتور' },
                  admin: {
                    description: { en: 'Example: PF-2026-00001', fa: 'نمونه: PF-2026-00001' },
                  },
                },
                {
                  name: 'invoicePrefix',
                  type: 'text',
                  defaultValue: 'INV',
                  label: { en: 'Invoice prefix', fa: 'پیشوند فاکتور' },
                  admin: {
                    description: { en: 'Example: INV-2026-00001', fa: 'نمونه: INV-2026-00001' },
                  },
                },
                {
                  name: 'proformaValidityDays',
                  type: 'number',
                  defaultValue: 7,
                  min: 1,
                  max: 365,
                  label: { en: 'Pre-invoice validity (days)', fa: 'اعتبار پیش‌فاکتور (روز)' },
                  admin: {
                    description: {
                      en: 'Printed on the pre-invoice. The order stays open after this date.',
                      fa: 'روی پیش‌فاکتور چاپ می‌شود. سفارش بعد از این تاریخ باز می‌ماند.',
                    },
                  },
                },
              ],
            },
            {
              name: 'invoiceFooter',
              type: 'textarea',
              label: { en: 'Footer note', fa: 'پاورقی' },
              admin: {
                description: {
                  en: 'Bank details or a short note, copied onto each new document.',
                  fa: 'شماره حساب یا توضیح کوتاه. روی هر سند جدید کپی می‌شود.',
                },
              },
            },
          ],
        },
        {
          label: 'SMS (OTP)',
          fields: [
            {
              name: 'smsProvider',
              type: 'select',
              defaultValue: 'console',
              options: [
                { label: 'Console (dev)', value: 'console' },
                { label: 'Custom HTTP', value: 'http' },
              ],
              admin: {
                description: 'Customer phone OTP. Real Iranian gateways plug in later via adapter.',
              },
            },
            {
              name: 'smsApiUrl',
              type: 'text',
              admin: {
                condition: (_, siblingData) => siblingData?.smsProvider === 'http',
              },
            },
            {
              name: 'smsApiKey',
              type: 'text',
              admin: {
                condition: (_, siblingData) => siblingData?.smsProvider === 'http',
              },
            },
          ],
        },
      ],
    },
  ],
}
