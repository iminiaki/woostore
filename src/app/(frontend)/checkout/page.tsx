"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-store";
import { useAuth } from "@/components/auth-context";
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
import type { WalletView } from "@/lib/wallet-types";

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { state, subtotal, discountAmount, finalPrice, dispatch } = useCart();
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
      setError("Your cart is empty");
      return;
    }
    if (!name.trim() || !email.trim() || !address.trim()) {
      setError("Name, email, and address are required");
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
          currency: "usd",
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
        setError(data.error || "Failed to place order");
        return;
      }

      playSuccessSound();
      dispatch({ type: "clear" });
      const params = new URLSearchParams();
      if (data.orderNumber) params.set("order", data.orderNumber);
      if (data.proformaUrl) params.set("doc", data.proformaUrl);
      router.push(`/checkout/success?${params.toString()}`);
    } catch {
      playErrorSound();
      setError("Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: "Cart", href: "/cart" },
            { label: "Checkout" },
          ]}
        />
      </div>
      <div className="grid gap-10 md:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Checkout</h1>
            <p className="text-muted-foreground">Enter your shipping and payment details.</p>
          </div>
          <form className="grid gap-4" onSubmit={placeOrder}>
            <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={selectedCountry} onValueChange={handleCountryChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Country" />
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
                  <SelectValue placeholder="Select State/Province" />
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
                  <SelectValue placeholder="Select City" />
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
            <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} required />
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Additional Address Line"
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
              />
              <Input
                placeholder="ZIP/Postal Code"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
              />
            </div>
            <Textarea
              placeholder="Notes (optional)"
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
                  <span className="block text-sm font-medium">Pay with wallet</span>
                  <span className="block text-sm text-muted-foreground">
                    {wallet
                      ? `Available $${wallet.balance.toFixed(2)}`
                      : "Checking your balance…"}
                    {!emailMatches
                      ? " Use the email on your account to spend it."
                      : wallet && wallet.balance <= 0
                        ? " The shop adds store credit to this account."
                        : ""}
                  </span>
                </span>
              </label>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sign in to spend store credit from your wallet.
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
                    className="mr-2 text-current"
                    ariaLabel="Placing order"
                  />
                  Placing order…
                </>
              ) : (
                "Place order"
              )}
            </Button>
          </form>
        </div>
        <aside className="relative overflow-hidden space-y-4 rounded-lg border p-4">
          <CouponConfetti burstId={celebrateCoupon} />
          <div className="font-medium">Order summary</div>
          <div className="space-y-2 text-sm">
            {state.items.map((i) => (
              <div key={i.variantKey} className="flex items-center justify-between">
                <span>
                  {i.product.name} × {i.quantity}
                </span>
                <span>${(i.quantity * i.variantPrice).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}

            {state.appliedCoupon?.freeShipping && (
              <div className="flex items-center justify-between text-sm text-green-600">
                <span>Shipping</span>
                <span>Free</span>
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <span>${finalPrice.toFixed(2)}</span>
            </div>
            {walletApplied > 0 ? (
              <>
                <div className="flex items-center justify-between text-sm text-green-600">
                  <span>Wallet</span>
                  <span>-${walletApplied.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Due on delivery</span>
                  <span>${due.toFixed(2)}</span>
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
