"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scrollCarouselToIndex, useCarouselActive } from "@/hooks/use-carousel-active";
import { cn } from "@/lib/utils";

const DESKTOP_VISIBLE = 4;

type Props<T> = {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  title?: string;
  viewAllHref?: string;
  className?: string;
  previousLabel: string;
  nextLabel: string;
  itemLabel: (index: number) => string;
  pagesLabel?: string;
  /** Smallest item count that uses the mobile snap carousel. */
  mobileFrom?: number;
  desktopGridClassName?: string;
  /** Header keeps arrows beside the title. Edges centers them on the card row. */
  arrowPlacement?: "header" | "edges";
};

/** Homepage snap carousel: scroll after 4 cards on desktop, and after 1 on mobile. */
export function HomeCarousel<T>({
  items,
  getKey,
  renderItem,
  title,
  viewAllHref,
  className,
  previousLabel,
  nextLabel,
  itemLabel,
  pagesLabel = "Pages",
  mobileFrom = 1,
  desktopGridClassName = "hidden md:grid md:grid-cols-4 md:gap-4",
  arrowPlacement = "header",
}: Props<T>) {
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [desktopActive, setDesktopActive] = useState(0);
  const [mounted, setMounted] = useState(false);

  const count = items.length;
  const mobileActive = useCarouselActive(mobileRef, count);
  const showDesktopControls = count > DESKTOP_VISIBLE;
  const useMobileSnap = count >= mobileFrom;
  const showMobileDots = useMobileSnap && count > 1;
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
  }, [showDesktopControls, syncDesktop, count]);

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

  if (!count) return null;

  const arrowsInHeader = arrowPlacement === "header" && showDesktopControls;
  const showHeader = Boolean(title || viewAllHref || arrowsInHeader);

  return (
    <section className={className}>
      {showHeader ? (
        <div className="flex items-end justify-between gap-4">
          {title ? <h2 className="text-2xl font-semibold">{title}</h2> : <span />}
          <div className="flex items-center gap-3">
            {viewAllHref ? (
              <Link
                href={viewAllHref}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                View all
              </Link>
            ) : null}
            {arrowsInHeader ? (
              <div className="hidden items-center gap-2 md:flex">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-full"
                  disabled={!canPrev}
                  aria-label={previousLabel}
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
                  aria-label={nextLabel}
                  onClick={() => scrollDesktop(1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {useMobileSnap ? (
        <div className="md:hidden">
          <div
            ref={mobileRef}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item) => (
              <div key={getKey(item)} className="w-[72%] max-w-[280px] shrink-0 snap-center">
                {renderItem(item)}
              </div>
            ))}
          </div>
          {showMobileDots ? (
            <div className="mt-4 flex items-center justify-center gap-1.5" role="tablist" aria-label={title || "Items"}>
              {items.map((item, i) => {
                const active = !mounted ? i === 0 : i === mobileActive;
                return (
                  <button
                    key={getKey(item)}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={itemLabel(i)}
                    className={cn(
                      "rounded-full transition-all duration-300",
                      active ? "h-1.5 w-5 bg-foreground" : "h-1.5 w-1.5 bg-foreground/25",
                    )}
                    onClick={() => scrollCarouselToIndex(mobileRef.current, i)}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {items.map((item) => (
            <div key={getKey(item)}>{renderItem(item)}</div>
          ))}
        </div>
      )}

      {showDesktopControls ? (
        <div className="hidden md:block">
          <div className="relative">
            <div
              ref={desktopRef}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {items.map((item) => (
                <div key={getKey(item)} className="w-[calc((100%-3*1rem)/4)] shrink-0 snap-start">
                  {renderItem(item)}
                </div>
              ))}
            </div>
            {arrowPlacement === "edges" && canPrev ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={previousLabel}
                onClick={() => scrollDesktop(-1)}
                className="absolute top-1/2 left-3 z-10 size-9 -translate-y-1/2 rounded-full border-border/80 bg-background/90 shadow-sm backdrop-blur-sm"
              >
                <ChevronLeft className="size-4" />
              </Button>
            ) : null}
            {arrowPlacement === "edges" && canNext ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={nextLabel}
                onClick={() => scrollDesktop(1)}
                className="absolute top-1/2 right-3 z-10 size-9 -translate-y-1/2 rounded-full border-border/80 bg-background/90 shadow-sm backdrop-blur-sm"
              >
                <ChevronRight className="size-4" />
              </Button>
            ) : null}
          </div>
          <div className="mt-5 flex items-center justify-center gap-1.5" role="tablist" aria-label={pagesLabel}>
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
        <div className={desktopGridClassName}>
          {items.map((item) => (
            <div key={getKey(item)}>{renderItem(item)}</div>
          ))}
        </div>
      )}
    </section>
  );
}
