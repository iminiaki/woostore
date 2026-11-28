"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ShoppingBag, Trash2 } from "lucide-react";
import { LocaleLink as Link } from "@/components/locale-link";
import { useCart } from "@/components/cart-store";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CouponConfetti } from "@/components/coupon-confetti";
import { CouponInput } from "@/components/coupon-input";
import { PageShell } from "@/components/page-shell";
import { formatLocaleNumber, type StoreCurrency } from "@/i18n/languages";
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
  const itemCount = state.items.reduce((n, item) => n + item.quantity, 0);
  const Forward = active.direction === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <PageShell>
      <div className="mb-6">
        <Breadcrumbs items={[{ label: t("cart.title") }]} />
      </div>
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">
          {t("cart.title")}
        </h1>
        {state.items.length ? (
          <p className="text-muted-foreground">
            {t("checkout.itemsCount", {
              n: formatLocaleNumber(itemCount, active.code),
            })}
          </p>
        ) : null}
      </div>

      {state.items.length === 0 ? (
        <section className="rounded-2xl border bg-card px-6 py-16 text-center shadow-sm">
          <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="size-6 text-muted-foreground" />
          </span>
          <h2 className="mb-2 text-lg font-semibold">{t("cart.empty")}</h2>
          <p className="mx-auto mb-6 max-w-sm text-sm text-muted-foreground">
            {t("cart.emptyHint")}
          </p>
          <Button asChild size="lg" className="h-12 px-8">
            <Link href="/shop">{t("cart.browse")}</Link>
          </Button>
        </section>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid gap-4">
            <section className="rounded-2xl border bg-card shadow-sm">
              <ul className="divide-y">
                {state.items.map((item) => (
                  <li
                    key={item.variantKey}
                    className="flex items-center gap-4 p-4 sm:p-5"
                  >
                    <Link
                      href={`/product/${item.productId}`}
                      className="relative size-20 shrink-0 overflow-hidden rounded-xl border bg-muted transition-opacity hover:opacity-80 sm:size-24"
                    >
                      {item.product.images?.[0] ? (
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.name}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : null}
                    </Link>
                    <div className="min-w-0 flex-1 space-y-1">
                      <Link
                        href={`/product/${item.productId}`}
                        className="line-clamp-2 font-medium transition-colors hover:text-primary"
                      >
                        {item.product.name}
                      </Link>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {t("cart.qty")}:{" "}
                          {formatLocaleNumber(item.quantity, active.code)}
                        </span>
                        {item.product.selectedColor ? (
                          <span>
                            {t("cart.color")}: {item.product.selectedColor}
                          </span>
                        ) : null}
                        {item.product.selectedSize ? (
                          <span>
                            {t("cart.size")}: {item.product.selectedSize}
                          </span>
                        ) : null}
                      </div>
                      <div className="pt-1 text-sm font-medium sm:hidden">
                        {money(
                          item.quantity * item.variantPrice,
                          item.currency || summaryCurrency,
                        )}
                      </div>
                    </div>
                    <div className="hidden shrink-0 text-sm font-medium sm:block">
                      {money(
                        item.quantity * item.variantPrice,
                        item.currency || summaryCurrency,
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        dispatch({
                          type: "remove",
                          variantKey: item.variantKey,
                        })
                      }
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={t("cart.remove", { name: item.product.name })}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>

            {/* Mirrors the homepage ShopCta look. */}
            <section
              aria-labelledby="cart-continue-title"
              className="relative overflow-hidden rounded-2xl border border-border/80 bg-muted/40"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(ellipse_at_top,var(--foreground),transparent_68%)] opacity-[0.06]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent"
              />
              <span aria-hidden className="pointer-events-none absolute -top-24 -end-16 size-64 rounded-full border border-foreground/20" />
              <span aria-hidden className="pointer-events-none absolute -top-8 -end-4 size-36 rounded-full border border-foreground/15" />
              <span aria-hidden className="pointer-events-none absolute -bottom-20 end-10 size-48 rounded-full bg-foreground/10 blur-2xl" />
              <span aria-hidden className="pointer-events-none absolute bottom-0 -start-16 size-48 rounded-full bg-foreground/[0.06] blur-3xl" />
              <div className="relative flex flex-col gap-5 px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <div className="max-w-md">
                  <h2 id="cart-continue-title" className="text-xl font-semibold tracking-tight">
                    {t("cart.continue")}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {t("cart.continueHint")}
                  </p>
                </div>
                <Link
                  href="/shop"
                  className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
                >
                  {t("cart.browseShort")}
                  <Forward className="size-4" />
                </Link>
              </div>
            </section>
          </div>

          <aside className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:sticky lg:top-24">
            <CouponConfetti burstId={celebrateCoupon} />
            <h2 className="mb-5 font-semibold">{t("checkout.summary")}</h2>

            <CouponInput
              subtotal={subtotal}
              onApplied={() => setCelebrateCoupon((n) => n + 1)}
            />

            <dl className="mt-5 space-y-2 border-t pt-5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t("cart.subtotal")}</dt>
                <dd>{money(subtotal)}</dd>
              </div>
              {discountAmount > 0 ? (
                <div className="flex items-center justify-between text-green-600">
                  <dt>{t("cart.discount")}</dt>
                  <dd>{money(-discountAmount)}</dd>
                </div>
              ) : null}
              {state.appliedCoupon?.freeShipping ? (
                <div className="flex items-center justify-between text-green-600">
                  <dt>{t("checkout.shipping")}</dt>
                  <dd>{t("common.free")}</dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
                <dt>{t("cart.total")}</dt>
                <dd>{money(finalPrice)}</dd>
              </div>
            </dl>

            <Button asChild size="lg" className="mt-5 h-12 w-full text-base">
              <Link href="/checkout">
                {t("cart.checkout")}
                <Forward className="size-4" />
              </Link>
            </Button>
          </aside>
        </div>
      )}
    </PageShell>
  );
}
