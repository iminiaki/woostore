import type { Category, FilterDefinition, FilterGroup, HeroSlide, Product } from '@/types'
import { mapPayloadCategories, mapPayloadProduct } from '@/lib/map-product'
import { getPayloadClient } from '@/lib/payload'
import {
  filterProducts,
  parseQuery,
  type ProductQuery,
} from '@/lib/shop'

const FALLBACK_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'fallback-1',
    title: 'Minimal styles\nfor every season',
    description:
      'Curated apparel with clean lines and lasting comfort — pieces made to wear, not just to show.',
    desktopImage: '/hero.jpg',
    mobileImage: '/hero.jpg',
    primaryButton: { label: 'Shop now', href: '/shop' },
    secondaryButton: { label: 'About us', href: '/about' },
  },
  {
    id: 'fallback-2',
    title: 'Men’s collection',
    description: 'Discover timeless staples built for everyday wear.',
    desktopImage: '/product images/man banner.jpg',
    mobileImage: '/product images/man banner.jpg',
    primaryButton: { label: 'Shop men', href: '/category/men' },
    secondaryButton: { label: 'Browse shop', href: '/shop' },
  },
  {
    id: 'fallback-3',
    title: 'Women’s collection',
    description: 'Clean silhouettes and considered details for every season.',
    desktopImage: '/product images/woman banner.jpg',
    mobileImage: '/product images/woman banner.jpg',
    primaryButton: { label: 'Shop women', href: '/category/women' },
    secondaryButton: { label: 'Browse shop', href: '/shop' },
  },
]

function mediaSrc(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const media = value as {
    url?: string | null
    thumbnailURL?: string | null
    sizes?: { card?: { url?: string | null }; thumbnail?: { url?: string | null } }
  }
  return (
    media.url ||
    media.sizes?.card?.url ||
    media.sizes?.thumbnail?.url ||
    media.thumbnailURL ||
    null
  )
}

function mapHeroSlides(raw: unknown): HeroSlide[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((row, index) => {
      if (!row || typeof row !== 'object') return null
      const slide = row as Record<string, unknown>
      const desktopImage = mediaSrc(slide.desktopImage)
      if (!desktopImage) return null

      const mobileImage = mediaSrc(slide.mobileImage) || desktopImage
      const primary = (slide.primaryButton || {}) as Record<string, unknown>
      const secondary = (slide.secondaryButton || {}) as Record<string, unknown>
      const secondaryEnabled = secondary.enabled !== false
      const secondaryLabel = String(secondary.label || '').trim()
      const secondaryHref = String(secondary.href || '').trim()

      return {
        id: String(slide.id || `slide-${index}`),
        title: String(slide.title || '').trim(),
        description: String(slide.description || '').trim(),
        desktopImage,
        mobileImage,
        primaryButton: {
          label: String(primary.label || 'Shop now').trim() || 'Shop now',
          href: String(primary.href || '/shop').trim() || '/shop',
        },
        secondaryButton:
          secondaryEnabled && secondaryLabel
            ? {
                label: secondaryLabel,
                href: secondaryHref || '/about',
              }
            : null,
      } satisfies HeroSlide
    })
    .filter((slide): slide is HeroSlide => Boolean(slide?.title && slide.desktopImage))
}

export async function getStoreHeroSlides(locale: 'fa' | 'en' = 'en'): Promise<HeroSlide[]> {
  try {
    const payload = await getPayloadClient()
    const homepage = await payload.findGlobal({
      slug: 'homepage',
      depth: 2,
      locale,
      fallbackLocale: locale === 'en' ? false : 'en',
    })
    const slides = mapHeroSlides((homepage as { heroSlides?: unknown }).heroSlides)
    return slides.length ? slides : FALLBACK_HERO_SLIDES
  } catch {
    return FALLBACK_HERO_SLIDES
  }
}

