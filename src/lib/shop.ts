import type { Product, SortOption } from "@/types";

export interface ProductQuery {
  search?: string;
  category?: string;
  subCategory?: string;
  brand?: string[];
  material?: string[];
  color?: string[];
  size?: string[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: SortOption;
}

export function filterProducts(products: Product[], query: ProductQuery): Product[] {
  let result = products.filter((p) => {
    // Search functionality
    if (query.search && query.search.trim()) {
      const searchTerm = query.search.toLowerCase();
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm) ||
        p.brand.toLowerCase().includes(searchTerm) ||
        p.category.toLowerCase().includes(searchTerm) ||
        p.subCategory.toLowerCase().includes(searchTerm) ||
        p.material.toLowerCase().includes(searchTerm);
      
      if (!matchesSearch) return false;
    }
    
    const lower = (s?: string) => (s || "").toLowerCase();
    const lowerArr = (arr?: string[]) => (arr || []).map((s) => s.toLowerCase());
    if (query.category) {
      const cat = lower(query.category);
      const inTags = (p.tags || []).map(lower).includes(cat);
      if (lower(p.category) !== cat && !inTags) return false;
    }
    if (query.subCategory) {
      const sub = lower(query.subCategory);
      const inTags = (p.tags || []).map(lower).includes(sub);
      if (lower(p.subCategory) !== sub && !inTags) return false;
    }
    if (query.brand && query.brand.length) {
      const set = new Set(query.brand.map(lower));
      if (!set.has(lower(p.brand))) return false;
    }
    if (query.material && query.material.length) {
      const set = new Set(query.material.map(lower));
      if (!set.has(lower(p.material))) return false;
    }
    if (query.color && query.color.length) {
      const set = new Set(query.color.map(lower));
      if (!lowerArr(p.colors).some((c) => set.has(c))) return false;
    }
    if (query.size && query.size.length) {
      const set = new Set(query.size.map(lower));
      if (!lowerArr(p.sizes).some((s) => set.has(s))) return false;
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

export function parseQuery(params: Record<string, string | string[] | undefined>): ProductQuery {
  const toArray = (val?: string | string[]): string[] | undefined => {
    if (!val) return undefined;
    return Array.isArray(val) ? val : val.split(",").filter(Boolean);
  };
  const num = (v?: string | string[]) => (Array.isArray(v) ? parseFloat(v[0]!) : v ? parseFloat(v) : undefined);
  return {
    search: typeof params.search === "string" ? params.search : undefined,
    category: typeof params.category === "string" ? params.category : undefined,
    subCategory: typeof params.subCategory === "string" ? params.subCategory : undefined,
    brand: toArray(params.brand),
    material: toArray(params.material),
    color: toArray(params.color),
    size: toArray(params.size),
    minPrice: num(params.minPrice),
    maxPrice: num(params.maxPrice),
    sortBy: (params.sortBy as SortOption) || "newest",
  };
}


