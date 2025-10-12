"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/types";
import { getVariantPrice, getVariantOriginalPrice, isVariantInStock } from "@/lib/variant-utils";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ImageModal } from "@/components/image-modal";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-store";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/lib/use-currency";

export function ProductDetail({ product }: { product: Product }) {
  const { format } = useCurrency();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Derive selectable options from product or variations
  const variantAttrMap = (() => {
    const map = new Map<string, Set<string>>();
    if (product.variants && product.variants.length > 0) {
      // We don't have variant attribute names directly; assume color/size based on fields
      product.variants.forEach(v => {
        if (v.color) {
          if (!map.has('color')) map.set('color', new Set());
          map.get('color')!.add(v.color);
        }
        if (v.size) {
          if (!map.has('size')) map.set('size', new Set());
          map.get('size')!.add(v.size);
        }
      });
    }
    return map;
  })();

  const colorOptions = (product.colors && product.colors.length > 0)
    ? product.colors
    : Array.from(variantAttrMap.get('color') || []);
  const sizeOptions = (product.sizes && product.sizes.length > 0)
    ? product.sizes
    : Array.from(variantAttrMap.get('size') || []);

  const [selectedColor, setSelectedColor] = useState(colorOptions[0] || "");
  const [selectedSize, setSelectedSize] = useState(sizeOptions[0] || "");

  const { dispatch: cartDispatch } = useCart();

  const handleAddToCart = () => {
    const productWithVariants = {
      ...product,
      selectedColor,
      selectedSize,
    };
    cartDispatch({ type: "add", product: productWithVariants, quantity: 1 });
  };

  const canAddToCart = isVariantInStock(product, selectedColor, selectedSize);

  const colorMap: Record<string, string> = {
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

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="grid gap-3">
        <div 
          className="relative aspect-[1/1] overflow-hidden rounded-xl bg-muted cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => {
            setSelectedImageIndex(0);
            setIsImageModalOpen(true);
          }}
        >
          <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {product.images.map((src, i) => (
            <div 
              key={i} 
              className="relative aspect-square overflow-hidden rounded-md bg-muted cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => {
                setSelectedImageIndex(i);
                setIsImageModalOpen(true);
              }}
            >
              <Image src={src} alt={product.name} fill className="object-cover" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="text-muted-foreground">{product.brand} • {product.material}</p>
          <div className="flex items-center gap-2 mt-2 text-sm">
            <span className="text-muted-foreground">Category:</span>
            {(() => {
              const decodeSafe = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
              const catSlug = product.category || "";
              const subSlug = product.subCategory || "";
              const catLabel = decodeSafe(catSlug);
              const subLabel = decodeSafe(subSlug);
              const catHref = `/category/${encodeURIComponent(catSlug)}`;
              const subHref = `/category/${encodeURIComponent(catSlug)}/${encodeURIComponent(subSlug)}`;
              return (
                <>
                  <Link 
                    href={catHref}
                    className="text-primary hover:underline capitalize"
                  >
                    {catLabel}
                  </Link>
                  {subSlug && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <Link 
                        href={subHref}
                        className="text-primary hover:underline capitalize"
                      >
                        {subLabel}
                      </Link>
                    </>
                  )}
                </>
              );
            })()}
            {product.subCategory && (
              <>
                <span className="text-muted-foreground">•</span>
                <Link 
                  href={`/category/${product.category}/${product.subCategory}`}
                  className="text-primary hover:underline capitalize"
                >
                  {product.subCategory}
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-semibold">
            {format(getVariantPrice(product, selectedColor, selectedSize))}
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            canAddToCart 
              ? "bg-green-100 text-green-800" 
              : "bg-red-100 text-red-800"
          }`}>
            {canAddToCart ? "In Stock" : "Out of Stock"}
          </div>
        </div>

        {colorOptions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Color: {selectedColor}</span>
              <span className="text-sm text-muted-foreground">{colorOptions.length} options</span>
            </div>
            <div className="flex gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "relative w-8 h-8 rounded-full border-2 transition-all",
                    colorMap[color] || 'bg-gray-300',
                    selectedColor === color 
                      ? "border-primary ring-2 ring-primary/20" 
                      : "border-border hover:border-primary/50"
                  )}
                  title={color}
                >
                  {selectedColor === color && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <svg className="w-2.5 h-2.5 text-primary" fill="#000000" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {sizeOptions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Size: {selectedSize}</span>
              <span className="text-sm text-muted-foreground">{sizeOptions.length} options</span>
            </div>
            <div className="flex gap-2">
              {sizeOptions.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    "px-4 py-2 text-sm border rounded-md transition-all",
                    selectedSize === size
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button 
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          className="w-full"
          size="lg"
        >
          {canAddToCart ? "Add to Cart" : "Select an in-stock variation"}
        </Button>

        <div>
          <h2 className="text-lg font-medium">Description</h2>
          <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: product.description }} />
        </div>
      </div>

      <ImageModal
        images={product.images}
        initialIndex={selectedImageIndex}
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        productName={product.name}
      />
    </div>
  );
}