export async function getStoreProducts(options?: {
  limit?: number
  locale?: 'fa' | 'en'
}): Promise<Product[]> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'products',
    depth: 3,
    limit: options?.limit ?? 100,
    locale: options?.locale ?? 'en',
    where: {
      _status: {
        equals: 'published',
      },
    },
    sort: '-createdAt',
  })

  return result.docs.map((doc) => mapPayloadProduct(doc as unknown as Record<string, unknown>))
}

export async function getStoreProductByIdOrSlug(
  idOrSlug: string,
  locale: 'fa' | 'en' = 'en',
): Promise<Product | null> {
  const payload = await getPayloadClient()

  const byId = await payload.find({
    collection: 'products',
    depth: 3,
    limit: 1,
    locale,
    where: {
      and: [
        { _status: { equals: 'published' } },
        {
          or: [{ id: { equals: idOrSlug } }, { slug: { equals: idOrSlug } }],
        },
      ],
    },
  })

  const doc = byId.docs[0]
  if (!doc) return null
  return mapPayloadProduct(doc as unknown as Record<string, unknown>)
}

export async function getStoreCategories(locale: 'fa' | 'en' = 'en'): Promise<Category[]> {
  const payload = await getPayloadClient()
  // depth 2 so category.image (media upload) is fully populated from admin
  const result = await payload.find({
    collection: 'categories',
    depth: 2,
    limit: 100,
    locale,
    sort: 'slug',
  })
  return mapPayloadCategories(result.docs as unknown as Record<string, unknown>[])
}

/**
 * Dynamic filter definitions from admin:
 * - Brands (always available when products have brands)
 * - Attributes with “Use as filter” checked
 */
export async function getFilterDefinitions(
  locale: 'fa' | 'en' = 'en',
): Promise<FilterDefinition[]> {
  const payload = await getPayloadClient()
  const attrs = await payload.find({
    collection: 'attributes',
    depth: 0,
    limit: 100,
    locale,
    sort: 'sortOrder',
    where: {
      filterable: {
        equals: true,
      },
    },
  })

  const defs: FilterDefinition[] = [
    { key: 'brand', title: 'Brand', kind: 'brand' },
    ...attrs.docs.map((doc) => ({
      key: String(doc.slug),
      title: String(doc.name || doc.slug),
      kind: 'attribute' as const,
      attributeType: doc.type as FilterDefinition['attributeType'],
    })),
  ]

  return defs
}

type CatalogTerm = {
  slug: string
  name: string
  hex?: string | null
  sortOrder: number
}

/**
 * Full attribute-term lists from admin, keyed by attribute slug,
 * already sorted by sortOrder (same order as in Payload).
 */
async function getAttributeTermsBySlug(
  attributeSlugs: string[],
  locale: 'fa' | 'en' = 'en',
): Promise<Record<string, CatalogTerm[]>> {
  if (!attributeSlugs.length) return {}
  const payload = await getPayloadClient()

  const attrs = await payload.find({
    collection: 'attributes',
    depth: 0,
    limit: 100,
    locale,
    where: {
      slug: {
        in: attributeSlugs,
      },
    },
  })
  const idToSlug = new Map(
    attrs.docs.map((a) => [String(a.id), String(a.slug)] as const),
  )
  if (!idToSlug.size) return {}

  const attrIds = attrs.docs.map((a) => a.id)
  const terms = await payload.find({
    collection: 'attribute-terms',
    depth: 0,
    limit: 500,
    locale,
    where: {
      attribute: {
        in: attrIds,
      },
    },
    sort: 'sortOrder',
  })

  const out: Record<string, CatalogTerm[]> = {}
  for (const term of terms.docs) {
    const attrId =
      typeof term.attribute === 'object' && term.attribute
        ? String((term.attribute as { id?: string | number }).id)
        : String(term.attribute)
    const attrSlug = idToSlug.get(attrId)
    if (!attrSlug) continue
    if (!out[attrSlug]) out[attrSlug] = []
    out[attrSlug].push({
      slug: String(term.slug),
      name: String(term.name || term.slug),
      hex: typeof term.hex === 'string' ? term.hex : null,
      sortOrder: typeof term.sortOrder === 'number' ? term.sortOrder : 0,
    })
  }

  // Keep admin order even if DB sort is ambiguous across attributes
  for (const slug of Object.keys(out)) {
    out[slug].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  }

  return out
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  )
}

