import type { Access, FieldAccess } from 'payload'

export type UserRole = 'admin' | 'shop-manager' | 'customer'

export type UserWithRole = {
  id: string | number
  role?: UserRole
}

export const isAdmin = (user?: UserWithRole | null): boolean => user?.role === 'admin'

export const isShopManager = (user?: UserWithRole | null): boolean =>
  user?.role === 'shop-manager'

export const isCustomer = (user?: UserWithRole | null): boolean => user?.role === 'customer'

export const isStaff = (user?: UserWithRole | null): boolean =>
  isAdmin(user) || isShopManager(user)

/** Full store ops for admin + shop-manager */
export const staffOnly: Access = ({ req: { user } }) => isStaff(user as UserWithRole | null)

/** Admin-only (store settings, role management, destructive system config) */
export const adminOnly: Access = ({ req: { user } }) => isAdmin(user as UserWithRole | null)

export const staffOrPublished: Access = ({ req: { user } }) => {
  if (isStaff(user as UserWithRole | null)) return true
  return {
    _status: {
      equals: 'published',
    },
  }
}

export const anyone: Access = () => true

export const authenticated: Access = ({ req: { user } }) => Boolean(user)

export const adminFieldAccess: FieldAccess = ({ req: { user } }) =>
  isAdmin(user as UserWithRole | null)
