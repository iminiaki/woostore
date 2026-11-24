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
) {
  const found = await payload.find({
    collection: 'attributes',
    where: { slug: { equals: slug } },
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
    return found.docs[0].id
  }

  const doc = await payload.create({
    collection: 'attributes',
    data: { name: nameEn, slug, type, sortOrder, filterable: true },
    locale: 'en',
    overrideAccess: true,
  })
  await payload.update({
    collection: 'attributes',
    id: doc.id,
    data: { name: nameFa },
    locale: 'fa',
    overrideAccess: true,
  })
  return doc.id
}

async function findOrCreateTerm(
  payload: Payload,
  attributeId: string | number,
  slug: string,
  name: string,
  sortOrder: number,
  hex?: string,
) {
  const found = await payload.find({
    collection: 'attribute-terms',
    where: {
      and: [{ attribute: { equals: attributeId } }, { slug: { equals: slug } }],
    },
    limit: 1,
    overrideAccess: true,
  })
  if (found.docs[0]) return found.docs[0].id

  const doc = await payload.create({
    collection: 'attribute-terms',
    data: {
      attribute: attributeId,
      name,
      slug,
      sortOrder,
      ...(hex ? { hex } : {}),
    },
    locale: 'en',
    overrideAccess: true,
  })
  await payload.update({
    collection: 'attribute-terms',
    id: doc.id,
    data: { name },
    locale: 'fa',
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
      data: { name: 'Main Warehouse' },
      locale: 'en',
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

  const colorTermIds = new Map<string, string | number>()
  let colorOrder = 0
  for (const [slug, hex] of Object.entries(COLOR_HEX)) {
    const id = await findOrCreateTerm(payload, colorAttrId, slug, slug, colorOrder++, hex)
    colorTermIds.set(slug, id)
  }

  const sizeTermIds = new Map<string, string | number>()
  for (let i = 0; i < SIZE_ORDER.length; i++) {
    const name = SIZE_ORDER[i]
    const id = await findOrCreateTerm(payload, sizeAttrId, name.toLowerCase(), name, i)
    sizeTermIds.set(name, id)
  }

  const materialTermIds = new Map<string, string | number>()
  for (const [i, name] of ['Cotton', 'Linen', 'Denim', 'Wool'].entries()) {
    const id = await findOrCreateTerm(payload, materialAttrId, name.toLowerCase(), name, i)
    materialTermIds.set(name, id)
  }

  const brandIdByName = new Map<string, string | number>()
  for (const name of brandNames) {
    const slug = name.toLowerCase()
    const found = await payload.find({
      collection: 'brands',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (found.docs[0]) {
      brandIdByName.set(name, found.docs[0].id)
      continue
    }
    const doc = await payload.create({
      collection: 'brands',
      data: { name, slug },
      locale: 'en',
      overrideAccess: true,
    })
    await payload.update({
      collection: 'brands',
      id: doc.id,
      data: { name },
      locale: 'fa',
      overrideAccess: true,
    })
    brandIdByName.set(name, doc.id)
  }

  const categoryIdBySlug = new Map<string, string | number>()
  const subCategoryIdByKey = new Map<string, string | number>()

  for (const cat of mockCategories) {
    let parentId = categoryIdBySlug.get(cat.slug)
    if (!parentId) {
      const found = await payload.find({
        collection: 'categories',
        where: { slug: { equals: cat.slug } },
        limit: 1,
        overrideAccess: true,
      })
      if (found.docs[0]) {
        parentId = found.docs[0].id
      } else {
        const imageId = await ensureMedia(payload, cat.image, cat.name)
        const doc = await payload.create({
          collection: 'categories',
          data: {
            name: cat.name,
            slug: cat.slug,
            ...(imageId ? { image: imageId } : {}),
          },
          locale: 'en',
          overrideAccess: true,
        })
        await payload.update({
          collection: 'categories',
          id: doc.id,
          data: { name: cat.name },
          locale: 'fa',
          overrideAccess: true,
        })
        parentId = doc.id
      }
      categoryIdBySlug.set(cat.slug, parentId)
    }

    for (const sub of cat.subCategories) {
      const key = `${cat.slug}/${sub.slug}`
      const subSlug = `${cat.slug}-${sub.slug}`
      const found = await payload.find({
        collection: 'categories',
        where: { slug: { equals: subSlug } },
        limit: 1,
        overrideAccess: true,
      })
      if (found.docs[0]) {
        subCategoryIdByKey.set(key, found.docs[0].id)
        continue
      }
      const doc = await payload.create({
        collection: 'categories',
        data: {
          name: sub.name,
          slug: subSlug,
          parent: parentId,
        },
        locale: 'en',
        overrideAccess: true,
      })
      await payload.update({
        collection: 'categories',
        id: doc.id,
        data: { name: sub.name },
        locale: 'fa',
        overrideAccess: true,
      })
      subCategoryIdByKey.set(key, doc.id)
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
    const colorTerms = product.colors
      .map((c) => colorTermIds.get(c))
      .filter(Boolean) as (string | number)[]
    const sizeTerms = product.sizes
      .map((s) => sizeTermIds.get(s))
      .filter(Boolean) as (string | number)[]
    const materialTerm = materialTermIds.get(product.material)

    const hasVariants = Boolean(product.variants?.length)

    const variants =
      product.variants
        ?.map((v, idx) => {
          const colorId = v.color ? colorTermIds.get(v.color) : undefined
          const sizeId = v.size ? sizeTermIds.get(v.size) : undefined
          if (!colorId || !sizeId) return null

          // Alternate variant image: use 2nd gallery image when present
          const variantImage = imageIds[idx % imageIds.length]

          return {
            attributeValues: [
              { attribute: colorAttrId, term: colorId },
              { attribute: sizeAttrId, term: sizeId },
            ],
            sku: `${product.id}-${v.color}-${v.size}-${idx + 1}`.toUpperCase(),
            image: variantImage,
            prices: toPrices(v.price),
            compareAtPrices: toCompare(v.originalPrice),
            stock: v.inStock ? 25 : 0,
            inStock: v.inStock,
            allowBackorder: false,
          }
        })
        .filter(Boolean) || []

    const doc = await payload.create({
      collection: 'products',
      data: {
        title: product.name,
        slug: product.id,
        productType: hasVariants ? 'variable' : 'simple',
        description: product.description,
        images: imageIds,
        category: categoryId!,
        ...(subCategoryId ? { subCategory: subCategoryId } : {}),
        brand: brandIdByName.get(product.brand),
        sku: product.id.toUpperCase(),
        prices: toPrices(product.price),
        compareAtPrices: toCompare(product.originalPrice),
        attributes: [
          {
            attribute: colorAttrId,
            terms: colorTerms,
            visible: true,
            usedForVariations: hasVariants,
          },
          {
            attribute: sizeAttrId,
            terms: sizeTerms,
            visible: true,
            usedForVariations: hasVariants,
          },
          ...(materialTerm
            ? [
                {
                  attribute: materialAttrId,
                  terms: [materialTerm],
                  visible: true,
                  usedForVariations: false,
                },
              ]
            : []),
        ],
        customAttributes: [
          {
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
        legacyId: product.id,
        _status: 'published',
      },
      locale: 'en',
      overrideAccess: true,
    })

    await payload.update({
      collection: 'products',
      id: doc.id,
      data: {
        title: product.name,
        description: product.description,
        customAttributes: [
          {
            name: 'مراقبت',
            values: ['شستشو با آب سرد', 'سفیدکننده ممنوع'],
            visible: true,
          },
        ],
      },
      locale: 'fa',
      overrideAccess: true,
    })
  }

  // —— Related / cross-sells (demo links) ——
  const published = await payload.find({
    collection: 'products',
    limit: 12,
    depth: 0,
    locale: 'en',
    overrideAccess: true,
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

  // —— Coupons ——
  const couponDefs = [
    {
      code: 'SAVE10',
      discountType: 'percent' as const,
      amount: 10,
      minimumAmount: 50,
      maximumDiscount: 100,
      description: 'Save 10% on orders over $50',
    },
    {
      code: 'FREESHIP',
      discountType: 'free_shipping' as const,
      amount: 0,
      freeShipping: true,
      minimumAmount: 100,
      description: 'Free shipping on orders over $100',
    },
    {
      code: 'WELCOME20',
      discountType: 'percent' as const,
      amount: 20,
      minimumAmount: 30,
      maximumDiscount: 50,
      description: 'Welcome discount — 20% off',
    },
    {
      code: 'FLAT15',
      discountType: 'fixed_cart' as const,
      amount: 15,
      minimumAmount: 75,
      description: '$15 off carts over $75',
    },
  ]

  const couponIds: Record<string, string | number> = {}
  for (const c of couponDefs) {
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
      locale: 'en',
      overrideAccess: true,
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
