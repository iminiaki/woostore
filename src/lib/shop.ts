import type { FilterDefinition, FilterGroup, Product, SortOption } from "@/types";

const RESERVED_QUERY_KEYS = new Set([
  "search",
  "category",
  "subCategory",
  "brand",
  "clearance",
  "minPrice",
  "maxPrice",
  "sortBy",
]);

export interface ProductQuery {
  search?: string;
  category?: string;
  subCategory?: string;
  brand?: string[];
  /** Dynamic attribute filters keyed by attribute slug */
  attributes?: Record<string, string[]>;
  clearance?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: SortOption;
}

export function filterProducts(products: Product[], query: ProductQuery): Product[] {
  let result = products.filter((p) => {
    if (query.search && query.search.trim()) {
      const searchTerm = query.search.toLowerCase();
      const attrHaystack = Object.values(p.attributeValues || {})
        .flat()
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm) ||
        p.brand.toLowerCase().includes(searchTerm) ||
        p.category.toLowerCase().includes(searchTerm) ||
        p.subCategory.toLowerCase().includes(searchTerm) ||
        p.material.toLowerCase().includes(searchTerm) ||
        attrHaystack.includes(searchTerm);

      if (!matchesSearch) return false;
    }

    if (query.category && p.category !== query.category) return false;
    if (query.subCategory) {
      const subs = query.subCategory.split(",").map((s) => s.trim()).filter(Boolean);
      if (subs.length && !subs.includes(p.subCategory)) return false;
    }
    if (query.brand?.length && !query.brand.includes(p.brand)) return false;
    if (query.clearance && !p.clearance) return false;

    if (query.attributes) {
      for (const [slug, selected] of Object.entries(query.attributes)) {
        if (!selected.length) continue;
        const values = p.attributeValues?.[slug] || [];
        if (!selected.some((v) => values.includes(v))) return false;
      }
    }

    if (typeof query.minPrice === "number" && p.price < query.minPrice) return false;
    if (typeof query.maxPrice === "number" && p.price > query.maxPrice) return false;
    return true;
  });

  switch (query.sortBy) {
    case "price-low-high":
      result = result.sort((a, b) => a.price - b.price);
      break;
    case "price-high-low":
      result = result.sort((a, b) => b.price - a.price);
      break;
    case "top-sells":
      result = result.sort((a, b) => b.reviews - a.reviews);
      break;
    case "newest":
    default:
      result = result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  return result;
}

type ParseGroup = Pick<FilterGroup, "key"> | Pick<FilterDefinition, "key" | "kind">;

export function parseQuery(
  params: Record<string, string | string[] | undefined>,
  filterGroups?: ParseGroup[],
): ProductQuery {
  const toArray = (val?: string | string[]): string[] | undefined => {
    if (!val) return undefined;
    return Array.isArray(val) ? val : val.split(",").filter(Boolean);
  };
  const num = (v?: string | string[]) =>
    Array.isArray(v) ? parseFloat(v[0]!) : v ? parseFloat(v) : undefined;

  const attributeKeys =
    filterGroups
      ?.map((g) => g.key)
      .filter((key) => key !== "brand" && !RESERVED_QUERY_KEYS.has(key)) || [];

  const attributes: Record<string, string[]> = {};

  if (attributeKeys.length) {
    for (const key of attributeKeys) {
      const values = toArray(params[key]);
      if (values?.length) attributes[key] = values;
    }
  } else {
    for (const [key, raw] of Object.entries(params)) {
      if (RESERVED_QUERY_KEYS.has(key)) continue;
      const values = toArray(raw);
      if (values?.length) attributes[key] = values;
    }
  }

  const clearanceRaw = Array.isArray(params.clearance) ? params.clearance[0] : params.clearance;

  return {
    search: typeof params.search === "string" ? params.search : undefined,
    category: typeof params.category === "string" ? params.category : undefined,
    subCategory: typeof params.subCategory === "string" ? params.subCategory : undefined,
    brand: toArray(params.brand),
    attributes: Object.keys(attributes).length ? attributes : undefined,
    clearance: clearanceRaw === "1" || clearanceRaw === "true",
    minPrice: num(params.minPrice),
    maxPrice: num(params.maxPrice),
    sortBy: (params.sortBy as SortOption) || "newest",
  };
}
