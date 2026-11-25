"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ImageModal } from "@/components/image-modal";
import { PageShell } from "@/components/page-shell";
import { ProductCardCarousel } from "@/components/product-card-carousel";
import { ProductImageStrip } from "@/components/product-image-strip";
import { ProductRatingLink, ProductReviews } from "@/components/product-reviews";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-store";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  findVariant,
  getVariantImages,
  getVariantOriginalPrice,
  getVariantPrice,
  isColorAvailable,
  isSizeAvailable,
  isVariantInStock,
} from "@/lib/variant-utils";
import { StockNotifyForm } from "@/components/stock-notify-form";

const FALLBACK_COLOR_CLASS: Record<string, string> = {
  black: "bg-black border border-black",
  white: "bg-white border border-gray-300",
  navy: "bg-blue-900",
  beige: "bg-amber-100",
  blue: "bg-blue-500",
  red: "bg-red-500",
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  purple: "bg-purple-500",
  pink: "bg-pink-400",
  gray: "bg-gray-500",
  brown: "bg-amber-700",
};

function ColorSwatch({
  color,
  hex,
  selected,
  disabled,
  onSelect,
}: {
  color: string;
  hex?: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      key={color}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "relative w-8 h-8 rounded-full border-2 transition-all",
        !hex && (FALLBACK_COLOR_CLASS[color] || "bg-gray-300"),
        selected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50",
        disabled && "opacity-40 cursor-not-allowed",
      )}
      style={hex ? { backgroundColor: hex } : undefined}
      title={color}
      type="button"
    >
      {selected && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
            <svg className="w-2.5 h-2.5 text-primary" fill="#000000" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      )}
    </button>
  );
}

