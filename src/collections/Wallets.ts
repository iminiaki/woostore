import type { CollectionConfig } from 'payload'

import { staffOnly } from '@/access/roles'
import { t } from '@/i18n/admin'
import { normalizeWalletEmail } from '@/lib/wallet'

export const Wallets: CollectionConfig = {
  slug: 'wallets',
  labels: t.wallets,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'balance', 'currency', 'updatedAt'],
    group: t.commerce,
    description: {
      en: 'Customer store credit. Add or remove balance from Wallet transactions — this amount cannot be edited directly.',
      fa: 'اعتبار مشتری. موجودی را از تراکنش‌های کیف پول تغییر دهید — این مبلغ مستقیم قابل ویرایش نیست.',
    },
  },
  access: {
    create: () => false,
    delete: () => false,
    read: staffOnly,
    update: () => false,
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
      label: { en: 'Email', fa: 'ایمیل' },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      label: { en: 'Customer', fa: 'مشتری' },
    },
    {
      name: 'balance',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      label: { en: 'Balance', fa: 'موجودی' },
      admin: {
        readOnly: true,
        step: 0.01,
        description: {
          en: 'USD store credit available at checkout.',
          fa: 'اعتبار دلاری قابل استفاده در تسویه.',
        },
      },
    },
    {
      name: 'currency',
      type: 'select',
      required: true,
      defaultValue: 'usd',
      options: [{ label: 'USD', value: 'usd' }],
      admin: { readOnly: true },
    },
    {
      name: 'transactions',
      type: 'join',
      collection: 'wallet-transactions',
      on: 'wallet',
      label: { en: 'Transactions', fa: 'تراکنش‌ها' },
      defaultLimit: 10,
      defaultSort: '-createdAt',
      admin: {
        allowCreate: true,
        defaultColumns: ['createdAt', 'type', 'amount', 'balanceAfter', 'note'],
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.email && typeof data.email === 'string') {
          data.email = normalizeWalletEmail(data.email)
        }
        return data
      },
    ],
    beforeChange: [
      ({ data, originalDoc, operation, req }) => {
        if (!data || operation !== 'update' || !originalDoc) return data
        if ((req.context as { skipWalletGuard?: boolean } | undefined)?.skipWalletGuard === true) {
          return data
        }
        data.balance = originalDoc.balance
        data.email = originalDoc.email
        data.currency = originalDoc.currency
        return data
      },
    ],
  },
}
