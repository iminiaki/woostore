"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-store";
import { useAuth } from "@/components/auth-context";
import { useI18n } from "@/components/locale-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CouponConfetti } from "@/components/coupon-confetti";
import { CouponInput } from "@/components/coupon-input";
import { LogoTraceLoader } from "@/components/LogoTraceLoader";
import { Country, State, City } from "country-state-city";
import { playErrorSound, playSuccessSound } from "@/lib/feedback-sounds";
import { PageShell } from "@/components/page-shell";
import { StoreMoney } from "@/components/store-money";
import { formatLocaleNumber } from "@/i18n/languages";
import { formatMoney } from "@/lib/invoice-format";
import type { WalletView } from "@/lib/wallet-types";

export default function CheckoutPage() {
  const router = useRouter();
  const { localize, t, active } = useI18n();
  const { user } = useAuth();
  const { state, subtotal, discountAmount, finalPrice, dispatch } = useCart();
  const lang = active.code.toLowerCase().startsWith("fa") ? "fa" : "en";
  const summaryCurrency = state.items.find((item) => item.currency)?.currency || active.currency;
  const orderCurrency = summaryCurrency === "IRT" ? "irt" : "usd";
  const money = (amount: number) => (
    <StoreMoney amount={amount} currency={summaryCurrency} locale={active.code} />
  );
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [address2, setAddress2] = useState("");
  const [postcode, setPostcode] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrateCoupon, setCelebrateCoupon] = useState(0);

  const countries = Country.getAllCountries();
  const states = selectedCountry ? State.getStatesOfCountry(selectedCountry) : [];
  const cities = selectedState ? City.getCitiesOfState(selectedCountry, selectedState) : [];

  const accountEmail = user?.email?.trim().toLowerCase() || "";
  const emailMatches = Boolean(accountEmail) && email.trim().toLowerCase() === accountEmail;
  const walletApplied =
    useWallet && emailMatches && wallet ? Math.min(wallet.balance, finalPrice) : 0;
  const due = Math.max(0, finalPrice - walletApplied);

  useEffect(() => {
    if (!user) return;
    setName((current) => current || [user.firstName, user.lastName].filter(Boolean).join(" "));
    setEmail((current) => current || user.email);
    setPhone((current) => current || user.phone);
  }, [user]);

  useEffect(() => {
    if (!accountEmail) {
      setWallet(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/store/account/wallet?email=${encodeURIComponent(accountEmail)}`)
      .then(async (response) => {
        const data = (await response.json()) as WalletView;
        if (!response.ok) throw new Error("wallet");
        return data;
      })
      .then((next) => {
        if (!cancelled) setWallet(next);
      })
      .catch(() => {
        if (!cancelled) setWallet(null);
      });
    return () => {
      cancelled = true;
    };
  }, [accountEmail]);

  useEffect(() => {
    if (!emailMatches) setUseWallet(false);
  }, [emailMatches]);

  const handleCountryChange = (value: string) => {
    setSelectedCountry(value);
    setSelectedState("");
    setSelectedCity("");
  };

  const handleStateChange = (value: string) => {
    setSelectedState(value);
    setSelectedCity("");
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.items.length) {
      setError(t("checkout.empty"));
      return;
    }
    if (!name.trim() || !email.trim() || !address.trim()) {
      setError(t("checkout.required"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const countryName = countries.find((c) => c.isoCode === selectedCountry)?.name || selectedCountry;
      const stateName = states.find((s) => s.isoCode === selectedState)?.name || selectedState;

      const res = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          phone,
          note,
          paymentMethod: walletApplied > 0 ? "wallet" : "cod",
          useWallet: walletApplied > 0,
          currency: orderCurrency,
          couponCode: state.appliedCoupon?.coupon.code,
          shippingTotal: state.appliedCoupon?.freeShipping ? 0 : 0,
          billing: {
            name,
            phone,
            country: countryName,
            state: stateName,
            city: selectedCity,
            address1: address,
            address2,
            postcode,
          },
          shipping: {
            name,
            phone,
            country: countryName,
            state: stateName,
            city: selectedCity,
            address1: address,
            address2,
            postcode,
          },
          items: state.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            variantKey: item.variantKey,
            color: item.product.selectedColor,
            size: item.product.selectedSize,
            unitPrice: item.variantPrice,
          })),
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        orderNumber?: string;
        id?: string;
        proformaUrl?: string | null;
      };

      if (!res.ok) {
        playErrorSound();
        setError(
          data.error === "Wallet payments are in USD."
            ? t("checkout.walletUsd")
            : data.error || t("checkout.failed"),
        );
        return;
      }

      playSuccessSound();
      dispatch({ type: "clear" });
      const params = new URLSearchParams();
      if (data.orderNumber) params.set("order", data.orderNumber);
      if (data.proformaUrl) params.set("doc", data.proformaUrl);
      router.push(localize(`/checkout/success?${params.toString()}`));
    } catch {
      playErrorSound();
      setError(t("checkout.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: t("cart.title"), href: "/cart" },
            { label: t("checkout.title") },
          ]}
        />
      </div>
      <div className="grid gap-10 md:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">{t("checkout.title")}</h1>
            <p className="text-muted-foreground">{t("checkout.hint")}</p>
          </div>
          <form className="grid gap-4" onSubmit={placeOrder}>
            <Input placeholder={t("checkout.name")} value={name} onChange={(e) => setName(e.target.value)} required />
            <Input
              placeholder={t("checkout.email")}
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input placeholder={t("checkout.phone")} dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={selectedCountry} onValueChange={handleCountryChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("checkout.country")} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.isoCode} value={country.isoCode}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedState} onValueChange={handleStateChange} disabled={!selectedCountry}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("checkout.state")} />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s.isoCode} value={s.isoCode}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("checkout.city")} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.name} value={city.name}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input placeholder={t("checkout.address")} value={address} onChange={(e) => setAddress(e.target.value)} required />
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder={t("checkout.address2")}
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
              />
              <Input
                placeholder={t("checkout.postcode")}
                dir="ltr"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
              />
            </div>
            <Textarea
              placeholder={t("checkout.notes")}
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            {user ? (
              <label className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox
                  checked={useWallet}
                  disabled={!emailMatches || !wallet || wallet.balance <= 0}
                  onCheckedChange={(checked) => setUseWallet(checked === true)}
                  className="mt-0.5"
                />
                <span className="space-y-1">
                  <span className="block text-sm font-medium">{t("checkout.wallet")}</span>
                  <span className="block text-sm text-muted-foreground">
                    {wallet
                      ? t("checkout.walletBalance", {
                          amount: formatMoney(wallet.balance, wallet.currency, lang),
                        })
                      : t("checkout.walletChecking")}
                    {!emailMatches
                      ? t("checkout.walletEmail")
                      : wallet && wallet.balance <= 0
                        ? t("checkout.walletEmpty")
                        : ""}
                  </span>
                </span>
              </label>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("checkout.walletSignIn")}
              </p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={submitting || !state.items.length}>
              {submitting ? (
                <>
                  <LogoTraceLoader
                    loading
                    size={18}
                    strokeWidth={72}
                    className="me-2 text-current"
                    ariaLabel={t("checkout.placing")}
                  />
                  {t("checkout.placing")}
                </>
              ) : (
                t("checkout.place")
              )}
            </Button>
          </form>
        </div>
        <aside className="relative overflow-hidden space-y-4 rounded-lg border p-4">
          <CouponConfetti burstId={celebrateCoupon} />
          <div className="font-medium">{t("checkout.summary")}</div>
          <div className="space-y-2 text-sm">
            {state.items.map((i) => (
              <div key={i.variantKey} className="flex items-center justify-between gap-3">
                <span>
                  {i.product.name} × {formatLocaleNumber(i.quantity, active.code)}
                </span>
                <span>{money(i.quantity * i.variantPrice)}</span>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-2">
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

            {state.appliedCoupon?.freeShipping && (
              <div className="flex items-center justify-between text-sm text-green-600">
                <span>{t("checkout.shipping")}</span>
                <span>{t("common.free")}</span>
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-2 font-semibold">
              <span>{t("cart.total")}</span>
              <span>{money(finalPrice)}</span>
            </div>
            {walletApplied > 0 ? (
              <>
                <div className="flex items-center justify-between text-sm text-green-600">
                  <span>{t("checkout.walletLine")}</span>
                  <span>-{money(walletApplied)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>{t("checkout.due")}</span>
                  <span>{money(due)}</span>
                </div>
              </>
            ) : null}
          </div>

          <CouponInput
            subtotal={subtotal}
            email={email}
            onApplied={() => setCelebrateCoupon((n) => n + 1)}
          />
        </aside>
      </div>
    </PageShell>
  );
}
