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
