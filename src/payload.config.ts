import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { AttributeTerms } from './collections/AttributeTerms'
import { Attributes } from './collections/Attributes'
import { Brands } from './collections/Brands'
import { Categories } from './collections/Categories'
import { Coupons } from './collections/Coupons'
import { Invoices } from './collections/Invoices'
import { Media } from './collections/Media'
import { Orders } from './collections/Orders'
import { Products } from './collections/Products'
import { Users } from './collections/Users'
import { WalletTransactions } from './collections/WalletTransactions'
import { Wallets } from './collections/Wallets'
import { Warehouses } from './collections/Warehouses'
import { StockAlerts } from './collections/StockAlerts'
import { Homepage } from './globals/Homepage'
import { StoreSettings } from './globals/StoreSettings'
import { adminLanguages } from './i18n/admin'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— Lastore',
    },
    components: {
      // Sync admin UI language + RTL with the content locale switcher (fa/en)
      providers: ['@/components/admin/SyncLocaleLanguageProvider#SyncLocaleLanguageProvider'],
      afterNavLinks: ['@/components/admin/ReportsNavLink#ReportsNavLink'],
      views: {
        reports: {
          Component: '@/components/admin/ReportsPage#ReportsPage',
          path: '/reports',
          exact: true,
          meta: {
            title: 'Reports',
          },
        },
      },
    },
  },
  collections: [
    Users,
    Media,
    Categories,
    Brands,
    Attributes,
    AttributeTerms,
    Products,
    Coupons,
    Orders,
    Invoices,
    Wallets,
    WalletTransactions,
    StockAlerts,
    Warehouses,
  ],
  globals: [Homepage, StoreSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  /**
   * Admin UI language (chrome, buttons, nav).
   * Selecting `fa` sets <html dir="RTL" lang="fa"> via Payload's rtlLanguages.
   * Switch under Account → Language, or via `payload-lng` cookie.
   */
  i18n: {
    fallbackLanguage: 'fa',
    supportedLanguages: adminLanguages,
  },
  localization: {
    locales: [
      { code: 'fa', label: { en: 'Persian', fa: 'فارسی' } },
      { code: 'en', label: { en: 'English', fa: 'انگلیسی' } },
    ],
    defaultLocale: 'fa',
    fallback: true,
  },
  sharp,
  upload: {
    limits: {
      fileSize: 10_000_000,
    },
  },
})
