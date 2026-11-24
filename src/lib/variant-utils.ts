import type { Product, ProductVariant } from "@/types";

function norm(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

/**
 * Resolve the best matching variant for the current selection.
 * Works for color-only, size-only, or color+size products.
 */
export function findVariant(
  product: Product,
  selectedColor?: string,
  selectedSize?: string,
): ProductVariant | undefined {
  if (!product.variants?.length) return undefined;

  const color = norm(selectedColor);
  const size = norm(selectedSize);
  const needsColor = product.colors.length > 0;
  const needsSize = product.sizes.length > 0;

  const exact = product.variants.find((v) => {
    const vc = norm(v.color);
    const vs = norm(v.size);
    const colorOk = !needsColor || (color ? vc === color : true);
    const sizeOk = !needsSize || (size ? vs === size : true);
    if (needsColor && needsSize) {
      return color && size ? vc === color && vs === size : false;
    }
    if (needsColor && !needsSize) return color ? vc === color : false;
    if (needsSize && !needsColor) return size ? vs === size : false;
    return colorOk && sizeOk;
  });
  if (exact) return exact;

  if (color) {
    const byColor = product.variants.find((v) => norm(v.color) === color);
    if (byColor) return byColor;
  }
  if (size) {
    const bySize = product.variants.find((v) => norm(v.size) === size);
    if (bySize) return bySize;
  }

  return undefined;
}

export function getVariantPrice(
  product: Product,
  selectedColor?: string,
  selectedSize?: string,
): number {
  return findVariant(product, selectedColor, selectedSize)?.price ?? product.price;
}

export function getVariantOriginalPrice(
  product: Product,
  selectedColor?: string,
  selectedSize?: string,
): number | undefined {
  const variant = findVariant(product, selectedColor, selectedSize);
  if (variant) return variant.originalPrice;
  return product.originalPrice;
}

export function isVariantInStock(
  product: Product,
  selectedColor?: string,
  selectedSize?: string,
): boolean {
  const variant = findVariant(product, selectedColor, selectedSize);
  if (variant) return variant.inStock;
  return product.inStock;
}

export function getVariantImages(
  product: Product,
  selectedColor?: string,
  selectedSize?: string,
): string[] {
  const variant = findVariant(product, selectedColor, selectedSize);
  const images: string[] = [];
  if (variant?.image) images.push(variant.image);
  if (variant?.gallery?.length) images.push(...variant.gallery);
  if (!images.length) images.push(...product.images);
  return [...new Set(images.filter(Boolean))];
}

export function getAvailableVariants(product: Product): ProductVariant[] {
  return product.variants || [];
}

export function getPriceRange(product: Product): { min: number; max: number } {
  if (!product.variants || product.variants.length === 0) {
    return { min: product.price, max: product.price };
  }
  const prices = product.variants.map((v) => v.price);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

/** Whether a color has at least one in-stock variant (optionally constrained by size). */
export function isColorAvailable(product: Product, color: string, selectedSize?: string) {
  if (!product.variants?.length) return product.inStock;
  const size = norm(selectedSize);
  return product.variants.some((v) => {
    if (norm(v.color) !== norm(color)) return false;
    if (product.sizes.length && size && norm(v.size) !== size) return false;
    return v.inStock;
  });
}

/** Whether a size has at least one in-stock variant (optionally constrained by color). */
export function isSizeAvailable(product: Product, size: string, selectedColor?: string) {
  if (!product.variants?.length) return product.inStock;
  const color = norm(selectedColor);
  return product.variants.some((v) => {
    if (norm(v.size) !== norm(size)) return false;
    if (product.colors.length && color && norm(v.color) !== color) return false;
    return v.inStock;
  });
}
