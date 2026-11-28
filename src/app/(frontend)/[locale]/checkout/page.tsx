"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Banknote, Check, MapPin, User, Wallet } from "lucide-react";
import { useCart } from "@/components/cart-store";
import { useAuth } from "@/components/auth-context";
import { useI18n } from "@/components/locale-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CouponConfetti } from "@/components/coupon-confetti";
import { CouponInput } from "@/components/coupon-input";
import { LogoTraceLoader } from "@/components/LogoTraceLoader";
import { Country, State, City } from "country-state-city";
import { playErrorSound, playSuccessSound } from "@/lib/feedback-sounds";
import { PageShell } from "@/components/page-shell";
import { SearchableSelect } from "@/components/searchable-select";
import { StoreMoney } from "@/components/store-money";
import { formatLocaleNumber } from "@/i18n/languages";
import {
  IRAN_COUNTRY,
  IRAN_PROVINCES,
  isIranPostcode,
  normalizeIranMobile,
  toAsciiDigits,
} from "@/lib/iran-regions";
import { cn } from "@/lib/utils";
import type { WalletView } from "@/lib/wallet-types";

type FieldKey = "name" | "email" | "phone" | "country" | "state" | "city" | "address" | "postcode";
type FieldErrors = Partial<Record<FieldKey, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Section({
  step,
  icon,
  title,
  hint,
  children,
}: {
  step: number;
  icon: ReactNode;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <header className="mb-5 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold leading-tight">
            <span className="sr-only">{step}. </span>
            {title}
          </h2>
          {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
        </div>
      </header>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  error,
  optional,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  optional?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id} className="justify-between">
        <span>{label}</span>
        {optional ? <span className="text-xs font-normal text-muted-foreground">{optional}</span> : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const uid = useId();
  const fid = (key: string) => `${uid}-${key}`;
  const { localize, t, active } = useI18n();
  const { user } = useAuth();
  const { state, subtotal, discountAmount, finalPrice, dispatch } = useCart();
  const isPersian = active.code.toLowerCase().startsWith("fa");
  const summaryCurrency = state.items.find((item) => item.currency)?.currency || active.currency;
  const orderCurrency = summaryCurrency === "IRT" ? "irt" : "usd";
  const money = (amount: number) => (
    <StoreMoney amount={amount} currency={summaryCurrency} locale={active.code} />
  );

  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>(isPersian ? IRAN_COUNTRY.code : "");
  const [selectedState, setSelectedState] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [address2, setAddress2] = useState("");
  const [postcode, setPostcode] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [celebrateCoupon, setCelebrateCoupon] = useState(0);

  // Persian storefront ships within Iran only.
  useEffect(() => {
    if (isPersian) setSelectedCountry(IRAN_COUNTRY.code);
  }, [isPersian]);

  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(
    () => (!isPersian && selectedCountry ? State.getStatesOfCountry(selectedCountry) : []),
    [isPersian, selectedCountry],
  );
  const cities = useMemo(
    () =>
      !isPersian && selectedState
        ? City.getCitiesOfState(selectedCountry, selectedState).map((c) => c.name)
        : [],
    [isPersian, selectedCountry, selectedState],
  );
  const iranProvince = isPersian ? IRAN_PROVINCES.find((p) => p.id === selectedState) : undefined;
  const cityOptions = useMemo(
    () => (isPersian ? iranProvince?.cities || [] : cities).map((c) => ({ value: c, label: c })),
    [isPersian, iranProvince, cities],
  );
  const countryOptions = useMemo(
    () => countries.map((c) => ({ value: c.isoCode, label: `${c.flag} ${c.name}` })),
    [countries],
  );
  const needsState = isPersian || states.length > 0;
  // Abroad, a few regions have no city data; only then is the city typed in.
  const cityIsFreeText = !isPersian && (needsState ? Boolean(selectedState) : Boolean(selectedCountry)) && cityOptions.length === 0;

  const accountEmail = user?.email?.trim().toLowerCase() || "";
  const emailMatches = Boolean(accountEmail) && email.trim().toLowerCase() === accountEmail;
  // Store credit can only pay for an order in the same currency, and only when there is credit.
  const walletAvailable = Boolean(
    wallet && wallet.currency === orderCurrency && wallet.balance > 0,
  );
  const walletApplied =
    useWallet && emailMatches && walletAvailable && wallet ? Math.min(wallet.balance, finalPrice) : 0;
  const due = Math.max(0, finalPrice - walletApplied);
  const itemCount = state.items.reduce((n, item) => n + item.quantity, 0);

  useEffect(() => {
    if (!user) return;
    setName((current) => current || [user.firstName, user.lastName].filter(Boolean).join(" "));
    setEmail((current) => current || user.email);
    setPhone((current) => current || user.phone || "");
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
    if (!emailMatches || !walletAvailable) setUseWallet(false);
  }, [emailMatches, walletAvailable]);

  const clearError = (key: FieldKey) =>
    setFieldErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));

  const handleCountryChange = (value: string) => {
    setSelectedCountry(value);
    setSelectedState("");
    setCity("");
    clearError("country");
  };

  const handleStateChange = (value: string) => {
    setSelectedState(value);
    setCity("");
    clearError("state");
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = t("checkout.errName");
    if (!EMAIL_RE.test(email.trim())) next.email = t("checkout.errEmail");
    if (isPersian) {
      if (!normalizeIranMobile(phone)) next.phone = t("checkout.errPhoneIr");
      if (!isIranPostcode(postcode)) next.postcode = t("checkout.errPostcodeIr");
    } else {
      if (phone.trim() && toAsciiDigits(phone).replace(/\D/g, "").length < 7) {
        next.phone = t("checkout.errPhone");
      }
      if (!selectedCountry) next.country = t("checkout.errCountry");
      if (postcode.trim() && !/^[A-Za-z0-9 -]{3,10}$/.test(postcode.trim())) {
        next.postcode = t("checkout.errPostcode");
      }
    }
    if (needsState && !selectedState) next.state = t("checkout.errState");
    if (!city.trim() || (!cityIsFreeText && !cityOptions.some((c) => c.value === city))) {
      next.city = t("checkout.errCity");
    }
    if (!address.trim()) next.address = t("checkout.errAddress");
    return next;
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.items.length) {
      setError(t("checkout.empty"));
      return;
    }
    const errors = validate();
    setFieldErrors(errors);
    const firstInvalid = (Object.keys(errors) as FieldKey[])[0];
    if (firstInvalid) {
      playErrorSound();
      setError(t("checkout.fixErrors"));
      document.getElementById(fid(firstInvalid))?.focus();
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const countryName = isPersian
        ? IRAN_COUNTRY.name
        : countries.find((c) => c.isoCode === selectedCountry)?.name || selectedCountry;
      const stateName = isPersian
        ? iranProvince?.name || ""
        : states.find((s) => s.isoCode === selectedState)?.name || selectedState;
      const phoneValue = isPersian ? normalizeIranMobile(phone) || phone : phone.trim();
      const postcodeValue = isPersian
        ? toAsciiDigits(postcode).replace(/\D/g, "")
        : postcode.trim();
      const addressBlock = {
        name: name.trim(),
        phone: phoneValue,
        country: countryName,
        state: stateName,
        city: city.trim(),
        address1: address.trim(),
        address2: address2.trim(),
        postcode: postcodeValue,
      };

      const res = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          phone: phoneValue,
          note,
          paymentMethod: walletApplied > 0 ? "wallet" : "cod",
          useWallet: walletApplied > 0,
          currency: orderCurrency,
          couponCode: state.appliedCoupon?.coupon.code,
          shippingTotal: 0,
          billing: addressBlock,
          shipping: addressBlock,
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

  const invalid = (key: FieldKey) =>
    fieldErrors[key]
      ? { "aria-invalid": true as const, "aria-describedby": `${fid(key)}-error` }
      : {};

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
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("checkout.title")}</h1>
        <p className="text-muted-foreground">{t("checkout.hint")}</p>
      </div>

      <form
        noValidate
        onSubmit={placeOrder}
        className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]"
      >
        <div className="grid gap-6">
          <Section step={1} icon={<User className="size-4" />} title={t("checkout.contact")} hint={t("checkout.contactHint")}>
            <Field id={fid("name")} label={t("checkout.name")} error={fieldErrors.name}>
              <Input
                id={fid("name")}
                autoComplete="name"
                placeholder={t("checkout.namePlaceholder")}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError("name");
                }}
                className="h-11"
                {...invalid("name")}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={fid("email")} label={t("checkout.email")} error={fieldErrors.email}>
                <Input
                  id={fid("email")}
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  placeholder={t("checkout.emailPlaceholder")}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearError("email");
                  }}
                  className="h-11 text-start rtl:text-right"
                  {...invalid("email")}
                />
              </Field>
              <Field
                id={fid("phone")}
                label={t("checkout.phone")}
                error={fieldErrors.phone}
                optional={isPersian ? undefined : t("checkout.optional")}
              >
                <Input
                  id={fid("phone")}
                  type="tel"
                  dir="ltr"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={isPersian ? 14 : 20}
                  placeholder={t("checkout.phonePlaceholder")}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    clearError("phone");
                  }}
                  className="h-11 rtl:text-right"
                  {...invalid("phone")}
                />
              </Field>
            </div>
          </Section>

          <Section step={2} icon={<MapPin className="size-4" />} title={t("checkout.shippingAddress")} hint={t("checkout.shippingHint")}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id={fid("country")} label={t("checkout.countryLabel")} error={fieldErrors.country}>
                {isPersian ? (
                  <Input id={fid("country")} value={IRAN_COUNTRY.name} disabled readOnly className="h-11" />
                ) : (
                  <SearchableSelect
                    id={fid("country")}
                    value={selectedCountry}
                    onChange={handleCountryChange}
                    options={countryOptions}
                    placeholder={t("checkout.country")}
                    searchPlaceholder={t("checkout.searchCountry")}
                    emptyText={t("checkout.noResults")}
                    invalid={Boolean(fieldErrors.country)}
                    describedBy={fieldErrors.country ? `${fid("country")}-error` : undefined}
                  />
                )}
              </Field>
              <Field id={fid("state")} label={t("checkout.stateLabel")} error={fieldErrors.state}>
                <Select
                  value={selectedState}
                  onValueChange={handleStateChange}
                  disabled={!isPersian && (!selectedCountry || states.length === 0)}
                >
                  <SelectTrigger id={fid("state")} className="h-11 w-full data-[size=default]:h-11" {...invalid("state")}>
                    <SelectValue placeholder={t("checkout.state")} />
                  </SelectTrigger>
                  <SelectContent>
                    {isPersian
                      ? IRAN_PROVINCES.map((province) => (
                          <SelectItem key={province.id} value={province.id}>
                            {province.name}
                          </SelectItem>
                        ))
                      : states.map((s) => (
                          <SelectItem key={s.isoCode} value={s.isoCode}>
                            {s.name}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id={fid("city")} label={t("checkout.cityLabel")} error={fieldErrors.city}>
                {cityIsFreeText ? (
                  <Input
                    id={fid("city")}
                    autoComplete="address-level2"
                    placeholder={t("checkout.cityLabel")}
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      clearError("city");
                    }}
                    className="h-11"
                    {...invalid("city")}
                  />
                ) : (
                  <SearchableSelect
                    id={fid("city")}
                    value={city}
                    onChange={(value) => {
                      setCity(value);
                      clearError("city");
                    }}
                    options={cityOptions}
                    disabled={cityOptions.length === 0}
                    placeholder={t("checkout.city")}
                    searchPlaceholder={t("checkout.searchCity")}
                    emptyText={t("checkout.noResults")}
                    invalid={Boolean(fieldErrors.city)}
                    describedBy={fieldErrors.city ? `${fid("city")}-error` : undefined}
                  />
                )}
              </Field>
            </div>
            <Field id={fid("address")} label={t("checkout.address")} error={fieldErrors.address}>
              <Input
                id={fid("address")}
                autoComplete="address-line1"
                placeholder={t("checkout.addressPlaceholder")}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  clearError("address");
                }}
                className="h-11"
                {...invalid("address")}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={fid("address2")} label={t("checkout.address2")} optional={t("checkout.optional")}>
                <Input
                  id={fid("address2")}
                  autoComplete="address-line2"
                  placeholder={t("checkout.address2Placeholder")}
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  className="h-11"
                />
              </Field>
              <Field
                id={fid("postcode")}
                label={t("checkout.postcode")}
                error={fieldErrors.postcode}
                optional={isPersian ? undefined : t("checkout.optional")}
              >
                <Input
                  id={fid("postcode")}
                  dir="ltr"
                  inputMode={isPersian ? "numeric" : "text"}
                  autoComplete="postal-code"
                  maxLength={isPersian ? 11 : 10}
                  placeholder={t("checkout.postcodePlaceholder")}
                  value={postcode}
                  onChange={(e) => {
                    const value = isPersian
                      ? toAsciiDigits(e.target.value).replace(/[^\d-]/g, "")
                      : e.target.value;
                    setPostcode(value);
                    clearError("postcode");
                  }}
                  className="h-11 tracking-wider rtl:text-right"
                  {...invalid("postcode")}
                />
              </Field>
            </div>
            <Field id={fid("note")} label={t("checkout.notesLabel")} optional={t("checkout.optional")}>
              <Textarea
                id={fid("note")}
                placeholder={t("checkout.notesPlaceholder")}
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </Section>

          <Section step={3} icon={<Banknote className="size-4" />} title={t("checkout.payment")}>
            <div className="flex items-center gap-3 rounded-xl border-2 border-foreground p-4">
              <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                <Check className="size-3" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t("checkout.cod")}</p>
                <p className="text-xs text-muted-foreground">{t("checkout.codHint")}</p>
              </div>
              <Banknote className="size-5 text-muted-foreground" />
            </div>

            {user && walletAvailable && wallet ? (
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors",
                  useWallet && emailMatches ? "border-foreground bg-muted/40" : "hover:bg-muted/30",
                  !emailMatches && "cursor-not-allowed opacity-70",
                )}
              >
                <Checkbox
                  checked={useWallet}
                  disabled={!emailMatches}
                  onCheckedChange={(checked) => setUseWallet(checked === true)}
                />
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block text-sm font-medium">{t("checkout.wallet")}</span>
                  <span className="block text-xs text-muted-foreground">
                    {emailMatches ? (
                      <span className="inline-flex items-center gap-1">
                        {t("checkout.walletBalance", { amount: "" })}
                        {money(wallet.balance)}
                      </span>
                    ) : (
                      t("checkout.walletEmail").trim()
                    )}
                  </span>
                </span>
                <Wallet className="size-5 text-muted-foreground" />
              </label>
            ) : null}

            {!user && orderCurrency === "usd" ? (
              <p className="text-sm text-muted-foreground">{t("checkout.walletSignIn")}</p>
            ) : null}
          </Section>
        </div>

        <aside className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:sticky lg:top-24">
          <CouponConfetti burstId={celebrateCoupon} />
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">{t("checkout.summary")}</h2>
            <span className="text-sm text-muted-foreground">
              {t("checkout.itemsCount", { n: formatLocaleNumber(itemCount, active.code) })}
            </span>
          </div>

          <ul className="max-h-72 space-y-3 overflow-y-auto pe-1">
            {state.items.map((item) => (
              <li key={item.variantKey} className="flex items-center gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
                  {item.product.images?.[0] ? (
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : null}
                  <span className="absolute -top-0 end-0 flex min-w-5 items-center justify-center rounded-bl-md bg-foreground px-1 text-[10px] font-medium leading-5 text-background rtl:rounded-bl-none rtl:rounded-br-md">
                    {formatLocaleNumber(item.quantity, active.code)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.product.name}</p>
                  {item.product.selectedColor || item.product.selectedSize ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {[item.product.selectedColor, item.product.selectedSize].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-sm">{money(item.quantity * item.variantPrice)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t pt-5">
            <CouponInput
              subtotal={subtotal}
              email={email}
              onApplied={() => setCelebrateCoupon((n) => n + 1)}
            />
          </div>

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
            {walletApplied > 0 ? (
              <div className="flex items-center justify-between text-green-600">
                <dt>{t("checkout.walletLine")}</dt>
                <dd>{money(-walletApplied)}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
              <dt>{walletApplied > 0 ? t("checkout.due") : t("cart.total")}</dt>
              <dd>{money(due)}</dd>
            </div>
          </dl>

          {error ? (
            <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="mt-5 h-12 w-full text-base" disabled={submitting || !state.items.length}>
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
        </aside>
      </form>
    </PageShell>
  );
}
