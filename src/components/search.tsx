"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { LocaleLink as Link } from "@/components/locale-link";
import { useRouter } from "next/navigation";
import { Search as SearchIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LogoTraceLoader } from "@/components/LogoTraceLoader";
import type { Product } from "@/types";
import { cn } from "@/lib/utils";
import { pickPrice } from "@/i18n/languages";
import { StoreMoney } from "@/components/store-money";
import { useI18n } from "@/components/locale-provider";

type SearchHit = Pick<Product, "id" | "name" | "brand" | "price" | "images">;

type Props = {
  /** `icon` for header; `panel` for dedicated search page. */
  variant?: "icon" | "panel";
  className?: string;
};

export function Search({ variant = "icon", className }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(variant === "panel");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { active, payloadLocale, t, localize } = useI18n();

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      setSelectedIndex(-1);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          limit: "8",
          depth: "1",
          locale: payloadLocale,
          "where[and][0][_status][equals]": "published",
          "where[and][1][language][equals]": payloadLocale,
          "where[and][2][or][0][title][contains]": q,
          "where[and][2][or][1][slug][contains]": q,
        });
        const res = await fetch(`/api/products?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("search failed");
        const json = (await res.json()) as {
          docs?: Array<{
            id: string | number;
            title?: string;
            prices?: { usd?: number; irt?: number };
            brand?: { name?: string } | number | null;
            images?: Array<{ url?: string } | number>;
          }>;
        };

        const mapped: SearchHit[] = (json.docs || []).map((doc) => {
          const brand =
            typeof doc.brand === "object" && doc.brand ? doc.brand.name || "" : "";
          const images = (doc.images || [])
            .map((img) => (typeof img === "object" && img?.url ? img.url : null))
            .filter(Boolean) as string[];
          return {
            id: String(doc.id),
            name: doc.title || "",
            brand,
            price: pickPrice(doc.prices, active.currency),
            images: images.length ? images : ["/product images/man.jpg"],
          };
        });

        setResults(mapped);
        setSelectedIndex(-1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [active.currency, payloadLocale, query]);

  useEffect(() => {
    if (selectedIndex < 0 || !resultsRef.current) return;
    const selected = resultsRef.current.children[selectedIndex] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const goToResult = (product: SearchHit) => {
    setOpen(false);
    setQuery("");
    router.push(localize(`/product/${product.id}`));
  };

  const goToShop = () => {
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(localize(`/shop?search=${encodeURIComponent(q)}`));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!results.length) return;
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        goToResult(results[selectedIndex]);
      } else {
        goToShop();
      }
    }
  };

  const panel = (
    <div className="flex min-h-0 flex-1 flex-col">
      <form
        className="relative border-b px-3 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          goToShop();
        }}
      >
        <SearchIcon className="pointer-events-none absolute top-1/2 start-6 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("search.placeholder")}
          className="h-11 border-0 bg-transparent pr-10 pl-10 shadow-none focus-visible:ring-0"
          autoComplete="off"
        />
        {query ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 end-4 h-8 w-8 -translate-y-1/2"
            onClick={() => setQuery("")}
            aria-label={t("search.clear")}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </form>

      <div ref={resultsRef} className="max-h-[min(60vh,28rem)] flex-1 overflow-y-auto p-2">
        {!query.trim() && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {t("search.empty")}
          </p>
        )}

        {query.trim() && loading && (
          <div className="flex flex-col items-center justify-center gap-3 px-3 py-10">
            <LogoTraceLoader loading size={36} strokeWidth={48} ariaLabel={t("search.searching")} />
            <p className="text-sm text-muted-foreground">{t("search.searching")}</p>
          </div>
        )}

        {query.trim() && !loading && results.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {t("search.none", { query })}
          </p>
        )}

        {results.map((product, index) => (
          <button
            key={product.id}
            type="button"
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors",
              index === selectedIndex ? "bg-muted" : "hover:bg-muted/70",
            )}
            onClick={() => goToResult(product)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
              <Image
                src={product.images[0]}
                alt=""
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{product.name}</p>
              {product.brand ? (
                <p className="truncate text-xs text-muted-foreground">{product.brand}</p>
              ) : null}
            </div>
            <p className="shrink-0 text-sm font-medium">
              <StoreMoney amount={product.price} currency={active.currency} locale={active.code} />
            </p>
          </button>
        ))}
      </div>

      {query.trim() ? (
        <div className="border-t px-3 py-2">
          <button
            type="button"
            onClick={goToShop}
            className="w-full rounded-lg px-3 py-2 text-center text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t("search.viewAll", { query: query.trim() })}
          </button>
        </div>
      ) : null}
    </div>
  );

  if (variant === "panel") {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-xl",
          className,
        )}
      >
        {panel}
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setResults([]);
          setSelectedIndex(-1);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("search.aria")}
          className={className}
        >
          <SearchIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="top-[12%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t("search.title")}</DialogTitle>
          <DialogDescription>{t("search.description")}</DialogDescription>
        </DialogHeader>
        {panel}
        <div className="flex items-center justify-between border-t px-4 py-2 text-[11px] text-muted-foreground">
          <span>
            <kbd className="rounded border bg-muted px-1 py-0.5 font-medium">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="rounded border bg-muted px-1 py-0.5 font-medium">esc</kbd> close
          </span>
          <span>
            <kbd className="rounded border bg-muted px-1 py-0.5 font-medium">⌘K</kbd> open
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
