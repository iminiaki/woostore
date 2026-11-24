"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HeroSlide } from "@/types";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 5500;
const SWIPE_THRESHOLD = 48;

export function HomeHero({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [progressOn, setProgressOn] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const swipeRef = useRef<{
    x: number;
    y: number;
    axis: "h" | "v" | null;
  } | null>(null);

  const count = slides.length;
  const safeIndex = count > 0 ? ((index % count) + count) % count : 0;
  const active = slides[safeIndex];

  const goTo = useCallback(
    (next: number) => {
      if (count <= 1) return;
      const target = ((next % count) + count) % count;
      setIndex(target);
      setProgressOn(false);
      requestAnimationFrame(() => setProgressOn(true));
    },
    [count],
  );

  const goPrev = useCallback(() => {
    if (count <= 1) return;
    setIndex((current) => ((current - 1) % count + count) % count);
    setProgressOn(false);
    requestAnimationFrame(() => setProgressOn(true));
  }, [count]);

  const goNext = useCallback(() => {
    if (count <= 1) return;
    setIndex((current) => (current + 1) % count);
    setProgressOn(false);
    requestAnimationFrame(() => setProgressOn(true));
  }, [count]);

  // Autoplay via timeout — more reliable than rAF on iOS
  useEffect(() => {
    if (count <= 1 || !progressOn) return;
    const id = window.setTimeout(() => {
      setIndex((current) => (current + 1) % count);
    }, INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [safeIndex, count, progressOn]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      gsap.from(".hero-copy > *", {
        opacity: 0,
        y: 16,
        duration: 0.55,
        stagger: 0.07,
        delay: 0.08,
        ease: "power2.out",
        clearProps: "all",
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const firstSlidePass = useRef(true);
  useEffect(() => {
    if (firstSlidePass.current) {
      firstSlidePass.current = false;
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-dynamic",
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: "power2.out", clearProps: "all" },
      );
    }, sectionRef);
    return () => ctx.revert();
  }, [safeIndex]);

  // Native touch listeners so horizontal swipe wins over scroll when intentional
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || count <= 1) return;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      swipeRef.current = { x: t.clientX, y: t.clientY, axis: null };
    };

    const onMove = (e: TouchEvent) => {
      const s = swipeRef.current;
      const t = e.touches[0];
      if (!s || !t) return;
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (!s.axis) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        s.axis = Math.abs(dx) > Math.abs(dy) * 1.1 ? "h" : "v";
      }
      if (s.axis === "h") {
        e.preventDefault();
      }
    };

    const onEnd = (e: TouchEvent) => {
      const s = swipeRef.current;
      swipeRef.current = null;
      if (!s || s.axis !== "h") return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - s.x;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      if (dx < 0) goNext();
      else goPrev();
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [count, goNext, goPrev]);

  if (!active) return null;

  return (
    <section
      ref={sectionRef}
      className="relative isolate min-h-[100dvh] touch-pan-y overflow-hidden md:min-h-[100dvh]"
      style={{
        // Bleed behind iOS status bar + home indicator (needs apple-mobile-web-app-capable + black-translucent).
        marginTop: "calc(-1 * env(safe-area-inset-top, 0px))",
        paddingTop: "env(safe-area-inset-top, 0px)",
        minHeight: "calc(100dvh + env(safe-area-inset-top, 0px))",
      }}
    >
      <div className="absolute inset-0 -z-10">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-500 ease-out",
              i === safeIndex ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            aria-hidden={i !== safeIndex}
          >
            <Image
              src={slide.desktopImage}
              alt=""
              fill
              priority={i === 0}
              className="hidden object-cover object-center md:block"
              sizes="100vw"
            />
            <Image
              src={slide.mobileImage}
              alt=""
              fill
              priority={i === 0}
              className="block object-cover object-[center_20%] md:hidden"
              sizes="100vw"
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20 md:hidden" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-background/70 via-background/35 to-transparent dark:from-background/75 dark:via-background/40 dark:to-transparent md:block" />
        <div className="absolute inset-0 hidden bg-gradient-to-t from-background/50 via-transparent to-background/15 md:block" />
      </div>

      <div className="mx-auto flex min-h-[100dvh] max-w-7xl items-end px-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))] pt-[calc(5.5rem+env(safe-area-inset-top))] sm:pb-28 md:items-center md:pb-28 md:pt-24">
        <div className="hero-copy relative z-10 w-full max-w-xl space-y-5 sm:space-y-7">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Image
              src="/logo_dark.png"
              alt=""
              width={44}
              height={44}
              priority
              className="h-9 w-9 sm:h-11 sm:w-11 dark:hidden"
            />
            <Image
              src="/logo_light.png"
              alt=""
              width={44}
              height={44}
              priority
              className="hidden h-9 w-9 sm:h-11 sm:w-11 dark:block"
            />
            <span className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
              Lastore
            </span>
          </div>

          <div className="h-px w-12 origin-left bg-foreground/40 sm:w-14" />

          <h1
            key={`title-${active.id}`}
            className="hero-dynamic text-[2rem] leading-[1.1] font-semibold tracking-tight text-balance whitespace-pre-line sm:text-5xl md:text-6xl md:leading-[1.05]"
          >
            {active.title}
          </h1>

          {active.description ? (
            <p
              key={`desc-${active.id}`}
              className="hero-dynamic max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg"
            >
              {active.description}
            </p>
          ) : null}

          <div
            key={`cta-${active.id}`}
            className="hero-dynamic flex w-full flex-col gap-2.5 pt-1 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-3"
          >
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={active.primaryButton.href}>{active.primaryButton.label}</Link>
            </Button>
            {active.secondaryButton ? (
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full border-foreground/20 bg-background/50 backdrop-blur-sm sm:w-auto"
              >
                <Link href={active.secondaryButton.href}>{active.secondaryButton.label}</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {count > 1 ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-between px-4 md:flex md:px-6">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous slide"
              className="pointer-events-auto text-foreground/50 transition hover:text-foreground"
            >
              <ChevronLeft className="h-8 w-8 stroke-[1.25]" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next slide"
              className="pointer-events-auto text-foreground/50 transition hover:text-foreground"
            >
              <ChevronRight className="h-8 w-8 stroke-[1.25]" />
            </button>
          </div>

          <div
            className="absolute inset-x-0 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-10 flex items-center justify-center gap-2 md:bottom-8"
            role="tablist"
            aria-label="Hero slides"
          >
            {slides.map((slide, i) => {
              const isActive = i === safeIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => goTo(i)}
                  className={cn(
                    "relative overflow-hidden rounded-full bg-foreground/30 transition-[width] duration-300",
                    isActive ? "h-1.5 w-8 sm:w-10" : "h-1.5 w-1.5",
                  )}
                >
                  {isActive && progressOn ? (
                    <span
                      key={`fill-${safeIndex}`}
                      className="absolute inset-y-0 left-0 rounded-full bg-foreground"
                      style={{
                        width: "0%",
                        animation: `hero-progress ${INTERVAL_MS}ms linear forwards`,
                      }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
