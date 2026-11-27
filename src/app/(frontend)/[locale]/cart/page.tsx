"use client";

import Image from "next/image";
import { LocaleLink as Link } from "@/components/locale-link";
import { useState } from "react";
import { useCart } from "@/components/cart-store";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, Trash2 } from "lucide-react";
import { CouponConfetti } from "@/components/coupon-confetti";
import { CouponInput } from "@/components/coupon-input";
import { PageShell } from "@/components/page-shell";
import { type StoreCurrency } from "@/i18n/languages";
import { StoreMoney } from "@/components/store-money";
import { useI18n } from "@/components/locale-provider";

export default function CartPage() {
  const { state, subtotal, discountAmount, finalPrice, dispatch } = useCart();
  const { active, t } = useI18n();
  const [celebrateCoupon, setCelebrateCoupon] = useState(0);
  const summaryCurrency: StoreCurrency =
    state.items.find((item) => item.currency)?.currency || active.currency;
  const money = (amount: number, currency: StoreCurrency = summaryCurrency) => (
    <StoreMoney amount={amount} currency={currency} locale={active.code} />
  );
  return (
    <PageShell className="space-y-8">
      <div className="mb-6">
        <Breadcrumbs 
          items={[
            { label: t("cart.title") }
          ]} 
        />
      </div>
      <h1 className="text-2xl font-semibold">{t("cart.title")}</h1>
      {state.items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">{t("cart.empty")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("cart.emptyHint")}
            </p>
            <Button asChild>
              <Link href="/shop">{t("cart.browse")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8 md:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {state.items.map((item) => (
              <div key={item.variantKey} className="flex items-center gap-4 rounded-lg border p-3">
                <Link href={`/product/${item.productId}`} className="relative h-20 w-20 overflow-hidden rounded-md bg-muted hover:opacity-80 transition-opacity">
                  <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
                </Link>
                <div className="flex-1">
                  <Link href={`/product/${item.productId}`} className="font-medium hover:text-primary transition-colors">
                    {item.product.name}
                  </Link>
                  <div className="text-sm text-muted-foreground">
                    {t("cart.qty")}: {item.quantity}
                    {item.product.selectedColor && (
                      <span> • {t("cart.color")}: {item.product.selectedColor}</span>
                    )}
                    {item.product.selectedSize && (
                      <span> • {t("cart.size")}: {item.product.selectedSize}</span>
                    )}
                  </div>
                </div>
                <div className="font-medium">{money(item.quantity * item.variantPrice, item.currency || summaryCurrency)}</div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => dispatch({ type: "remove", variantKey: item.variantKey })}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {/* Continue Shopping Section */}
            <div className="flex items-center gap-4 rounded-lg border p-3 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <div className="relative h-20 w-20 overflow-hidden rounded-md bg-primary/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">
                  {t("cart.continue")}
                </h3>
                <div className="text-sm text-muted-foreground">
                  {t("cart.continueHint")}
                </div>
              </div>
              <Button 
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105" 
                size="sm"
                asChild
              >
                <Link href="/shop">
                  {t("cart.browseShort")}
                </Link>
              </Button>
            </div>
          </div>
          <div className="relative overflow-hidden space-y-4 rounded-lg border p-4">
            <CouponConfetti burstId={celebrateCoupon} />
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{t("cart.subtotal")}</span>
                <span>{money(subtotal)}</span>
              </div>
              
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-sm text-green-600">
                  <span>{t("cart.discount")}</span>
                  <span>-{money(discountAmount)}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between border-t pt-2 font-semibold">
                <span>{t("cart.total")}</span>
                <span>{money(finalPrice)}</span>
              </div>
            </div>
            
            <CouponInput
              subtotal={subtotal}
              onApplied={() => setCelebrateCoupon((n) => n + 1)}
            />
            
            <Link href="/checkout" className="block">
              <Button className="w-full">{t("cart.checkout")}</Button>
            </Link>
          </div>
        </div>
      )}
    </PageShell>
  );
}


