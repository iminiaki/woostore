"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Check, AlertCircle } from "lucide-react";
import { useCart } from "@/components/cart-store";
import type { Coupon } from "@/types";

interface CouponInputProps {
  subtotal: number;
  className?: string;
}

async function getWooCoupon(code: string) {
  const res = await fetch(`/api/woo/coupons?code=${encodeURIComponent(code)}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json() as Promise<{ code: string; discount_type: string; amount: string; minimum_amount?: string; date_expires?: string | null } | null>;
}

export function CouponInput({ subtotal, className = "" }: CouponInputProps) {
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { state, dispatch } = useCart();

  const validateAndApplyCoupon = async (code: string) => {
    const woo = await getWooCoupon(code);
    if (!woo) {
      setError("Invalid coupon code");
      return;
    }
    const minAmount = woo.minimum_amount ? parseFloat(woo.minimum_amount) : undefined;
    if (minAmount && subtotal < minAmount) {
      setError(`Minimum order amount of $${minAmount} required`);
      return;
    }
    let discountAmount = 0;
    if (woo.discount_type.includes("percent")) {
      const pct = parseFloat(woo.amount || "0");
      discountAmount = (subtotal * pct) / 100;
    } else {
      discountAmount = parseFloat(woo.amount || "0");
    }
    const finalPrice = subtotal - discountAmount;
    const localCoupon: Coupon = {
      code: woo.code.toUpperCase(),
      type: woo.discount_type.includes("percent") ? "percentage" : "fixed",
      value: parseFloat(woo.amount || "0"),
      validFrom: new Date(0),
      validTo: new Date("2999-12-31"),
      usedCount: 0,
      minAmount,
    };
    dispatch({ 
      type: "applyCoupon", 
      coupon: { coupon: localCoupon, discountAmount, finalPrice }
    });
    setError(null);
    setCouponCode("");
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    await validateAndApplyCoupon(couponCode.trim());
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
                  {state.appliedCoupon.coupon.description}
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
            />
            <Button
              onClick={handleApplyCoupon}
              disabled={!couponCode.trim()}
              size="sm"
            >
              Apply
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
