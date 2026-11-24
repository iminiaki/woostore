import { en } from '@payloadcms/translations/languages/en'
import { fa } from '@payloadcms/translations/languages/fa'
import type { SupportedLanguages } from '@payloadcms/translations'

/** Admin UI languages — `fa` is RTL via Payload's built-in rtlLanguages. */
export const adminLanguages = {
  en,
  fa,
} satisfies SupportedLanguages

export const t = {
  catalog: { en: 'Catalog', fa: 'کاتالوگ' },
  commerce: { en: 'Commerce', fa: 'فروش' },
  content: { en: 'Content', fa: 'محتوا' },
  inventory: { en: 'Inventory', fa: 'انبار' },
  system: { en: 'System', fa: 'سیستم' },

  users: { singular: { en: 'User', fa: 'کاربر' }, plural: { en: 'Users', fa: 'کاربران' } },
  media: { singular: { en: 'Media', fa: 'رسانه' }, plural: { en: 'Media', fa: 'رسانه' } },
  categories: {
    singular: { en: 'Category', fa: 'دسته‌بندی' },
    plural: { en: 'Categories', fa: 'دسته‌بندی‌ها' },
  },
  brands: { singular: { en: 'Brand', fa: 'برند' }, plural: { en: 'Brands', fa: 'برندها' } },
  attributes: {
    singular: { en: 'Attribute', fa: 'ویژگی' },
    plural: { en: 'Attributes', fa: 'ویژگی‌ها' },
  },
  attributeTerms: {
    singular: { en: 'Attribute Term', fa: 'مقدار ویژگی' },
    plural: { en: 'Attribute Terms', fa: 'مقادیر ویژگی' },
  },
  products: {
    singular: { en: 'Product', fa: 'محصول' },
    plural: { en: 'Products', fa: 'محصولات' },
  },
  warehouses: {
    singular: { en: 'Warehouse', fa: 'انبار' },
    plural: { en: 'Warehouses', fa: 'انبارها' },
  },
  coupons: {
    singular: { en: 'Coupon', fa: 'کد تخفیف' },
    plural: { en: 'Coupons', fa: 'کدهای تخفیف' },
  },
  orders: {
    singular: { en: 'Order', fa: 'سفارش' },
    plural: { en: 'Orders', fa: 'سفارش‌ها' },
  },
  stockAlerts: {
    singular: { en: 'Stock alert', fa: 'اعلان موجودی' },
    plural: { en: 'Stock alerts', fa: 'اعلان‌های موجودی' },
  },
  storeSettings: { en: 'Store Settings', fa: 'تنظیمات فروشگاه' },
  homepage: { en: 'Homepage', fa: 'صفحه اصلی' },
  reports: { en: 'Reports', fa: 'گزارش‌ها' },
  reportsDesc: {
    en: 'Sales analytics for a custom date range.',
    fa: 'تحلیل فروش در بازه زمانی دلخواه.',
  },
  reportsFrom: { en: 'From', fa: 'از' },
  reportsTo: { en: 'To', fa: 'تا' },
  reportsApply: { en: 'Apply', fa: 'اعمال' },
  reportsLoading: { en: 'Loading…', fa: 'در حال بارگذاری…' },
  reportsOrders: { en: 'Orders', fa: 'سفارش‌ها' },
  reportsRevenue: { en: 'Revenue', fa: 'درآمد' },
  reportsItemsSold: { en: 'Items sold', fa: 'اقلام فروخته‌شده' },
  reportsDiscounts: { en: 'Discounts', fa: 'تخفیف‌ها' },
  reportsAvgOrder: { en: 'Avg order', fa: 'میانگین سفارش' },
  reportsOverview: { en: 'Overview', fa: 'نمای کلی' },
  reportsProducts: { en: 'Products', fa: 'محصولات' },
  reportsCategories: { en: 'Categories', fa: 'دسته‌بندی‌ها' },
  reportsCustomers: { en: 'Customers', fa: 'مشتریان' },
  reportsSalesOverTime: { en: 'Sales over time', fa: 'فروش در طول زمان' },
  reportsByProduct: { en: 'Sales by product', fa: 'فروش بر اساس محصول' },
  reportsByCategory: { en: 'Sales by category', fa: 'فروش بر اساس دسته‌بندی' },
  reportsTopCustomers: { en: 'Top customers', fa: 'برترین مشتریان' },
  reportsName: { en: 'Name', fa: 'نام' },
  reportsQty: { en: 'Qty', fa: 'تعداد' },
  reportsCustomer: { en: 'Customer', fa: 'مشتری' },
} as const
