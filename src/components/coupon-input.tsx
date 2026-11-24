"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Check, AlertCircle } from "lucide-react";
import { announceCouponApplied } from "@/components/coupon-confetti";
import { useCart } from "@/components/cart-store";
import { playErrorSound } from "@/lib/feedback-sounds";

interface CouponInputProps {
  subtotal: number;
  email?: string;
  className?: string;
  /** Fired when a coupon is accepted — use to celebrate in the order summary box. */
  onApplied?: () => void;
}

export function CouponInput({
  subtotal,
  email,
  className = "",
  onApplied,
}: CouponInputProps) {
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { state, dispatch } = useCart();

  const validateAndApplyCoupon = async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/store/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          email,
          lines: state.items.map((item) => ({
            productId: item.productId,
            categoryId: undefined,
            quantity: item.quantity,
            unitPrice: item.variantPrice,
            onSale: Boolean(
              item.product.originalPrice && item.product.originalPrice > item.variantPrice,
            ),
          })),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        discountAmount?: number;
        freeShipping?: boolean;
        finalPrice?: number;
        coupon?: {
          id: string;
          code: string;
          type: "percentage" | "fixed" | "free_shipping";
          value: number;
          description?: string;
          maxDiscount?: number;
        };
      };

      if (!res.ok || !data.coupon) {
        playErrorSound();
        setError(data.error || "Invalid coupon code");
        return;
      }

      dispatch({
        type: "applyCoupon",
        coupon: {
          coupon: {
            id: data.coupon.id,
            code: data.coupon.code,
            type: data.coupon.type,
            value: data.coupon.value,
            description: data.coupon.description,
            maxDiscount: data.coupon.maxDiscount,
            freeShipping: data.freeShipping,
            usedCount: 0,
            validFrom: new Date(0),
            validTo: new Date("9999-12-31"),
          },
          discountAmount: data.discountAmount || 0,
          finalPrice: data.finalPrice ?? Math.max(0, subtotal - (data.discountAmount || 0)),
          freeShipping: data.freeShipping,
        },
      });
      setCouponCode("");
      announceCouponApplied();
      onApplied?.();
    } catch {
      playErrorSound();
      setError("Failed to validate coupon");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim() || loading) return;
    void validateAndApplyCoupon(couponCode.trim());
  };

  const handleRemoveCoupon = () => {
    dispatch({ type: "removeCoupon" });
    setError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApplyCoupon();
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {state.appliedCoupon ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Coupon applied: {state.appliedCoupon.coupon.code}
                </p>
                <p className="text-xs text-green-600">
                  {state.appliedCoupon.coupon.description ||
                    (state.appliedCoupon.freeShipping ? "Free shipping" : "Discount applied")}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveCoupon}
              className="h-10 p-1 text-green-600 hover:text-green-800 hover:!bg-green-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              className="flex-1"
              disabled={loading}
            />
            <Button
              onClick={handleApplyCoupon}
              disabled={!couponCode.trim() || loading}
              size="sm"
            >
              {loading ? "…" : "Apply"}
            </Button>
          </div>
          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
