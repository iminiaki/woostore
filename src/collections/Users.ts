import type { CollectionConfig } from 'payload'

import { adminFieldAccess, adminOnly, isAdmin, isStaff, staffOnly } from '@/access/roles'
import { t } from '@/i18n/admin'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: t.users,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role'],
    group: t.system,
    disableCopyToLocale: true,
  },
  auth: true,
  access: {
    // Only staff can open /admin — customers use the storefront
    admin: ({ req: { user } }) =>
      isStaff(user as { role?: 'admin' | 'shop-manager' | 'customer' } | null),
    // Allow unauthenticated create so the first admin can be bootstrapped via /admin
    create: ({ req: { user } }) =>
      !user || isAdmin(user as { role?: 'admin' | 'shop-manager' | 'customer' } | null),
    delete: adminOnly,
    read: ({ req: { user } }) => {
      if (isStaff(user as { role?: 'admin' | 'shop-manager' | 'customer' } | null)) return true
      if (user?.id) {
        return {
          id: {
            equals: user.id,
          },
        }
      }
      return false
    },
    update: ({ req: { user } }) => {
      if (isAdmin(user as { role?: 'admin' | 'shop-manager' | 'customer' } | null)) return true
      if (user?.id) {
        return {
          id: {
            equals: user.id,
          },
        }
      }
      return false
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: { en: 'Name', fa: 'نام' },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'customer',
      label: { en: 'Role', fa: 'نقش' },
      options: [
        { label: { en: 'Admin', fa: 'ادمین' }, value: 'admin' },
        { label: { en: 'Shop Manager', fa: 'مدیر فروشگاه' }, value: 'shop-manager' },
        { label: { en: 'Customer', fa: 'مشتری' }, value: 'customer' },
      ],
      access: {
        create: adminFieldAccess,
        update: adminFieldAccess,
      },
      admin: {
        description: {
          en: 'Admin = full access. Shop Manager = store ops. Customer = storefront only.',
          fa: 'ادمین = کامل. مدیر فروشگاه = عملیات فروشگاه. مشتری = فقط فروشگاه.',
        },
      },
    },
    {
      name: 'phone',
      type: 'text',
      label: { en: 'Phone', fa: 'تلفن' },
    },
  ],
}
