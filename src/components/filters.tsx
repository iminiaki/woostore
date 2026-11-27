"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFilterNavigation } from "@/components/filter-navigation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";
import { useI18n } from "@/components/locale-provider";
import { StoreMoney } from "@/components/store-money";
import { formatLocaleNumber } from "@/i18n/languages";

type Group = {
  key: string;
  title: string;
  kind?: "brand" | "attribute";
  attributeType?: "select" | "color" | "button";
  options: string[];
  optionValues?: string[];
  optionHex?: (string | null)[];
};
type Option = { label: string; value: string };

function groupEntries(
  g: Group,
): Array<{ label: string; value: string; hex?: string | null }> {
  return g.options.map((label, i) => ({
    label,
    value: g.optionValues?.[i] ?? label,
    hex: g.optionHex?.[i] ?? null,
  }));
}

export function Filters({ 
  groups, 
  priceMax,
  categoryOptions,
  subOptionsByCategory,
  idPrefix = "",
}: { 
  groups: Group[]; 
  priceMax: number;
  categoryOptions?: Option[];
  subOptionsByCategory?: Record<string, Option[]>;
  idPrefix?: string;
}) {
  const router = useRouter();
  const navigation = useFilterNavigation();
  const params = useSearchParams();
  const pathname = usePathname();
  const { t, active } = useI18n();
  const digits = (value: number) => formatLocaleNumber(value, active.code);

  const go = (next: URLSearchParams) => {
    const qs = next.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    if (navigation) navigation.navigate(href);
    else router.push(href, { scroll: false });
  };

  const valuesOf = (key: string) =>
    new Set((params.get(key)?.split(",") || []).filter(Boolean));

  const setMulti = (key: string, value: string, on: boolean) => {
    const current = valuesOf(key);
    if (current.has(value) === on) return;
    const next = new URLSearchParams(params.toString());
    if (on) current.add(value);
    else current.delete(value);
    if (current.size) next.set(key, Array.from(current).join(","));
    else next.delete(key);
    go(next);
  };

  const setRange = (nextMin: number, nextMax: number) => {
    const currentMin = Number(params.get("minPrice") || 0);
    const currentMax = Number(params.get("maxPrice") || priceMax);
    if (nextMin === currentMin && nextMax === currentMax) return;
    const next = new URLSearchParams(params.toString());
    if (nextMin <= 0) next.delete("minPrice");
    else next.set("minPrice", String(nextMin));
    if (nextMax >= priceMax) next.delete("maxPrice");
    else next.set("maxPrice", String(nextMax));
    go(next);
  };

  const setCategory = (category: string, on: boolean) => {
    const nextValue = on ? category : "";
    if ((params.get("category") || "") === nextValue) return;
    const next = new URLSearchParams(params.toString());
    if (nextValue) next.set("category", nextValue);
    else next.delete("category");
    next.delete("subCategory");
    go(next);
  };

  const min = Number(params.get("minPrice") || 0);
  const max = Number(params.get("maxPrice") || priceMax);

  // Helper function to count active filters for a specific group
  const getActiveCount = (key: string) => {
    const value = params.get(key);
    return value ? value.split(',').filter(Boolean).length : 0;
  };

  // Check if price filter is active
  const isPriceActive = min > 0 || max < priceMax;

  // Get all active filters (including category and subCategory)
  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; value: string; label: string; type: 'category' | 'price' }> = [];

    if (params.get("clearance") === "1") {
      filters.push({ key: "clearance", value: "1", label: t("filter.clearance"), type: "category" });
    }

    // category (single)
    const cat = params.get('category');
    if (cat) {
      const label = categoryOptions?.find((o) => o.value === cat)?.label || cat;
      filters.push({ key: 'category', value: cat, label, type: 'category' });
    }

    // subCategory (multi)
    const subs = params.get('subCategory');
    if (subs) {
      subs
        .split(',')
        .filter(Boolean)
        .forEach((sub) => {
          const label = subOptionsByCategory?.[cat || '']?.find((o) => o.value === sub)?.label || sub;
          filters.push({ key: 'subCategory', value: sub, label, type: 'category' });
        });
    }

    // other groups (brand + dynamic attributes)
    groups.forEach((group) => {
      const values = params.get(group.key);
      if (values) {
        const entries = groupEntries(group);
        values
          .split(',')
          .filter(Boolean)
          .forEach((value) => {
            const label = entries.find((e) => e.value === value)?.label || value;
            filters.push({ key: group.key, value, label, type: 'category' });
          });
      }
    });

    // price
    if (isPriceActive) {
      filters.push({ key: 'price', value: `${min}-${max}`, label: `$${min} - ${max}`, type: 'price' });
    }

    return filters;
  }, [params, groups, isPriceActive, min, max, categoryOptions, subOptionsByCategory, t]);

  // Remove a specific filter
  const removeFilter = (filter: typeof activeFilters[0]) => {
    const next = new URLSearchParams(params.toString());
    if (filter.type === 'price') {
      next.delete('minPrice');
      next.delete('maxPrice');
    } else {
      const set = new Set((next.get(filter.key)?.split(",") || []).filter(Boolean));
      set.delete(filter.value);
      if (set.size) next.set(filter.key, Array.from(set).join(","));
      else next.delete(filter.key);
    }
    go(next);
  };

  // Clear all filters
  const clearAllFilters = () => {
    const next = new URLSearchParams(params.toString());
    groups.forEach(group => {
      next.delete(group.key);
    });
    next.delete('minPrice');
    next.delete('maxPrice');
    next.delete('category');
    next.delete('subCategory');
    next.delete('clearance');
    go(next);
  };

  return (
    <div className="space-y-6">
      {/* Active Filters Section */}
      {activeFilters.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{t("filter.active")}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {t("filter.clearAll")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter, index) => (
              <Badge
                key={`${filter.key}-${filter.value}-${index}`}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1 text-xs"
              >
                <span>{filter.label}</span>
                <button
                  type="button"
                  onClick={() => removeFilter(filter)}
                  className="flex items-center justify-center hover:bg-muted rounded-sm transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Separator />
        </div>
      )}

      <Accordion type="multiple" className="w-full">
        {/* Category Accordion */}
        {categoryOptions && (
          <AccordionItem value="category">
            <AccordionTrigger asChild>
              <button className="flex w-full items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180">
                <span>{t("filter.category")}</span>
                <div className="flex items-center gap-2">
                  {params.get('category') && (
                    <Badge className="h-5 min-w-5 justify-center rounded-sm px-1 text-[10px] bg-primary text-primary-foreground">1</Badge>
                  )}
                  <svg
                    className="h-4 w-4 shrink-0 transition-transform duration-200"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6,9 12,15 18,9" />
                  </svg>
                </div>
              </button>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {categoryOptions.map((opt) => {
                  const checked = params.get('category') === opt.value;
                  return (
                    <div className="flex items-center gap-2" key={opt.value}>
                      <Checkbox id={`${idPrefix}cat-${opt.value}`} checked={checked} onCheckedChange={(state) => setCategory(opt.value, state === true)} />
                      <Label htmlFor={`${idPrefix}cat-${opt.value}`}>{opt.label}</Label>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Subcategory Accordion */}
        {subOptionsByCategory && (
          <AccordionItem value="subCategory">
            <AccordionTrigger asChild>
              <button className="flex w-full items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180">
                <span>{t("filter.subcategory")}</span>
                <div className="flex items-center gap-2">
                  {getActiveCount('subCategory') > 0 && (
                    <Badge className="h-5 min-w-5 justify-center rounded-sm px-1 text-[10px] bg-primary text-primary-foreground">
                      {digits(getActiveCount("subCategory"))}
                    </Badge>
                  )}
                  <svg
                    className="h-4 w-4 shrink-0 transition-transform duration-200"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6,9 12,15 18,9" />
                  </svg>
                </div>
              </button>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {(() => {
                  const catParam = params.get('category');
                  const keys = Object.keys(subOptionsByCategory);
                  const effectiveCat = catParam || (keys.length === 1 ? keys[0] : '');
                  const options = effectiveCat ? (subOptionsByCategory[effectiveCat] || []) : [];
                  return options.length ? (
                    options.map((opt) => {
                      const values = new Set((params.get('subCategory')?.split(',') || []).filter(Boolean));
                      const checked = values.has(opt.value);
                      return (
                        <div className="flex items-center gap-2" key={opt.value}>
                          <Checkbox id={`${idPrefix}sub-${opt.value}`} checked={checked} onCheckedChange={(state) => setMulti('subCategory', opt.value, state === true)} />
                          <Label htmlFor={`${idPrefix}sub-${opt.value}`}>{opt.label}</Label>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-muted-foreground">{t("filter.pickCategory")}</div>
                  );
                })()}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
        {groups.map((g) => {
          const activeCount = getActiveCount(g.key);
          return (
            <AccordionItem key={g.key} value={g.key}>
              <AccordionTrigger asChild>
                <button className="flex w-full items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180">
                  <span>{g.title}</span>
                  <div className="flex items-center gap-2">
                    {activeCount > 0 && (
                      <Badge className="h-5 min-w-5 justify-center rounded-sm px-1 text-[10px] bg-primary text-primary-foreground">
                        {digits(activeCount)}
                      </Badge>
                    )}
                    <svg
                      className="h-4 w-4 shrink-0 transition-transform duration-200"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6,9 12,15 18,9" />
                    </svg>
                  </div>
                </button>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {groupEntries(g).map(({ label, value, hex }) => {
                    const values = new Set((params.get(g.key)?.split(",") || []).filter(Boolean));
                    const checked = values.has(value);
                    const showSwatch =
                      g.attributeType === "color" &&
                      typeof hex === "string" &&
                      /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
                    return (
                      <div className="flex items-center gap-2" key={value}>
                        <Checkbox
                          id={`${idPrefix}${g.key}-${value}`}
                          checked={checked}
                          onCheckedChange={(state) => setMulti(g.key, value, state === true)}
                        />
                        {showSwatch ? (
                          <span
                            className="inline-block size-3.5 shrink-0 rounded-full border border-black/15"
                            style={{ backgroundColor: hex }}
                            aria-hidden
                          />
                        ) : null}
                        <Label htmlFor={`${idPrefix}${g.key}-${value}`} className="capitalize">
                          {label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
        <AccordionItem value="price">
          <AccordionTrigger asChild>
            <button className="flex w-full items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180">
              <span>{t("filter.price")}</span>
              <div className="flex items-center gap-2">
                {isPriceActive && (
                  <Badge className="h-5 min-w-5 justify-center rounded-sm px-1 text-[10px] bg-primary text-primary-foreground">
                    1
                  </Badge>
                )}
                <svg
                  className="h-4 w-4 shrink-0 transition-transform duration-200"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </div>
            </button>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <PriceRange
                min={min}
                max={max}
                priceMax={priceMax}
                onCommit={setRange}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function PriceRange({
  min,
  max,
  priceMax,
  onCommit,
}: {
  min: number;
  max: number;
  priceMax: number;
  onCommit: (min: number, max: number) => void;
}) {
  const { active } = useI18n();
  const [value, setValue] = useState<[number, number]>([min, max]);
  const step = active.currency === "IRT" ? Math.max(1000, Math.round(priceMax / 100)) : 5;

  useEffect(() => {
    setValue([min, max]);
  }, [min, max]);

  return (
    <>
      <Slider
        value={value}
        min={0}
        max={priceMax}
        step={step}
        onValueChange={(next) => setValue([next[0]!, next[1]!])}
        onValueCommit={(next) => onCommit(next[0]!, next[1]!)}
      />
      <div className="text-sm text-muted-foreground">
        <StoreMoney amount={value[0]} currency={active.currency} locale={active.code} />
        {" – "}
        <StoreMoney amount={value[1]} currency={active.currency} locale={active.code} />
      </div>
    </>
  );
}


