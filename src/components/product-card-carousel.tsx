"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { scrollCarouselToIndex, useCarouselActive } from "@/hooks/use-carousel-active";
import type { Product } from "@/types";
import { cn } from "@/lib/utils";

const DESKTOP_VISIBLE = 4;

type Props = {
  title: string;
  products: Product[];
  viewAllHref?: string;
  className?: string;
};

export function ProductCardCarousel({ title, products, viewAllHref, className }: Props) {
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [desktopActive, setDesktopActive] = useState(0);
  const [mounted, setMounted] = useState(false);

  const count = products.length;
  const mobileActive = useCarouselActive(mobileRef, count);
  const showDesktopControls = count > DESKTOP_VISIBLE;
  const showMobileDots = count > 1;
  const desktopPages = Math.max(1, count - DESKTOP_VISIBLE + 1);

  useEffect(() => {
    setMounted(true);
  }, []);

  const syncDesktop = useCallback(() => {
    const el = desktopRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < max - 4);
    if (max <= 0) {
      setDesktopActive(0);
      return;
    }
    const card = el.querySelector<HTMLElement>(":scope > div");
    const step = card ? card.offsetWidth + 16 : el.clientWidth;
    const idx = Math.round(el.scrollLeft / step);
    setDesktopActive(Math.min(desktopPages - 1, Math.max(0, idx)));
  }, [desktopPages]);

  useEffect(() => {
    if (!showDesktopControls) return;
    const el = desktopRef.current;
    if (!el) return;
    syncDesktop();
    el.addEventListener("scroll", syncDesktop, { passive: true });
    const ro = new ResizeObserver(syncDesktop);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", syncDesktop);
      ro.disconnect();
    };
  }, [showDesktopControls, syncDesktop, products.length]);

  const scrollDesktop = (dir: -1 | 1) => {
    const el = desktopRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(":scope > div");
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.75;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const goDesktopPage = (page: number) => {
    const el = desktopRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(":scope > div");
    const step = card ? card.offsetWidth + 16 : el.clientWidth;
    el.scrollTo({ left: page * step, behavior: "smooth" });
  };

  if (!products.length) return null;

  return (
    <section className={cn("mt-16 space-y-6", className)}>
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <div className="flex items-center gap-3">
          {viewAllHref ? (
            <Link
              href={viewAllHref}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          ) : null}
          {showDesktopControls && (
            <div className="hidden items-center gap-2 md:flex">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 rounded-full"
                disabled={!canPrev}
                aria-label="Previous products"
                onClick={() => scrollDesktop(-1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 rounded-full"
                disabled={!canNext}
                aria-label="Next products"
                onClick={() => scrollDesktop(1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="md:hidden">
        <div
          ref={mobileRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((p) => (
            <div key={p.id} className="w-[72%] max-w-[280px] shrink-0 snap-center">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
        {showMobileDots && (
          <div className="mt-4 flex items-center justify-center gap-1.5" role="tablist" aria-label="Products">
            {products.map((p, i) => {
              const active = !mounted ? i === 0 : i === mobileActive;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`Product ${i + 1}`}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    active ? "h-1.5 w-5 bg-foreground" : "h-1.5 w-1.5 bg-foreground/25",
                  )}
                  onClick={() => scrollCarouselToIndex(mobileRef.current, i)}
                />
              );
            })}
          </div>
        )}
      </div>

      {showDesktopControls ? (
        <div className="hidden md:block">
          <div
            ref={desktopRef}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {products.map((p) => (
              <div
                key={p.id}
                className="w-[calc((100%-3*1rem)/4)] shrink-0 snap-start"
              >
                <ProductCard product={p} />
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-center gap-1.5" role="tablist" aria-label="Product pages">
            {Array.from({ length: desktopPages }, (_, i) => {
              const active = !mounted ? i === 0 : i === desktopActive;
              return (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`Page ${i + 1}`}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    active ? "h-1.5 w-5 bg-foreground" : "h-1.5 w-1.5 bg-foreground/20",
                  )}
                  onClick={() => goDesktopPage(i)}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="hidden md:grid md:grid-cols-4 md:gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