/**
 * Faceted groups: options come from products in the archive that match
 * every active filter except the group being built.
 * Attribute options use the same names/order/hex as Attribute Terms in admin.
 */
export function buildFacetedFilterGroups(
  archiveProducts: Product[],
  query: ProductQuery,
  defs: FilterDefinition[],
  termsByAttr: Record<string, CatalogTerm[]> = {},
): FilterGroup[] {
  const groups: FilterGroup[] = []

  for (const def of defs) {
    const qWithout: ProductQuery = {
      ...query,
      sortBy: undefined,
    }

    if (def.kind === 'brand') {
      qWithout.brand = undefined
    } else {
      const nextAttrs = { ...(query.attributes || {}) }
      delete nextAttrs[def.key]
      qWithout.attributes = Object.keys(nextAttrs).length ? nextAttrs : undefined
    }

    const subset = filterProducts(archiveProducts, {
      ...qWithout,
      category: query.category,
      subCategory: query.subCategory,
      search: query.search,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
    })

    if (def.kind === 'brand') {
      const values = uniqueSorted(subset.map((p) => p.brand))
      if (!values.length) continue
      groups.push({
        key: def.key,
        title: def.title,
        kind: def.kind,
        options: values,
        optionValues: values,
      })
      continue
    }

    const present = new Set(subset.flatMap((p) => p.attributeValues?.[def.key] || []))
    if (!present.size) continue

    const catalogTerms = termsByAttr[def.key] || []
    // Prefer admin terms (name + order + hex); append any orphan product values last
    const ordered = catalogTerms.filter((t) => present.has(t.slug))
    const known = new Set(ordered.map((t) => t.slug))
    const orphans = [...present].filter((slug) => !known.has(slug)).sort()

    const entries = [
      ...ordered.map((t) => ({
        label: t.name,
        value: t.slug,
        hex: t.hex ?? null,
      })),
      ...orphans.map((slug) => ({
        label: slug,
        value: slug,
        hex: null as string | null,
      })),
    ]

    if (!entries.length) continue

    groups.push({
      key: def.key,
      title: def.title,
      kind: def.kind,
      attributeType: def.attributeType,
      options: entries.map((e) => e.label),
      optionValues: entries.map((e) => e.value),
      optionHex: entries.map((e) => e.hex),
    })
  }

  return groups
}

export async function resolveStoreFilters(options: {
  allProducts: Product[]
  /** Products in this archive (shop = all, category = category products, …) */
  archiveProducts: Product[]
  searchParams: Record<string, string | string[] | undefined>
  locale?: 'fa' | 'en'
}): Promise<{
  query: ProductQuery
  groups: FilterGroup[]
  products: Product[]
  priceMax: number
  defs: FilterDefinition[]
}> {
  const locale = options.locale ?? 'en'
  const defs = await getFilterDefinitions(locale)
  const query = parseQuery(options.searchParams, defs)

  const attrKeys = defs.filter((d) => d.kind === 'attribute').map((d) => d.key)
  const termsByAttr = await getAttributeTermsBySlug(attrKeys, locale)

  const groups = buildFacetedFilterGroups(
    options.archiveProducts,
    query,
    defs,
    termsByAttr,
  )

  // Filter within the archive (shop = full catalog)
  const products = filterProducts(options.archiveProducts, query)
  const priceMax = Math.max(0, ...options.archiveProducts.map((p) => p.price), 0)

  return { query, groups, products, priceMax, defs }
}

/** @deprecated Use resolveStoreFilters — kept so stale HMR bundles don’t crash. */
export async function getStoreFilterGroups(
  products: Product[],
  locale: 'fa' | 'en' = 'en',
): Promise<FilterGroup[]> {
  const { groups } = await resolveStoreFilters({
    allProducts: products,
    archiveProducts: products,
    searchParams: {},
    locale,
  })
  return groups
}