export function ProductDetail({ product }: { product: Product }) {
  const needsColor = product.colors.length > 0;
  const needsSize = product.sizes.length > 0;

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || "");
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || "");
  const { dispatch: cartDispatch } = useCart();

  const activeVariant = useMemo(
    () => findVariant(product, selectedColor || undefined, selectedSize || undefined),
    [product, selectedColor, selectedSize],
  );

  const displayImages = useMemo(
    () => getVariantImages(product, selectedColor || undefined, selectedSize || undefined),
    [product, selectedColor, selectedSize],
  );

  const displayPrice = useMemo(
    () => getVariantPrice(product, selectedColor || undefined, selectedSize || undefined),
    [product, selectedColor, selectedSize],
  );

  const displayOriginalPrice = useMemo(
    () => getVariantOriginalPrice(product, selectedColor || undefined, selectedSize || undefined),
    [product, selectedColor, selectedSize],
  );

  const inStock = useMemo(
    () => isVariantInStock(product, selectedColor || undefined, selectedSize || undefined),
    [product, selectedColor, selectedSize],
  );

  // When color/size selection changes, reset gallery index and keep a valid combo
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedColor, selectedSize, displayImages[0]]);

  useEffect(() => {
    if (!needsSize || !selectedSize) return;
    if (!isSizeAvailable(product, selectedSize, selectedColor || undefined)) {
      const next = product.sizes.find((size) =>
        isSizeAvailable(product, size, selectedColor || undefined),
      );
      if (next) setSelectedSize(next);
    }
  }, [needsSize, product, selectedColor, selectedSize]);

  const canAddToCart =
    inStock &&
    (!needsColor || Boolean(selectedColor)) &&
    (!needsSize || Boolean(selectedSize)) &&
    (!product.variants?.length || Boolean(activeVariant));

  const discountPercentage =
    displayOriginalPrice && displayOriginalPrice > displayPrice
      ? Math.round(((displayOriginalPrice - displayPrice) / displayOriginalPrice) * 100)
      : null;

  const handleAddToCart = () => {
    cartDispatch({
      type: "add",
      product: {
        ...product,
        price: displayPrice,
        originalPrice: displayOriginalPrice,
        images: displayImages,
        selectedColor: selectedColor || undefined,
        selectedSize: selectedSize || undefined,
      },
      quantity: 1,
    });
  };

  return (
    <PageShell>
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: "Shop", href: "/shop" },
            { label: product.category, href: `/category/${product.category}` },
            { label: product.name },
          ]}
        />
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="grid gap-3">
          <div
            className="relative aspect-[1/1] overflow-hidden rounded-xl bg-muted cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => {
              setSelectedImageIndex(0);
              setIsImageModalOpen(true);
            }}
          >
            <Image
              src={displayImages[selectedImageIndex] || displayImages[0]}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              key={displayImages[selectedImageIndex] || displayImages[0]}
            />
          </div>
          <ProductImageStrip
            images={displayImages}
            alt={product.name}
            selected={selectedImageIndex}
            onSelect={setSelectedImageIndex}
          />
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <ProductRatingLink rating={product.rating} count={product.reviews} />
            <p className="text-muted-foreground">
              {[product.brand, product.material].filter(Boolean).join(" • ")}
            </p>
            {activeVariant?.sku ? (
              <p className="text-xs text-muted-foreground mt-1">SKU: {activeVariant.sku}</p>
            ) : null}

            <div className="flex items-center gap-2 mt-2 text-sm">
              <span className="text-muted-foreground">Category:</span>
              <Link
                href={`/category/${product.category}`}
                className="text-primary hover:underline"
              >
                {product.categoryName || product.category}
              </Link>
              {product.subCategory && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <Link
                    href={`/category/${product.category}/${product.subCategory}`}
                    className="text-primary hover:underline"
                  >
                    {product.subCategoryName || product.subCategory}
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-baseline gap-3">
              <div className="text-2xl font-semibold">${displayPrice.toFixed(2)}</div>
              {displayOriginalPrice != null && displayOriginalPrice > displayPrice ? (
                <>
                  <div className="text-muted-foreground line-through">
                    ${displayOriginalPrice.toFixed(2)}
                  </div>
                  {discountPercentage ? (
                    <span className="text-xs font-medium text-red-600">-{discountPercentage}%</span>
                  ) : null}
                </>
              ) : null}
            </div>
            <div
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                inStock ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {inStock ? "In Stock" : "Out of Stock"}
            </div>
          </div>

          {needsColor && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">Color: {selectedColor}</span>
                <span className="text-sm text-muted-foreground">{product.colors.length} options</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {product.colors.map((color) => {
                  const available = isColorAvailable(product, color, selectedSize || undefined);
                  return (
                    <ColorSwatch
                      key={color}
                      color={color}
                      hex={product.colorHex?.[color]}
                      selected={selectedColor === color}
                      disabled={!available && selectedColor !== color}
                      onSelect={() => setSelectedColor(color)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {needsSize && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Size: {selectedSize}</span>
                <span className="text-sm text-muted-foreground">{product.sizes.length} options</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {product.sizes.map((size) => {
                  const available = isSizeAvailable(product, size, selectedColor || undefined);
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      disabled={!available && selectedSize !== size}
                      className={cn(
                        "px-4 py-2 text-sm border rounded-md transition-all",
                        selectedSize === size
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent",
                        !available && selectedSize !== size && "opacity-40 line-through cursor-not-allowed",
                      )}
                      type="button"
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {inStock ? (
            <Button onClick={handleAddToCart} disabled={!canAddToCart} className="w-full" size="lg">
              Add to Cart
            </Button>
          ) : (
            <StockNotifyForm
              productId={product.id}
              productName={product.name}
              variantId={activeVariant?.id}
              color={selectedColor || undefined}
              size={selectedSize || undefined}
            />
          )}

          <div>
            <h2 className="text-lg font-medium">Description</h2>
            <p className="text-muted-foreground">{product.description}</p>
          </div>
        </div>
      </div>

      <ProductReviews productId={product.id} />

      <ImageModal
        images={displayImages}
        initialIndex={selectedImageIndex}
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        productName={product.name}
      />

      <ProductCardCarousel
        title="Related products"
        products={product.relatedProducts || []}
      />
      <ProductCardCarousel
        title="Often bought with"
        products={product.crossSells || []}
      />
    </PageShell>
  );
}
