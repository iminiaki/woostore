import 'dotenv/config'

import { getPayload, type Payload } from 'payload'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

import config from '../payload.config'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const rootDir = path.resolve(dirname, '../..')

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
      mimetype: absolute.endsWith('.webp')
        ? 'image/webp'
        : absolute.endsWith('.png')
          ? 'image/png'
          : 'image/jpeg',
      name: path.basename(absolute),
      size: buffer.byteLength,
    },
    overrideAccess: true,
  })

  return media.id
}

async function seedHero() {
  const payload = await getPayload({ config })

  const heroDesktop = await ensureMedia(payload, 'hero.jpg', 'Hero desktop')
  const heroMen = await ensureMedia(payload, 'product images/man banner.jpg', 'Men banner')
  const heroWomen = await ensureMedia(payload, 'product images/woman banner.jpg', 'Women banner')

  if (!heroDesktop || !heroMen || !heroWomen) {
    throw new Error('Missing hero image files in public/')
  }

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

  // Write FA first, then EN last so English is present for the default storefront locale.
  for (const locale of ['fa', 'en'] as const) {
    const isFa = locale === 'fa'
    await payload.updateGlobal({
      slug: 'homepage',
      locale,
      overrideAccess: true,
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
    })
  }

  const check = await payload.findGlobal({
    slug: 'homepage',
    depth: 0,
    locale: 'en',
    fallbackLocale: false,
  })
  payload.logger.info(
    `Homepage hero slides seeded (${(check as { heroSlides?: unknown[] }).heroSlides?.length ?? 0} slides, en title=${(check as { heroSlides?: Array<{ title?: string }> }).heroSlides?.[0]?.title?.slice(0, 24) ?? 'n/a'})`,
  )
  process.exit(0)
}

seedHero().catch((err) => {
  console.error(err)
  process.exit(1)
})
