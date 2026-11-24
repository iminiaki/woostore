"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";
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

interface VariantSelectorProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, selectedColor: string, selectedSize: string) => void;
}

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

export function VariantSelector({ product, isOpen, onClose, onAddToCart }: VariantSelectorProps) {
  const needsColor = product.colors.length > 0;
  const needsSize = product.sizes.length > 0;
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || "");
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || "");

  useEffect(() => {
    if (!isOpen) return;
    setSelectedColor(product.colors[0] || "");
    setSelectedSize(product.sizes[0] || "");
  }, [isOpen, product]);

  const price = useMemo(
    () => getVariantPrice(product, selectedColor || undefined, selectedSize || undefined),
    [product, selectedColor, selectedSize],
  );
  const originalPrice = useMemo(
    () => getVariantOriginalPrice(product, selectedColor || undefined, selectedSize || undefined),
    [product, selectedColor, selectedSize],
  );
  const image = useMemo(
    () => getVariantImages(product, selectedColor || undefined, selectedSize || undefined)[0],
    [product, selectedColor, selectedSize],
  );
  const inStock = useMemo(
    () => isVariantInStock(product, selectedColor || undefined, selectedSize || undefined),
    [product, selectedColor, selectedSize],
  );
  const activeVariant = useMemo(
    () => findVariant(product, selectedColor || undefined, selectedSize || undefined),
    [product, selectedColor, selectedSize],
  );

  const canAddToCart =
    inStock &&
    (!needsColor || Boolean(selectedColor)) &&
    (!needsSize || Boolean(selectedSize));

  const handleAddToCart = () => {
    if (!canAddToCart) return;
    onAddToCart(product, selectedColor, selectedSize);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Options</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex gap-4 items-center">
            <div className="relative h-20 w-20 overflow-hidden rounded-md bg-muted flex-shrink-0">
              <img src={image} alt={product.name} className="h-full w-full object-cover" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{product.name}</h3>
              <p className="text-sm text-muted-foreground capitalize">{product.category}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="font-medium">${price.toFixed(2)}</p>
                {originalPrice != null && originalPrice > price ? (
                  <p className="text-sm text-muted-foreground line-through">
                    ${originalPrice.toFixed(2)}
                  </p>
                ) : null}
              </div>
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
                  const hex = product.colorHex?.[color];
                  const available = isColorAvailable(product, color, selectedSize || undefined);
                  return (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      disabled={!available && selectedColor !== color}
                      className={cn(
                        "relative w-8 h-8 rounded-full border-2 transition-all",
                        !hex && (FALLBACK_COLOR_CLASS[color] || "bg-gray-300"),
                        selectedColor === color
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50",
                        !available && selectedColor !== color && "opacity-40 cursor-not-allowed",
                      )}
                      style={hex ? { backgroundColor: hex } : undefined}
                      title={color}
                      type="button"
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
                        !available &&
                          selectedSize !== size &&
                          "opacity-40 line-through cursor-not-allowed",
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
            <Button onClick={handleAddToCart} disabled={!canAddToCart} className="w-full">
              Add to Cart
            </Button>
          ) : (
            <StockNotifyForm
              productId={product.id}
              productName={product.name}
              variantId={activeVariant?.id}
              color={selectedColor || undefined}
              size={selectedSize || undefined}
              className="border-0 bg-transparent p-0"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
