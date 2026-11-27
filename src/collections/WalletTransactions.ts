import type { CollectionConfig } from 'payload'

import { staffOnly } from '@/access/roles'
import { t } from '@/i18n/admin'
import { settleWalletTransaction } from '@/lib/wallet'

export const WalletTransactions: CollectionConfig = {
  slug: 'wallet-transactions',
  labels: t.walletTransactions,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['createdAt', 'email', 'type', 'amount', 'balanceAfter', 'order'],
    group: t.commerce,
    disableCopyToLocale: true,
    description: {
      en: 'Ledger for store credit. Credit adds balance, debit removes it. Checkout spends the balance on its own. Rows cannot be edited.',
      fa: 'دفتر اعتبار فروشگاه. بستانکار موجودی را زیاد می‌کند و بدهکار کم می‌کند. تسویه خودش از موجودی کم می‌کند. ردیف‌ها قابل ویرایش نیستند.',
    },
  },
  access: {
    create: staffOnly,
    delete: () => false,
    read: staffOnly,
    update: () => false,
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      index: true,
      label: { en: 'Email', fa: 'ایمیل' },
      admin: {
        description: {
          en: 'Customer who owns the wallet. A wallet is opened on the first credit.',
          fa: 'مشتری صاحب کیف پول. با اولین بستانکاری، کیف پول ساخته می‌شود.',
        },
      },
    },
    {
      name: 'wallet',
      type: 'relationship',
      relationTo: 'wallets',
      label: { en: 'Wallet', fa: 'کیف پول' },
      admin: { readOnly: true },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      label: { en: 'Type', fa: 'نوع' },
      options: [
        { label: { en: 'Credit', fa: 'بستانکار' }, value: 'credit' },
        { label: { en: 'Debit', fa: 'بدهکار' }, value: 'debit' },
        { label: { en: 'Refund', fa: 'بازپرداخت' }, value: 'refund' },
      ],
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 0.01,
      label: { en: 'Amount', fa: 'مبلغ' },
      admin: { step: 0.01 },
    },
    {
      name: 'balanceAfter',
      type: 'number',
      label: { en: 'Balance after', fa: 'موجودی بعد' },
      admin: { readOnly: true, step: 0.01 },
    },
    {
      name: 'note',
      type: 'textarea',
      label: { en: 'Note', fa: 'یادداشت' },
    },
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      label: { en: 'Order', fa: 'سفارش' },
      admin: { readOnly: true },
    },
  ],
  hooks: {
    beforeChange: [settleWalletTransaction],
  },
}
