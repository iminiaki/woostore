import type { GlobalConfig } from 'payload'

import { adminOnly, staffOnly } from '@/access/roles'
import { t } from '@/i18n/admin'

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
          label: 'Locale & Currency',
          fields: [
            {
              name: 'defaultLocale',
              type: 'select',
              required: true,
              defaultValue: 'fa',
              options: [
                { label: 'Persian (fa)', value: 'fa' },
                { label: 'English (en)', value: 'en' },
              ],
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
