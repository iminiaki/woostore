import type { Product, Category } from "@/types";

export interface WooEnv {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export function getWooEnv(): WooEnv {
  const baseUrl = process.env.NEXT_PUBLIC_WP_BASE_URL || "";
  const consumerKey = process.env.WC_CONSUMER_KEY || "";
  const consumerSecret = process.env.WC_CONSUMER_SECRET || "";
  if (!baseUrl || !consumerKey || !consumerSecret) {
    throw new Error("WooCommerce environment variables are not set");
  }
  return { baseUrl, consumerKey, consumerSecret };
}

async function wooFetch<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const { baseUrl, consumerKey, consumerSecret } = getWooEnv();
  const usp = new URLSearchParams();
  usp.set("consumer_key", consumerKey);
  usp.set("consumer_secret", consumerSecret);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) usp.set(k, String(v));
    });
  }
  const url = `${baseUrl.replace(/\/$/, "")}/wp-json/wc/v3/${path}?${usp.toString()}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Woo request failed: ${res.status} ${res.statusText} ${body}`);
  }
  return res.json();
}

async function wooPost<T>(path: string, body: unknown): Promise<T> {
  const { baseUrl, consumerKey, consumerSecret } = getWooEnv();
  const usp = new URLSearchParams();
  usp.set("consumer_key", consumerKey);
  usp.set("consumer_secret", consumerSecret);
  const url = `${baseUrl.replace(/\/$/, "")}/wp-json/wc/v3/${path}?${usp.toString()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Woo POST failed: ${res.status} ${res.statusText} ${err}`);
  }
  return res.json();
}

// Raw Woo types (partial)
interface WooImage { src: string; alt?: string; };
interface WooCategory { id: number; name: string; slug: string; image?: { src: string } | null; parent?: number };
interface WooProduct {
  id: number;
  name: string;
  permalink: string;
  description: string;
  short_description?: string;
  price: string;
  regular_price: string;
  images: WooImage[];
  categories: WooCategory[];
  attributes?: { name: string; options: string[]; slug?: string }[];
  stock_status?: "instock" | "outofstock" | "onbackorder";
  average_rating?: string;
  rating_count?: number;
  date_created?: string;
  date_modified?: string;
  variations?: number[];
}

interface WooVariation {
  id: number;
  price: string;
  regular_price: string;
  attributes: { name: string; option: string }[];
  stock_status?: "instock" | "outofstock" | "onbackorder";
}

function toLocalCategory(woo: WooCategory): Category {
  return {
    id: String(woo.id),
    name: woo.name,
    slug: woo.slug,
    image: woo.image?.src || "",
    subCategories: [],
  };
}

function matchAttr(woo: WooProduct, keys: string[]): string[] | undefined {
  const found = woo.attributes?.find(a => {
    const n = (a.slug || a.name || '').toLowerCase();
    return keys.some(k => n.includes(k));
  });
  return found?.options;
}

function toLocalProduct(woo: WooProduct): Product {
  const colors = matchAttr(woo, ["color", "pa_color"]) || [];
  const sizes = matchAttr(woo, ["size", "pa_size"]) || [];
  const brand = matchAttr(woo, ["brand", "pa_brand"])?.[0] || "";
  const material = matchAttr(woo, ["material", "fabric", "pa_material"])?.[0] || "";
  const primaryCategory = woo.categories?.[0];
  return {
    id: String(woo.id),
    name: woo.name,
    description: woo.short_description || woo.description || "",
    price: Number(woo.price || woo.regular_price || 0),
    originalPrice: woo.regular_price ? Number(woo.regular_price) : undefined,
    images: (woo.images || []).map(i => i.src),
    category: primaryCategory?.slug || "",
    subCategory: "",
    brand,
    material,
    colors,
    sizes,
    variants: undefined,
    rating: Number(woo.average_rating || 0),
    reviews: woo.rating_count || 0,
    inStock: woo.stock_status !== "outofstock",
    featured: false,
    newArrival: false,
    clearance: false,
    tags: woo.categories?.map(c => c.slug) || [],
    createdAt: woo.date_created ? new Date(woo.date_created) : new Date(),
    updatedAt: woo.date_modified ? new Date(woo.date_modified) : new Date(),
  };
}

export async function fetchWooProducts(params?: { search?: string; per_page?: number; page?: number; categoryId?: number }): Promise<Product[]> {
  const qp: Record<string, string | number | boolean | undefined> = {
    search: params?.search,
    per_page: params?.per_page ?? 24,
    page: params?.page ?? 1,
    status: "publish",
  };
  if (params?.categoryId) qp.category = params.categoryId;
  const result = await wooFetch<WooProduct[]>("products", qp);
  return result.map(toLocalProduct);
}

