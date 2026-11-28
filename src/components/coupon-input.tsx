"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Check, AlertCircle } from "lucide-react";
import { announceCouponApplied } from "@/components/coupon-confetti";
import { useCart } from "@/components/cart-store";
import { useI18n } from "@/components/locale-provider";
import { LogoTraceLoader } from "@/components/LogoTraceLoader";
import { playErrorSound } from "@/lib/feedback-sounds";
import { formatStoreAmount, usesTomanMark } from "@/i18n/languages";

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
  const { t, payloadLocale, active } = useI18n();
  const currency = state.items.find((item) => item.currency)?.currency || active.currency;

  const limitAmount = (amount: number) => {
    const formatted = formatStoreAmount(amount, currency, active.code);
    return usesTomanMark(currency, active.code) ? `${formatted} ${t("coupon.toman")}` : formatted;
  };

  const couponError = (message?: string, code?: string, amount?: number) => {
    if ((code === "minimum" || code === "maximum") && amount != null) {
      return t(`coupon.${code}`, { amount: limitAmount(amount) });
    }
    switch (code) {
      case "inactive":
      case "notStarted":
      case "expired":
      case "usageLimit":
      case "userLimit":
      case "email":
      case "noEligible":
      case "currency":
        return t(`coupon.${code}`);
    }
    if (message === "Coupon code is required") return t("coupon.required");
    if (message === "Cart is empty") return t("coupon.emptyCart");
    if (message === "Invalid coupon code") return t("coupon.invalid");
    if (message === "Failed to validate coupon") return t("coupon.failed");
    return message || t("coupon.invalid");
  };

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
          locale: payloadLocale,
          currency: currency === "IRT" ? "irt" : "usd",
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
        code?: string;
        amount?: number;
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
        setError(couponError(data.error, data.code, data.amount));
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
            descriptionLocale: payloadLocale,
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
      setError(t("coupon.failed"));
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
                  {t("coupon.applied", { code: state.appliedCoupon.coupon.code })}
                </p>
                <p className="text-xs text-green-600">
                  {(state.appliedCoupon.coupon.descriptionLocale === payloadLocale &&
                    state.appliedCoupon.coupon.description) ||
                    (state.appliedCoupon.freeShipping
                      ? t("coupon.freeShipping")
                      : t("coupon.discountApplied"))}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveCoupon}
              className="h-10 p-1 text-green-600 hover:text-green-800 hover:!bg-green-100"
              aria-label={t("coupon.remove")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <Input
              placeholder={t("coupon.placeholder")}
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              className="flex-1"
              disabled={loading}
            />
            <Button
              type="button"
              onClick={handleApplyCoupon}
              disabled={!couponCode.trim() || loading}
              size="sm"
            >
              {loading ? (
                <LogoTraceLoader
                  loading
                  size={16}
                  strokeWidth={72}
                  className="text-current"
                  ariaLabel={t("coupon.applying")}
                />
              ) : (
                t("coupon.apply")
              )}
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
