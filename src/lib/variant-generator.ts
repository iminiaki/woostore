export type VariationAttr = {
  attributeId: string | number
  termIds: (string | number)[]
}

export type GeneratedVariant = {
  attributeValues: { attribute: string | number; term: string | number }[]
  sku: string
  prices: { usd: number; irt: number }
  compareAtPrices?: { usd?: number; irt?: number }
  stock: number
  inStock: boolean
  allowBackorder: boolean
}

export function cartesianProduct<T>(lists: T[][]): T[][] {
  if (!lists.length) return []
  return lists.reduce<T[][]>(
    (acc, list) => acc.flatMap((prefix) => list.map((item) => [...prefix, item])),
    [[]],
  )
}

export function variantKey(
  attributeValues: { attribute: string | number; term: string | number }[],
): string {
  return attributeValues
    .map((av) => `${String(av.attribute)}:${String(av.term)}`)
    .sort()
    .join('|')
}

export function buildVariantsFromAttributes(args: {
  attrs: VariationAttr[]
  termSlugById: Map<string, string>
  baseSku?: string | null
  prices?: { usd?: number; irt?: number } | null
  compareAtPrices?: { usd?: number; irt?: number } | null
}): GeneratedVariant[] {
  const { attrs, termSlugById, baseSku, prices, compareAtPrices } = args
  if (!attrs.length) return []

  const termLists = attrs.map((a) =>
    a.termIds.map((termId) => ({
      attribute: a.attributeId,
      term: termId,
    })),
  )

  const combos = cartesianProduct(termLists)
  const skuBase = (baseSku || 'PROD').toString().trim() || 'PROD'

  return combos.map((combo) => {
    const slugParts = combo.map((c) => {
      const slug = termSlugById.get(String(c.term))
      return (slug || String(c.term)).replace(/\s+/g, '-').toUpperCase()
    })

    return {
      attributeValues: combo,
      sku: `${skuBase}-${slugParts.join('-')}`.toUpperCase(),
      prices: {
        usd: Number(prices?.usd ?? 0),
        irt: Number(prices?.irt ?? 0),
      },
      compareAtPrices:
        compareAtPrices?.usd != null || compareAtPrices?.irt != null
          ? {
              usd: compareAtPrices?.usd,
              irt: compareAtPrices?.irt,
            }
          : undefined,
      stock: 0,
      inStock: true,
      allowBackorder: false,
    }
  })
}

export function fieldState(value: unknown) {
  return {
    initialValue: value,
    valid: true as const,
    value,
  }
}