export async function fetchWooProduct(id: string | number): Promise<Product | null> {
  const woo = await wooFetch<WooProduct>(`products/${id}`);
  if (!woo) return null;
  let product = toLocalProduct(woo);
  if (Array.isArray(woo.variations) && woo.variations.length > 0) {
    const vars = await Promise.all(woo.variations.slice(0, 50).map(vid => wooFetch<WooVariation>(`products/${woo.id}/variations/${vid}`)));
    // Determine attribute dimensions present across variations
    const allAttrNames = Array.from(new Set(vars.flatMap(v => v.attributes.map(a => (a.name || '').toString())))).filter(Boolean);
    const pickBy = (candidates: string[]): string | undefined => allAttrNames.find(n => candidates.some(c => n.toLowerCase().includes(c)));
    const primaryName = pickBy(['color', 'colour', 'pa_color']) || allAttrNames[0];
    const secondaryName = pickBy(['size', 'pa_size']) || (allAttrNames[1] && allAttrNames[1] !== primaryName ? allAttrNames[1] : undefined);
    const colorSet = new Set<string>();
    const sizeSet = new Set<string>();
    product.variants = vars.map(v => {
      const findOpt = (name?: string) => name ? v.attributes.find(a => (a.name || '').toString() === name)?.option : undefined;
      const color = findOpt(primaryName);
      const size = findOpt(secondaryName);
      if (color) colorSet.add(color);
      if (size) sizeSet.add(size);
      return {
        color,
        size,
        price: Number(v.price || v.regular_price || product.price),
        originalPrice: v.regular_price ? Number(v.regular_price) : undefined,
        inStock: v.stock_status !== 'outofstock',
      };
    });
    // If base product has no colors/sizes, derive from variations
    if ((!product.colors || product.colors.length === 0) && colorSet.size > 0) {
      product.colors = Array.from(colorSet);
    }
    if ((!product.sizes || product.sizes.length === 0) && sizeSet.size > 0) {
      product.sizes = Array.from(sizeSet);
    }
  }
  return product;
}

export async function fetchWooCategories(): Promise<Category[]> {
  const result = await wooFetch<WooCategory[]>("products/categories", { per_page: 100 });
  const top = result.filter(c => !c.parent || c.parent === 0);
  return top.map(c => ({
    ...toLocalCategory(c),
    subCategories: result.filter(sc => sc.parent === c.id).map(sc => ({ id: String(sc.id), name: sc.name, slug: sc.slug, categoryId: String(c.id) }))
  }));
}

// Orders and coupons
interface WooOrderLineItem { product_id: number; quantity: number }
interface WooAddress { first_name?: string; last_name?: string; address_1?: string; city?: string; state?: string; postcode?: string; country?: string; email?: string; phone?: string }
interface WooOrder {
  id: number;
  status: string;
  total: string;
  line_items: Array<{ name: string; product_id?: number; quantity: number; total: string }>;
  billing?: WooAddress;
  shipping?: WooAddress;
  date_created?: string;
}

export async function createWooOrder(input: { line_items: WooOrderLineItem[]; billing?: WooAddress; shipping?: WooAddress; coupon_lines?: { code: string }[]; shipping_total?: string }): Promise<WooOrder> {
  return wooPost<WooOrder>("orders", input);
}

export async function fetchWooOrders(params?: { per_page?: number; search?: string }): Promise<WooOrder[]> {
  return wooFetch<WooOrder[]>("orders", { per_page: params?.per_page ?? 20, search: params?.search });
}

interface WooCoupon { id: number; code: string; discount_type: string; amount: string; date_expires?: string | null; minimum_amount?: string }
export async function fetchWooCouponByCode(code: string): Promise<WooCoupon | null> {
  const list = await wooFetch<WooCoupon[]>("coupons", { code });
  return list[0] || null;
}

// Attributes for filters
interface WooAttribute { id: number; name: string; slug: string }
interface WooAttributeTerm { id: number; name: string; slug: string }

export async function fetchWooAttributes(): Promise<WooAttribute[]> {
  return wooFetch<WooAttribute[]>("products/attributes", { per_page: 100 });
}

export async function fetchWooAttributeTerms(attributeId: number): Promise<WooAttributeTerm[]> {
  return wooFetch<WooAttributeTerm[]>(`products/attributes/${attributeId}/terms`, { per_page: 100 });
}

export async function fetchWooFilterOptions(): Promise<{ brands: string[]; materials: string[]; colors: string[]; sizes: string[] }> {
  const attrs = await fetchWooAttributes();
  const findAttrId = (...candidates: string[]) => attrs.find(a => {
    const n = (a.slug || a.name).toLowerCase();
    return candidates.some(c => n.includes(c));
  })?.id;
  const [brandId, materialId, colorId, sizeId] = [
    findAttrId('brand', 'pa_brand'),
    findAttrId('material', 'fabric', 'pa_material'),
    findAttrId('color', 'pa_color'),
    findAttrId('size', 'pa_size'),
  ];
  const [brands, materials, colors, sizes] = await Promise.all([
    brandId ? fetchWooAttributeTerms(brandId).then(ts => ts.map(t => t.name)) : Promise.resolve<string[]>([]),
    materialId ? fetchWooAttributeTerms(materialId).then(ts => ts.map(t => t.name)) : Promise.resolve<string[]>([]),
    colorId ? fetchWooAttributeTerms(colorId).then(ts => ts.map(t => t.name)) : Promise.resolve<string[]>([]),
    sizeId ? fetchWooAttributeTerms(sizeId).then(ts => ts.map(t => t.name)) : Promise.resolve<string[]>([]),
  ]);
  return { brands, materials, colors, sizes };
}


