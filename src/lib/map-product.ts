import type { Product, ProductVariant, Category } from '@/types'

type Rel<T> = T | number | string | null | undefined

function unwrap<T extends { id?: string | number }>(value: Rel<T>): T | null {
  if (value == null) return null
  if (typeof value === 'object') return value
  return null
}

function mediaUrl(
  value: Rel<{
    url?: string | null
    thumbnailURL?: string | null
    sizes?: { card?: { url?: string | null }; thumbnail?: { url?: string | null } }
  }>,
): string | null {
  const media = unwrap(value)
  if (!media) return null
  return (
    media.url ||
    media.sizes?.card?.url ||
    media.sizes?.thumbnail?.url ||
    media.thumbnailURL ||
    null
  )
}

function shortSubSlug(parentSlug: string, subSlug: string) {
  const prefix = `${parentSlug}-`
  return subSlug.startsWith(prefix) ? subSlug.slice(prefix.length) : subSlug
}

function attrSlug(value: Rel<{ slug?: string }>): string | null {
  return unwrap(value)?.slug || null
}

export function mapPayloadProduct(
  doc: Record<string, unknown>,
  options?: { shallow?: boolean },
): Product {
  const category = unwrap(
    doc.category as Rel<{ id?: string | number; slug?: string; name?: string }>,
  )
  const subCategory = unwrap(
    doc.subCategory as Rel<{
      id?: string | number
      slug?: string
      name?: string
      parent?: Rel<{ id?: string | number; slug?: string }>
    }>,
  )
  const brand = unwrap(doc.brand as Rel<{ name?: string }>)
  const prices = (doc.prices || {}) as { usd?: number; irt?: number }
  const compare = (doc.compareAtPrices || {}) as { usd?: number; irt?: number }

  const images = (Array.isArray(doc.images) ? doc.images : [])
    .map((img) => mediaUrl(img as Rel<{ url?: string | null }>))
    .filter(Boolean) as string[]

  const attributes = Array.isArray(doc.attributes) ? doc.attributes : []
  const attributeValues: Record<string, string[]> = {}
  const colorHex: Record<string, string> = {}

  for (const row of attributes as Record<string, unknown>[]) {
    const slug = attrSlug(row.attribute as Rel<{ slug?: string }>)
    if (!slug) continue
    const terms = Array.isArray(row.terms) ? row.terms : []
    for (const rawTerm of terms) {
      const term = unwrap(
        rawTerm as Rel<{ slug?: string; name?: string; hex?: string | null }>,
      )
      if (!term) continue
      const termSlug = term.slug || term.name || ''
      if (!termSlug) continue
      if (!attributeValues[slug]) attributeValues[slug] = []
      if (!attributeValues[slug].includes(termSlug)) attributeValues[slug].push(termSlug)
      if (slug === 'color' && term.hex) colorHex[termSlug] = term.hex
    }
  }

  const colors = attributeValues.color || []
  const sizes = attributeValues.size || []
  const material = attributeValues.material?.[0] || ''

  const parentSlug = category?.slug || ''
  const parentName = category?.name || parentSlug
  const rawSubSlug = subCategory?.slug || ''
  const subParent = unwrap(subCategory?.parent as Rel<{ id?: string | number; slug?: string }>)
  const subBelongsToCategory =
    !subCategory ||
    !category ||
    (subParent
      ? String(subParent.id) === String(category.id) || subParent.slug === parentSlug
      : rawSubSlug.startsWith(`${parentSlug}-`))
  const subParentSlug = subParent?.slug || parentSlug
  const subSlug =
    rawSubSlug && subBelongsToCategory
      ? shortSubSlug(subParentSlug || parentSlug || 'x', rawSubSlug)
      : ''
  const subName = subBelongsToCategory ? subCategory?.name || subSlug : ''

  const variants: ProductVariant[] = []
  for (const row of (Array.isArray(doc.variants) ? doc.variants : []) as Record<
    string,
    unknown
  >[]) {
    const values = Array.isArray(row.attributeValues) ? row.attributeValues : []
    let color: string | undefined
    let size: string | undefined
    for (const av of values as Record<string, unknown>[]) {
      const aSlug = attrSlug(av.attribute as Rel<{ slug?: string }>)
      const term = unwrap(
        av.term as Rel<{ slug?: string; name?: string; hex?: string | null }>,
      )
      const termSlug = term?.slug || term?.name
      if (aSlug === 'color' && termSlug) {
        color = termSlug
        if (term?.hex) colorHex[termSlug] = term.hex
      }
      if (aSlug === 'size' && termSlug) size = termSlug
    }
    const vPrices = (row.prices || {}) as { usd?: number }
    const vCompare = (row.compareAtPrices || {}) as { usd?: number }
    const image = mediaUrl(row.image as Rel<{ url?: string | null }>) || undefined
    const gallery = (Array.isArray(row.gallery) ? row.gallery : [])
      .map((img) => mediaUrl(img as Rel<{ url?: string | null }>))
      .filter(Boolean) as string[]

    variants.push({
      color,
      size,
      sku: typeof row.sku === 'string' ? row.sku : undefined,
      price: Number(vPrices.usd ?? prices.usd ?? 0),
      originalPrice: vCompare.usd != null ? Number(vCompare.usd) : undefined,
      inStock: Boolean(row.inStock),
      stock: typeof row.stock === 'number' ? row.stock : undefined,
      image,
      gallery,
    })
  }

  const mapLinked = (raw: unknown): Product[] => {
    if (options?.shallow || !Array.isArray(raw)) return []
    return raw
      .map((item) => unwrap(item as Rel<Record<string, unknown>>))
      .filter(Boolean)
      .map((linked) => mapPayloadProduct(linked as Record<string, unknown>, { shallow: true }))
  }

  return {
    id: String(doc.id),
    name: String(doc.title || ''),
    description: String(doc.description || ''),
    price: Number(prices.usd ?? 0),
    originalPrice: compare.usd != null ? Number(compare.usd) : undefined,
    images: images.length ? images : ['/product images/man.jpg'],
    category: parentSlug,
    categoryName: parentName,
    subCategory: subSlug,
    subCategoryName: subName,
    brand: brand?.name || '',
    material,
    colors: [...new Set(colors)],
    sizes: [...new Set(sizes)],
    attributeValues,
    colorHex,
    variants: variants.length ? variants : undefined,
    rating: Number(doc.rating ?? 0),
    reviews: Number(doc.reviewCount ?? 0),
    inStock: Boolean(doc.inStock),
    featured: Boolean(doc.featured),
    newArrival: Boolean(doc.newArrival),
    clearance: Boolean(doc.clearance),
    tags: Array.isArray(doc.tags) ? (doc.tags as string[]) : [],
    relatedProducts: mapLinked(doc.relatedProducts),
    crossSells: mapLinked(doc.crossSells),
    createdAt: new Date(String(doc.createdAt || Date.now())),
    updatedAt: new Date(String(doc.updatedAt || Date.now())),
  }
}

export function mapPayloadCategories(
  docs: Record<string, unknown>[],
): Category[] {
  const parents = docs.filter((d) => !d.parent)
  const children = docs.filter((d) => d.parent)

  return parents.map((parent) => {
    const parentId = parent.id
    const image = mediaUrl(parent.image as Rel<{ url?: string | null }>)
    const subs = children
      .filter((child) => {
        const p = child.parent
        const pid = typeof p === 'object' && p ? (p as { id?: unknown }).id : p
        return String(pid) === String(parentId)
      })
      .map((child) => ({
        id: String(child.id),
        name: String(child.name || ''),
        slug: shortSubSlug(String(parent.slug || ''), String(child.slug || '')),
        categoryId: String(parentId),
      }))

    const description = String(parent.description || '').trim()

    return {
      id: String(parentId),
      name: String(parent.name || ''),
      slug: String(parent.slug || ''),
      image: image || '/product images/man.jpg',
      ...(description ? { description } : {}),
      subCategories: subs,
    }
  })
}
