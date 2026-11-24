"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Category } from "@/types";
import { cn } from "@/lib/utils";

const DESKTOP_VISIBLE = 4;
const MOBILE_GAP = 12;

type Props = {
  title: string;
  categories: Category[];
  viewAllHref?: string;
  className?: string;
};

export function CategoryCarousel({ title, categories, viewAllHref, className }: Props) {
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [mobileActive, setMobileActive] = useState(0);
  const [desktopActive, setDesktopActive] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const count = categories.length;
  const showDesktopControls = count > DESKTOP_VISIBLE;
  const showMobileDots = count > 1;
  const desktopPages = Math.max(1, count - DESKTOP_VISIBLE + 1);

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

  const syncMobile = useCallback(() => {
    const el = mobileRef.current;
    if (!el || count < 2) {
      setMobileActive(0);
      return;
    }
    const card = el.querySelector<HTMLElement>(":scope > div");
    if (!card) {
      setMobileActive(0);
      return;
    }
    const step = card.offsetWidth + MOBILE_GAP;
    const idx = Math.round(el.scrollLeft / step);
    setMobileActive(Math.min(count - 1, Math.max(0, idx)));
  }, [count]);

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
  }, [showDesktopControls, syncDesktop, categories.length]);

  useEffect(() => {
    const el = mobileRef.current;
    if (!el) return;
    syncMobile();
    el.addEventListener("scroll", syncMobile, { passive: true });
    const ro = new ResizeObserver(syncMobile);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", syncMobile);
      ro.disconnect();
    };
  }, [syncMobile, categories.length]);

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

  const goMobileIndex = (i: number) => {
    const el = mobileRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(":scope > div");
    if (!card) return;
    const step = card.offsetWidth + MOBILE_GAP;
    el.scrollTo({ left: i * step, behavior: "smooth" });
  };

  if (!categories.length) return null;

  const categoryCard = (c: Category) => (
    <Link href={`/category/${c.slug}`} className="block">
      <Card className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg">
        <CardContent className="p-0">
          <div className="relative aspect-square">
            <Image
              src={c.image}
              alt={c.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 72vw, 25vw"
            />
            <div className="absolute inset-0 bg-black/20 transition-colors duration-300 group-hover:bg-black/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <h3 className="mb-2 text-3xl font-bold text-white drop-shadow-lg">{c.name}</h3>
                <div className="rounded-full bg-white/90 px-4 py-2 backdrop-blur-sm">
                  <span className="text-sm font-medium text-gray-800">Shop Now</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <section className={cn("mx-auto max-w-7xl space-y-6 px-4", className)}>
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
                aria-label="Previous categories"
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
                aria-label="Next categories"
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
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((c) => (
            <div key={c.slug} className="w-[72%] max-w-[280px] shrink-0 snap-start">
              {categoryCard(c)}
            </div>
          ))}
        </div>
        {showMobileDots && (
          <div className="mt-4 flex items-center justify-center gap-1.5" role="tablist" aria-label="Categories">
            {categories.map((c, i) => {
              const active = !mounted ? i === 0 : i === mobileActive;
              return (
                <button
                  key={c.slug}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`Category ${i + 1}`}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    active ? "h-1.5 w-5 bg-foreground" : "h-1.5 w-1.5 bg-foreground/25",
                  )}
                  onClick={() => goMobileIndex(i)}
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
            {categories.map((c) => (
              <div key={c.slug} className="w-[calc((100%-3*1rem)/4)] shrink-0 snap-start">
                {categoryCard(c)}
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-center gap-1.5" role="tablist" aria-label="Category pages">
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
          {categories.map((c) => (
            <div key={c.slug}>{categoryCard(c)}</div>
          ))}
        </div>
      )}
    </section>
  );
}
