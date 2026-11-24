export interface ProductVariant {
  color?: string;
  size?: string;
  sku?: string;
  price: number;
  originalPrice?: number;
  inStock: boolean;
  stock?: number;
  image?: string;
  gallery?: string[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // Base price
  originalPrice?: number; // Base original price
  images: string[];
  category: string;
  categoryName?: string;
  subCategory: string;
  subCategoryName?: string;
  brand: string;
  material: string;
  colors: string[];
  sizes: string[];
  /** All global attribute values keyed by attribute slug (term slugs). */
  attributeValues: Record<string, string[]>;
  /** Hex swatches keyed by color slug */
  colorHex?: Record<string, string>;
  variants?: ProductVariant[]; // Variant-specific pricing / media
  rating: number;
  reviews: number;
  inStock: boolean;
  featured: boolean;
  newArrival: boolean;
  clearance: boolean;
  tags: string[];
  relatedProducts?: Product[];
  crossSells?: Product[];
  createdAt: Date;
  updatedAt: Date;
  selectedColor?: string;
  selectedSize?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  description?: string;
  subCategories: SubCategory[];
}

export interface HeroSlideButton {
  label: string;
  href: string;
}

export interface HeroSlide {
  id: string;
  title: string;
  description: string;
  desktopImage: string;
  mobileImage: string;
  primaryButton: HeroSlideButton;
  secondaryButton?: HeroSlideButton | null;
}

export interface SubCategory {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: {
    name: string;
    avatar: string;
  };
  publishedAt: Date;
  readTime: number;
  image: string;
  tags: string[];
  slug: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  phone?: string;
  address?: Address;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: Address;
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  product: Product;
}

export interface CartItem {
  productId: string;
  quantity: number;
  product: Product;
  variantKey: string; // Unique identifier for product + variants
  variantPrice: number; // Price for this specific variant
}

export type SortOption = 'newest' | 'top-sells' | 'price-low-high' | 'price-high-low';
export type FilterType = string;

export interface FilterDefinition {
  key: string;
  title: string;
  kind: 'brand' | 'attribute';
  /** Attribute UI type from admin (color → swatches). */
  attributeType?: 'select' | 'color' | 'button';
}

export interface FilterOption {
  label: string;
  value: string;
  hex?: string | null;
}

export interface FilterGroup {
  key: string;
  title: string;
  kind?: 'brand' | 'attribute';
  attributeType?: 'select' | 'color' | 'button';
  /** Display labels (same order as optionValues when present). */
  options: string[];
  /** Slugs/values written to the URL; defaults to `options` when omitted. */
  optionValues?: string[];
  /** Parallel hex swatches for color attributes. */
  optionHex?: (string | null)[];
}

export interface FilterState {
  categories: string[];
  subCategories: string[];
  brands: string[];
  attributeFilters: Record<string, string[]>;
  priceRange: [number, number];
  sortBy: SortOption;
}

export interface Coupon {
  id?: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minAmount?: number;
  maxDiscount?: number;
  validFrom?: Date;
  validTo?: Date;
  usageLimit?: number;
  usedCount?: number;
  applicableCategories?: string[];
  applicableProducts?: string[];
  description?: string;
  freeShipping?: boolean;
}

export interface AppliedCoupon {
  coupon: Coupon;
  discountAmount: number;
  finalPrice: number;
  freeShipping?: boolean;
}
