import 'dotenv/config'

import { getPayload, type Payload } from 'payload'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

import config from '../payload.config'
import {
  brands as brandNames,
  categories as mockCategories,
  products as mockProducts,
} from '../data/mock-data'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const rootDir = path.resolve(dirname, '../..')

const USD_TO_IRT = 90_000

const COLOR_HEX: Record<string, string> = {
  black: '#000000',
  white: '#FFFFFF',
  navy: '#0A1628',
  beige: '#F5F0E6',
  blue: '#3B82F6',
  red: '#EF4444',
  green: '#22C55E',
  yellow: '#FACC15',
  purple: '#A855F7',
  pink: '#F472B6',
  gray: '#6B7280',
  brown: '#92400E',
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL']

const categoryNameFa: Record<string, string> = {
  men: 'مردانه',
  women: 'زنانه',
  kids: 'بچگانه',
  accessories: 'اکسسوری',
  tops: 'بالاتنه',
  bottoms: 'پایین‌تنه',
  outerwear: 'لباس بیرونی',
  dresses: 'پیراهن',
  bags: 'کیف',
  hats: 'کلاه',
}

const brandNameFa: Record<string, string> = {
  lastore: 'لست‌استور',
  essential: 'اسنشیال',
  form: 'فرم',
  arc: 'آرک',
}

const colorNameFa: Record<string, string> = {
  black: 'مشکی',
  white: 'سفید',
  navy: 'سرمه‌ای',
  beige: 'بژ',
  blue: 'آبی',
  red: 'قرمز',
  green: 'سبز',
  yellow: 'زرد',
  purple: 'بنفش',
  pink: 'صورتی',
  gray: 'خاکستری',
  brown: 'قهوه‌ای',
}

const materialNameFa: Record<string, string> = {
  Cotton: 'نخ',
  Linen: 'لینن',
  Denim: 'جین',
  Wool: 'پشم',
}

const productNameFa: Array<[string, string]> = [
  ['Linen Shirt', 'پیراهن لینن'],
  ['Cotton Tee', 'تی‌شرت نخی'],
  ['Denim Jacket', 'کت جین'],
  ['Chino Pants', 'شلوار چینو'],
  ['Summer Dress', 'پیراهن تابستانی'],
  ['Casual Blazer', 'بلیزر روزمره'],
  ['Knit Sweater', 'پلیور بافت'],
  ['Silk Blouse', 'بلوز ابریشم'],
]

const faDigits = '۰۱۲۳۴۵۶۷۸۹'
const faProductDescription = 'پارچه تنفس‌پذیر با برش ساده برای راحتی روزمره.'

function persianProductTitle(name: string) {
  for (const [en, fa] of productNameFa) {
    if (!name.startsWith(en)) continue
    const number = name.slice(en.length).trim()
    const localNumber = number.replace(/\d/g, (digit) => faDigits[Number(digit)] ?? digit)
    return localNumber ? `${fa} ${localNumber}` : fa
  }
  return name
}

type LangId = string | number
type LangPair = { fa: LangId; en: LangId }

async function ensureMedia(payload: Payload, relativePublicPath: string, alt: string) {
  const absolute = path.join(rootDir, 'public', relativePublicPath.replace(/^\//, ''))
  try {
    await fs.access(absolute)
  } catch {
    payload.logger.warn(`Missing media file: ${absolute}`)
    return null
  }

  const existing = await payload.find({
    collection: 'media',
    where: { filename: { equals: path.basename(absolute) } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs[0]) return existing.docs[0].id

  const buffer = await fs.readFile(absolute)
  const media = await payload.create({
    collection: 'media',
    data: { alt },
    locale: 'fa',
    file: {
      data: buffer,
      mimetype: absolute.endsWith('.png')
        ? 'image/png'
        : absolute.endsWith('.webp')
          ? 'image/webp'
          : 'image/jpeg',
      name: path.basename(absolute),
      size: buffer.byteLength,
    },
    overrideAccess: true,
  })

  await payload.update({
    collection: 'media',
    id: media.id,
    data: { alt },
    locale: 'en',
    overrideAccess: true,
  })

  return media.id
}

async function findOrCreateAttribute(
  payload: Payload,
  slug: string,
  nameEn: string,
  nameFa: string,
  type: 'select' | 'color' | 'button',
  sortOrder: number,
): Promise<LangPair> {
  const pair = {} as LangPair
  for (const language of ['fa', 'en'] as const) {
    const found = await payload.find({
      collection: 'attributes',
      where: { and: [{ slug: { equals: slug } }, { language: { equals: language } }] },
      limit: 1,
      overrideAccess: true,
    })
    if (found.docs[0]) {
      await payload.update({
        collection: 'attributes',
        id: found.docs[0].id,
        data: { filterable: true, type, sortOrder },
        overrideAccess: true,
      })
      pair[language] = found.docs[0].id
      continue
    }
    const doc = await payload.create({
      collection: 'attributes',
      data: {
        language,
        name: language === 'fa' ? nameFa : nameEn,
        slug,
        type,
        sortOrder,
        filterable: true,
      },
      overrideAccess: true,
    })
    pair[language] = doc.id
  }
  return pair
}

async function findOrCreateTerm(
  payload: Payload,
  attribute: LangPair,
  slug: string,
  nameEn: string,
  nameFa: string,
  sortOrder: number,
  hex?: string,
): Promise<LangPair> {
  const pair = {} as LangPair
  for (const language of ['fa', 'en'] as const) {
    const found = await payload.find({
      collection: 'attribute-terms',
      where: {
        and: [
          { attribute: { equals: attribute[language] } },
          { slug: { equals: slug } },
          { language: { equals: language } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })
    if (found.docs[0]) {
      pair[language] = found.docs[0].id
      continue
    }
    const doc = await payload.create({
      collection: 'attribute-terms',
      data: {
        language,
        attribute: attribute[language],
        name: language === 'fa' ? nameFa : nameEn,
        slug,
        sortOrder,
        ...(hex ? { hex } : {}),
      },
      overrideAccess: true,
    })
    pair[language] = doc.id
  }
  return pair
}

async function ensureCategory(
  payload: Payload,
  language: 'fa' | 'en',
  slug: string,
  name: string,
  parent?: LangId,
  image?: string | number | null,
) {
  const found = await payload.find({
    collection: 'categories',
    where: { and: [{ slug: { equals: slug } }, { language: { equals: language } }] },
    limit: 1,
    overrideAccess: true,
  })
  if (found.docs[0]) return found.docs[0].id

  const doc = await payload.create({
    collection: 'categories',
    data: {
      language,
      name,
      slug,
      ...(parent != null ? { parent } : {}),
      ...(image ? { image } : {}),
    },
    overrideAccess: true,
  })
  return doc.id
}

async function clearCollection(payload: Payload, collection: 'products' | 'attribute-terms' | 'attributes') {
  const batch = await payload.find({
    collection,
    limit: 200,
    overrideAccess: true,
  })
  for (const doc of batch.docs) {
    await payload.delete({ collection, id: doc.id, overrideAccess: true })
  }
}

async function seed() {
  const payload = await getPayload({ config })
  payload.logger.info('Seeding Lastore…')

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@lastore.local'
  const managerEmail = process.env.SEED_MANAGER_EMAIL || 'manager@lastore.local'

  const existingAdmin = await payload.find({
    collection: 'users',
    where: { email: { equals: adminEmail } },
    limit: 1,
    overrideAccess: true,
  })
  if (!existingAdmin.docs.length) {
    await payload.create({
      collection: 'users',
      data: {
        email: adminEmail,
        password: process.env.SEED_ADMIN_PASSWORD || 'Admin123!',
        name: 'Store Admin',
        role: 'admin',
      },
      overrideAccess: true,
    })
    payload.logger.info(`Created admin: ${adminEmail}`)
  }

  const existingManager = await payload.find({
    collection: 'users',
    where: { email: { equals: managerEmail } },
    limit: 1,
    overrideAccess: true,
  })
  if (!existingManager.docs.length) {
    await payload.create({
      collection: 'users',
      data: {
        email: managerEmail,
        password: process.env.SEED_MANAGER_PASSWORD || 'Manager123!',
        name: 'Shop Manager',
        role: 'shop-manager',
      },
      overrideAccess: true,
    })
    payload.logger.info(`Created shop manager: ${managerEmail}`)
  }

  await payload.updateGlobal({
    slug: 'store-settings',
    data: {
      storeName: 'لست‌استور',
      defaultLocale: 'fa',
      defaultCurrency: 'IRT',
      enabledCurrencies: ['IRT', 'USD'],
      websiteLanguages: [
        { code: 'fa', label: 'فارسی', direction: 'rtl', currency: 'IRT', isDefault: true },
        { code: 'en', label: 'English', direction: 'ltr', currency: 'USD', isDefault: false },
      ],
      unprefixedDefault: false,
      reportingExchangeRate: USD_TO_IRT,
      lowStockThreshold: 5,
      allowBackordersDefault: false,
      smsProvider: 'console',
      supportEmail: 'support@lastore.local',
    },
    locale: 'fa',
    overrideAccess: true,
  })
  await payload.updateGlobal({
    slug: 'store-settings',
    data: { storeName: 'Lastore' },
    locale: 'en',
    overrideAccess: true,
  })

  const warehouses = await payload.find({ collection: 'warehouses', limit: 1, overrideAccess: true })
  if (!warehouses.docs.length) {
    const wh = await payload.create({
      collection: 'warehouses',
      data: {
        name: 'انبار اصلی',
        code: 'MAIN',
        isDefault: true,
        address: { city: 'Tehran', province: 'Tehran', country: 'IR' },
      },
      locale: 'fa',
      overrideAccess: true,
    })
    await payload.update({
      collection: 'warehouses',
      id: wh.id,
      data: { name: 'انبار اصلی' },
      overrideAccess: true,
    })
  }

  // Reset catalog attributes + products so schema changes apply cleanly
  await clearCollection(payload, 'products')
  await clearCollection(payload, 'attribute-terms')
  await clearCollection(payload, 'attributes')

  const colorAttrId = await findOrCreateAttribute(payload, 'color', 'Color', 'رنگ', 'color', 0)
  const sizeAttrId = await findOrCreateAttribute(payload, 'size', 'Size', 'سایز', 'button', 1)
  const materialAttrId = await findOrCreateAttribute(
    payload,
    'material',
    'Material',
    'جنس',
    'select',
    2,
  )

  const colorTermIds = new Map<string, LangPair>()
  let colorOrder = 0
  for (const [slug, hex] of Object.entries(COLOR_HEX)) {
    const pair = await findOrCreateTerm(
      payload,
      colorAttrId,
      slug,
      slug,
      colorNameFa[slug] ?? slug,
      colorOrder++,
      hex,
    )
    colorTermIds.set(slug, pair)
  }

  const sizeTermIds = new Map<string, LangPair>()
  for (let i = 0; i < SIZE_ORDER.length; i++) {
    const name = SIZE_ORDER[i]!
    const pair = await findOrCreateTerm(payload, sizeAttrId, name.toLowerCase(), name, name, i)
    sizeTermIds.set(name, pair)
  }

  const materialTermIds = new Map<string, LangPair>()
  for (const [i, name] of ['Cotton', 'Linen', 'Denim', 'Wool'].entries()) {
    const pair = await findOrCreateTerm(
      payload,
      materialAttrId,
      name.toLowerCase(),
      name,
      materialNameFa[name] ?? name,
      i,
    )
    materialTermIds.set(name, pair)
  }

  const brandIdByName = new Map<string, LangPair>()
  for (const name of brandNames) {
    const slug = name.toLowerCase()
    const pair = {} as LangPair
    for (const language of ['fa', 'en'] as const) {
      const found = await payload.find({
        collection: 'brands',
        where: { and: [{ slug: { equals: slug } }, { language: { equals: language } }] },
        limit: 1,
        overrideAccess: true,
      })
      if (found.docs[0]) {
        pair[language] = found.docs[0].id
        continue
      }
      const doc = await payload.create({
        collection: 'brands',
        data: {
          language,
          name: language === 'fa' ? (brandNameFa[slug] ?? name) : name,
          slug,
        },
        overrideAccess: true,
      })
      pair[language] = doc.id
    }
    brandIdByName.set(name, pair)
  }

  const categoryIdBySlug = new Map<string, LangPair>()
  const subCategoryIdByKey = new Map<string, LangPair>()

  for (const cat of mockCategories) {
    let parent = categoryIdBySlug.get(cat.slug)
    if (!parent) {
      const imageId = await ensureMedia(payload, cat.image, cat.name)
      parent = {
        fa: await ensureCategory(payload, 'fa', cat.slug, categoryNameFa[cat.slug] ?? cat.name, undefined, imageId),
        en: await ensureCategory(payload, 'en', cat.slug, cat.name, undefined, imageId),
      }
      categoryIdBySlug.set(cat.slug, parent)
    }

    for (const sub of cat.subCategories) {
      const key = `${cat.slug}/${sub.slug}`
      const subSlug = `${cat.slug}-${sub.slug}`
      if (subCategoryIdByKey.has(key)) continue
      subCategoryIdByKey.set(key, {
        fa: await ensureCategory(
          payload,
          'fa',
          subSlug,
          categoryNameFa[sub.slug] ?? sub.name,
          parent.fa,
        ),
        en: await ensureCategory(payload, 'en', subSlug, sub.name, parent.en),
      })
    }
  }

  const toPrices = (usd: number) => ({
    usd,
    irt: Math.round(usd * USD_TO_IRT),
  })
  const toCompare = (usd?: number) =>
    usd != null ? { usd, irt: Math.round(usd * USD_TO_IRT) } : undefined

  for (const product of mockProducts) {
    const imageIds: (string | number)[] = []
    for (const img of product.images) {
      const id = await ensureMedia(payload, img, product.name)
      if (id) imageIds.push(id)
    }
    if (!imageIds.length) {
      payload.logger.warn(`Skipping ${product.id}: no images`)
      continue
    }

    const categoryId = categoryIdBySlug.get(product.category)
    const subCategoryId = subCategoryIdByKey.get(`${product.category}/${product.subCategory}`)
    const hasVariants = Boolean(product.variants?.length)

    for (const language of ['fa', 'en'] as const) {
      const colorTerms = product.colors
        .map((c) => colorTermIds.get(c)?.[language])
        .filter((id): id is LangId => id != null)
      const sizeTerms = product.sizes
        .map((s) => sizeTermIds.get(s)?.[language])
        .filter((id): id is LangId => id != null)
      const materialTerm = materialTermIds.get(product.material)?.[language]

      const variants =
        product.variants
          ?.map((v, idx) => {
            const colorId = v.color ? colorTermIds.get(v.color)?.[language] : undefined
            const sizeId = v.size ? sizeTermIds.get(v.size)?.[language] : undefined
            if (!colorId || !sizeId) return null

            const variantImage = imageIds[idx % imageIds.length]
            const sku = `${product.id}-${v.color}-${v.size}-${idx + 1}`.toUpperCase()

            return {
              attributeValues: [
                { attribute: colorAttrId[language], term: colorId },
                { attribute: sizeAttrId[language], term: sizeId },
              ],
              sku: language === 'en' ? `${sku}-EN` : sku,
              image: variantImage,
              prices: toPrices(v.price),
              compareAtPrices: toCompare(v.originalPrice),
              stock: v.inStock ? 25 : 0,
              inStock: v.inStock,
              allowBackorder: false,
            }
          })
          .filter((row) => row != null) || []

      await payload.create({
        collection: 'products',
        data: {
          language,
          title: language === 'fa' ? persianProductTitle(product.name) : product.name,
          slug: product.id,
          productType: hasVariants ? 'variable' : 'simple',
          description: language === 'fa' ? faProductDescription : product.description,
          images: imageIds,
          category: categoryId![language],
          ...(subCategoryId ? { subCategory: subCategoryId[language] } : {}),
          brand: brandIdByName.get(product.brand)?.[language],
          sku: language === 'en' ? `${product.id.toUpperCase()}-EN` : product.id.toUpperCase(),
          prices: toPrices(product.price),
          compareAtPrices: toCompare(product.originalPrice),
          attributes: [
            {
              attribute: colorAttrId[language],
              terms: colorTerms,
              visible: true,
              usedForVariations: hasVariants,
            },
            {
              attribute: sizeAttrId[language],
              terms: sizeTerms,
              visible: true,
              usedForVariations: hasVariants,
            },
            ...(materialTerm
              ? [
                  {
                    attribute: materialAttrId[language],
                    terms: [materialTerm],
                    visible: true,
                    usedForVariations: false,
                  },
                ]
              : []),
          ],
          customAttributes: [
            language === 'fa'
              ? {
                  name: 'مراقبت',
                  values: ['شستشو با آب سرد', 'سفیدکننده ممنوع'],
                  visible: true,
                }
              : {
                  name: 'Care',
                  values: ['Machine wash cold', 'Do not bleach'],
                  visible: true,
                },
          ],
          variants,
          stock: product.inStock ? 40 : 0,
          inStock: product.inStock,
          featured: product.featured,
          newArrival: product.newArrival,
          clearance: product.clearance,
          rating: product.rating,
          reviewCount: product.reviews,
          tags: product.tags,
          legacyId: language === 'en' ? `${product.id}-en` : product.id,
          _status: 'published',
        },
        overrideAccess: true,
      })
    }
  }

  // —— Related / cross-sells (demo links), kept inside each language ——
  for (const language of ['fa', 'en'] as const) {
    const published = await payload.find({
      collection: 'products',
      limit: 12,
      depth: 0,
      sort: 'slug',
      overrideAccess: true,
      where: { and: [{ language: { equals: language } }, { _status: { equals: 'published' } }] },
    })
    const productIds = published.docs.map((d) => d.id)
    for (let i = 0; i < Math.min(productIds.length, 8); i++) {
      const id = productIds[i]!
      const related = productIds.filter((_, idx) => idx !== i).slice(i % 3, (i % 3) + 3)
      const cross = productIds.filter((_, idx) => idx !== i).slice((i + 2) % 4, (i + 2) % 4 + 2)
      await payload.update({
        collection: 'products',
        id,
        data: {
          relatedProducts: related,
          crossSells: cross,
        },
        overrideAccess: true,
      })
    }
  }

  // —— Coupons ——
  const couponDefs = [
    {
      code: 'SAVE10',
      discountType: 'percent' as const,
      amount: 10,
      minimumAmount: 50,
      maximumDiscount: 100,
      minimumAmountIrt: 50 * USD_TO_IRT,
      maximumDiscountIrt: 100 * USD_TO_IRT,
      description: 'Save 10% on orders over $50',
      descriptionFa: '۱۰٪ تخفیف برای سفارش‌های بالای ۵۰ دلار',
    },
    {
      code: 'FREESHIP',
      discountType: 'free_shipping' as const,
      amount: 0,
      freeShipping: true,
      minimumAmount: 100,
      minimumAmountIrt: 100 * USD_TO_IRT,
      description: 'Free shipping on orders over $100',
      descriptionFa: 'ارسال رایگان برای سفارش‌های بالای ۱۰۰ دلار',
    },
    {
      code: 'WELCOME20',
      discountType: 'percent' as const,
      amount: 20,
      minimumAmount: 30,
      maximumDiscount: 50,
      minimumAmountIrt: 30 * USD_TO_IRT,
      maximumDiscountIrt: 50 * USD_TO_IRT,
      description: 'Welcome discount — 20% off',
      descriptionFa: 'تخفیف خوش‌آمدگویی — ۲۰٪',
    },
    {
      code: 'FLAT15',
      discountType: 'fixed_cart' as const,
      amount: 15,
      amountIrt: 15 * USD_TO_IRT,
      minimumAmount: 75,
      minimumAmountIrt: 75 * USD_TO_IRT,
      description: '$15 off carts over $75',
      descriptionFa: '۱۵ دلار تخفیف برای سبدهای بالای ۷۵ دلار',
    },
  ]

  const couponIds: Record<string, string | number> = {}
  for (const { descriptionFa, ...c } of couponDefs) {
    const existing = await payload.find({
      collection: 'coupons',
      where: { code: { equals: c.code } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs[0]) {
      couponIds[c.code] = existing.docs[0].id
      continue
    }
    const doc = await payload.create({
      collection: 'coupons',
      data: {
        ...c,
        active: true,
        expiryDate: new Date('2027-12-31').toISOString(),
        startDate: new Date('2024-01-01').toISOString(),
      },
      locale: 'en',
      overrideAccess: true,
    })
    await payload.update({
      collection: 'coupons',
      id: doc.id,
      data: { description: descriptionFa },
      locale: 'fa',
      overrideAccess: true,
    })
    couponIds[c.code] = doc.id
  }

  // —— Sample orders for reports ——
  const existingOrders = await payload.find({
    collection: 'orders',
    limit: 1,
    overrideAccess: true,
  })
  if (!existingOrders.docs[0]) {
    const productDocs = await payload.find({
      collection: 'products',
      limit: 8,
      depth: 1,
      overrideAccess: true,
      where: { language: { equals: 'en' } },
    })

    const customers = [
      { email: 'sara@example.com', name: 'Sara Ahmadi' },
      { email: 'reza@example.com', name: 'Reza Karimi' },
      { email: 'mina@example.com', name: 'Mina Hosseini' },
    ]

    for (let i = 0; i < 12; i++) {
      const product = productDocs.docs[i % productDocs.docs.length]
      if (!product) continue
      const customer = customers[i % customers.length]
      const qty = (i % 3) + 1
      const unitPrice = Number(
        (product.prices as { usd?: number } | undefined)?.usd ?? 40,
      )
      const lineTotal = unitPrice * qty
      const useCoupon = i % 4 === 0
      const discountTotal = useCoupon ? Math.min(10, lineTotal * 0.1) : 0
      const category =
        typeof product.category === 'object' && product.category
          ? product.category
          : null

      const createdAt = new Date()
      createdAt.setDate(createdAt.getDate() - (i * 2 + 1))

      await payload.create({
        collection: 'orders',
        data: {
          status: i % 7 === 0 ? 'completed' : 'processing',
          currency: 'usd',
          email: customer.email,
          billingName: customer.name,
          billingEmail: customer.email,
          shippingName: customer.name,
          shippingEmail: customer.email,
          items: [
            {
              product: product.id,
              productTitle: String(product.title || 'Product'),
              quantity: qty,
              unitPrice,
              lineTotal,
              category: category?.id,
              categorySlug: category?.slug,
              categoryName: category?.name,
            },
          ],
          subtotal: lineTotal,
          discountTotal,
          shippingTotal: 0,
          taxTotal: 0,
          total: lineTotal - discountTotal,
          coupon: useCoupon ? couponIds.SAVE10 : undefined,
          couponCode: useCoupon ? 'SAVE10' : undefined,
          paymentMethod: 'cod',
          createdAt: createdAt.toISOString(),
        },
        overrideAccess: true,
      })
    }
  }

  // Homepage hero slides (Content → Homepage)
  const heroDesktop = await ensureMedia(payload, 'hero.jpg', 'Hero desktop')
  const heroMen = await ensureMedia(payload, 'product images/man banner.jpg', 'Men banner')
  const heroWomen = await ensureMedia(payload, 'product images/woman banner.jpg', 'Women banner')

  if (heroDesktop && heroMen && heroWomen) {
    const slideDefs = [
      {
        titleEn: 'Minimal styles\nfor every season',
        titleFa: 'استایل مینیمال\nبرای هر فصل',
        descEn:
          'Curated apparel with clean lines and lasting comfort — pieces made to wear, not just to show.',
        descFa: 'لباس‌های گزینش‌شده با خطوط تمیز و راحتی ماندگار — برای پوشیدن، نه فقط برای نمایش.',
        desktop: heroDesktop,
        mobile: heroDesktop,
        primaryEn: 'Shop now',
        primaryFa: 'خرید کنید',
        primaryHref: '/shop',
        secondaryEn: 'About us',
        secondaryFa: 'درباره ما',
        secondaryHref: '/about',
      },
      {
        titleEn: "Men's collection",
        titleFa: 'کالکشن آقایان',
        descEn: 'Discover timeless staples built for everyday wear.',
        descFa: 'قطعات ماندگار برای استفاده روزمره.',
        desktop: heroMen,
        mobile: heroMen,
        primaryEn: 'Shop men',
        primaryFa: 'خرید آقایان',
        primaryHref: '/category/men',
        secondaryEn: 'Browse shop',
        secondaryFa: 'مشاهده فروشگاه',
        secondaryHref: '/shop',
      },
      {
        titleEn: "Women's collection",
        titleFa: 'کالکشن بانوان',
        descEn: 'Clean silhouettes and considered details for every season.',
        descFa: 'فرم‌های تمیز و جزئیات فکرشده برای هر فصل.',
        desktop: heroWomen,
        mobile: heroWomen,
        primaryEn: 'Shop women',
        primaryFa: 'خرید بانوان',
        primaryHref: '/category/women',
        secondaryEn: 'Browse shop',
        secondaryFa: 'مشاهده فروشگاه',
        secondaryHref: '/shop',
      },
    ]

    for (const locale of ['fa', 'en'] as const) {
      const isFa = locale === 'fa'
      await payload.updateGlobal({
        slug: 'homepage',
        locale,
        data: {
          heroSlides: slideDefs.map((s) => ({
            title: isFa ? s.titleFa : s.titleEn,
            description: isFa ? s.descFa : s.descEn,
            desktopImage: s.desktop,
            mobileImage: s.mobile,
            primaryButton: {
              label: isFa ? s.primaryFa : s.primaryEn,
              href: s.primaryHref,
            },
            secondaryButton: {
              enabled: true,
              label: isFa ? s.secondaryFa : s.secondaryEn,
              href: s.secondaryHref,
            },
          })),
        },
        overrideAccess: true,
      })
    }

    payload.logger.info('Seeded homepage hero slides.')
  } else {
    payload.logger.warn('Skipped homepage hero seed (missing image files).')
  }

  payload.logger.info('Seed complete (catalog + coupons + sample orders).')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
