"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Bell, Heart, ShoppingCart, TriangleAlert } from "lucide-react";
import { useCart } from "./cart-store";
import { useWishlist } from "./wishlist-store";
import { VariantSelector } from "./variant-selector";
import { StockNotifyModal } from "./stock-notify-modal";
import { useMemo, useState } from "react";
import { getPriceRange, getVariantPrice } from "@/lib/variant-utils";
import { cn } from "@/lib/utils";
import { playSuccessSound } from "@/lib/feedback-sounds";

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

export function ProductCard({ product }: { product: Product }) {
  const { dispatch: wishlistDispatch, isInWishlist } = useWishlist();
  const { dispatch: cartDispatch } = useCart();
  const [isVariantSelectorOpen, setIsVariantSelectorOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const isWishlisted = isInWishlist(product.id);
  const priceRange = useMemo(() => getPriceRange(product), [product]);
  const primaryImage = product.images[0] || "/product images/man.jpg";
  const hoverImage = product.images[1] && product.images[1] !== primaryImage ? product.images[1] : null;

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isWishlisted) {
      wishlistDispatch({ type: "remove", productId: product.id });
    } else {
      wishlistDispatch({ type: "add", product });
      playSuccessSound();
    }
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.colors.length > 0 || product.sizes.length > 0) {
      setIsVariantSelectorOpen(true);
    } else {
      cartDispatch({ type: "add", product, quantity: 1 });
    }
  };

  const handleAddToCartWithVariants = (
    product: Product,
    selectedColor: string,
    selectedSize: string,
  ) => {
    const price = getVariantPrice(
      product,
      selectedColor || undefined,
      selectedSize || undefined,
    );
    cartDispatch({
      type: "add",
      product: {
        ...product,
        price,
        selectedColor: selectedColor || undefined,
        selectedSize: selectedSize || undefined,
      },
      quantity: 1,
    });
  };

  const discountPercentage = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <Card
      className={cn(
        "group overflow-hidden border-border/70 bg-card shadow-none transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:-translate-y-1.5 hover:border-border hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)]",
        "motion-reduce:transform-none motion-reduce:transition-none",
      )}
    >
      <CardContent className="p-0">
        <Link href={`/product/${product.id}`} className="block">
          <div className="relative aspect-[1/1] overflow-hidden bg-muted">
            {/* Primary image */}
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              className={cn(
                "object-cover transition-[transform,opacity,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
                "group-hover:scale-[1.08]",
                hoverImage && "group-hover:opacity-0",
                !product.inStock && "grayscale",
                "motion-reduce:transition-none motion-reduce:group-hover:scale-100",
              )}
              priority={false}
              loading="lazy"
              quality={85}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src =
                  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=600&fit=crop";
              }}
            />

            {/* Secondary image crossfade on hover */}
            {hoverImage ? (
              <Image
                src={hoverImage}
                alt=""
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                aria-hidden
                className={cn(
                  "object-cover opacity-0 transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
                  "group-hover:scale-[1.04] group-hover:opacity-100",
                  !product.inStock && "grayscale",
                  "motion-reduce:transition-none motion-reduce:group-hover:scale-100",
                )}
                priority={false}
                loading="lazy"
                quality={85}
              />
            ) : null}

            {/* Soft bottom veil — frames the quick-add */}
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 via-black/10 to-transparent",
                "opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100",
                "motion-reduce:transition-none",
              )}
            />

            {/* Discount Badge */}
            {discountPercentage && (
              <div className="absolute top-2 left-2 z-10 rounded-md bg-red-600 px-2 py-1 text-xs font-bold text-white shadow-sm transition-transform duration-500 group-hover:scale-105">
                -{discountPercentage}%
              </div>
            )}

            {/* Wishlist Button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute top-2 right-2 z-10 h-8 w-8 border border-border/80 bg-background/90 backdrop-blur-sm",
                "transition-all duration-400 ease-out",
                "hover:bg-accent group-hover:scale-105 group-hover:shadow-sm",
                "motion-reduce:transition-none motion-reduce:group-hover:scale-100",
              )}
              onClick={handleWishlistToggle}
            >
              <Heart
                className={cn(
                  "h-4 w-4 transition-colors",
                  isWishlisted
                    ? "fill-red-500 text-red-500"
                    : "text-muted-foreground hover:text-red-500",
                )}
              />
            </Button>

            {/* In stock: Quick Add slides up on desktop hover */}
            {product.inStock ? (
              <Button
                variant="secondary"
                size="sm"
                className={cn(
                  "absolute bottom-3 left-1/2 z-10 hidden -translate-x-1/2 md:flex",
                  "border border-border/80 bg-background/95 px-3.5 py-1.5 font-medium text-foreground shadow-md backdrop-blur-sm",
                  "translate-y-3 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  "group-hover:translate-y-0 group-hover:opacity-100",
                  "hover:bg-accent cursor-pointer",
                  "motion-reduce:translate-y-0 motion-reduce:transition-none",
                )}
                onClick={handleQuickAdd}
              >
                <ShoppingCart className="mr-1.5 h-4 w-4" />
                Quick Add
              </Button>
            ) : (
              /* OOS morphs to Notify me on desktop hover; mobile stays Out of Stock */
              <Button
                variant="secondary"
                size="sm"
                type="button"
                aria-label="Out of stock — notify me when available"
                className={cn(
                  "absolute bottom-3 left-1/2 z-10 -translate-x-1/2",
                  "border border-border bg-background px-3 py-1.5 font-medium text-muted-foreground",
                  "cursor-default md:cursor-pointer",
                  "transition-[color,background-color,border-color,box-shadow,backdrop-filter] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  "md:group-hover:border-border/80 md:group-hover:bg-background/95 md:group-hover:text-foreground md:group-hover:shadow-md md:group-hover:backdrop-blur-sm",
                  "md:group-hover:hover:bg-accent",
                  "motion-reduce:transition-none",
                )}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (
                    typeof window !== "undefined" &&
                    window.matchMedia("(min-width: 768px)").matches
                  ) {
                    setNotifyOpen(true);
                  }
                }}
              >
                <span className="relative grid grid-cols-1 grid-rows-1 items-center justify-items-center">
                  <span
                    className={cn(
                      "col-start-1 row-start-1 flex items-center whitespace-nowrap",
                      "transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      "md:group-hover:pointer-events-none md:group-hover:scale-95 md:group-hover:opacity-0",
                      "motion-reduce:transition-none",
                    )}
                  >
                    <TriangleAlert className="mr-1 h-4 w-4" />
                    Out of Stock
                  </span>
                  <span
                    className={cn(
                      "col-start-1 row-start-1 flex items-center whitespace-nowrap",
                      "pointer-events-none scale-95 opacity-0",
                      "transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      "md:group-hover:scale-100 md:group-hover:opacity-100",
                      "motion-reduce:transition-none",
                    )}
                    aria-hidden
                  >
                    <Bell className="mr-1.5 h-4 w-4" />
                    Notify me
                  </span>
                </span>
              </Button>
            )}
          </div>
        </Link>

        <div className="space-y-3 p-4">
          <Link href={`/product/${product.id}`} className="group/title block">
            <h3 className="line-clamp-2 text-sm font-medium transition-colors duration-300 group-hover/title:text-foreground/80">
              {product.name}
            </h3>
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              {product.colors.length > 0 && (
                <div className="flex gap-1">
                  {product.colors.slice(0, 3).map((color) => {
                    const hex = product.colorHex?.[color];
                    return (
                      <div
                        key={color}
                        className={cn(
                          "h-3 w-3 rounded-full border border-black/10 transition-transform duration-300 group-hover:scale-110",
                          !hex ? FALLBACK_COLOR_CLASS[color] || "bg-gray-300" : "",
                        )}
                        style={hex ? { backgroundColor: hex } : undefined}
                        title={color}
                      />
                    );
                  })}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {priceRange.min !== priceRange.max
                    ? `$${priceRange.min.toFixed(2)} – $${priceRange.max.toFixed(2)}`
                    : `$${product.price.toFixed(2)}`}
                </span>
                {product.originalPrice && priceRange.min === priceRange.max && (
                  <span className="text-xs text-muted-foreground line-through">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
            {product.inStock ? (
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 flex-shrink-0 border border-border bg-background text-foreground transition-colors hover:bg-accent md:hidden"
                onClick={handleQuickAdd}
              >
                <ShoppingCart className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>

      <VariantSelector
        product={product}
        isOpen={isVariantSelectorOpen}
        onClose={() => setIsVariantSelectorOpen(false)}
        onAddToCart={handleAddToCartWithVariants}
      />

      <StockNotifyModal
        open={notifyOpen}
        onOpenChange={setNotifyOpen}
        productId={product.id}
        productName={product.name}
      />
    </Card>
  );
}
