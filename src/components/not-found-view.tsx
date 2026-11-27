"use client";

import Image from "next/image";
import { LocaleLink as Link } from "@/components/locale-link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { useHeroHeader } from "@/components/site-header";

export function NotFoundView() {
  useHeroHeader();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      gsap.from(".nf-copy > *", {
        opacity: 0,
        y: 16,
        duration: 0.55,
        stagger: 0.07,
        delay: 0.08,
        ease: "power2.out",
        clearProps: "all",
      });
      gsap.fromTo(
        ".nf-line",
        { scaleX: 0 },
        { scaleX: 1, duration: 0.9, ease: "power3.out", delay: 0.35 },
      );

      const digits = gsap.utils.toArray<HTMLElement>(".nf-digit");
      gsap.from(digits, {
        opacity: 0,
        y: 80,
        rotate: -6,
        duration: 1.05,
        stagger: 0.12,
        delay: 0.2,
        ease: "power3.out",
      });

      digits.forEach((digit, i) => {
        gsap.to(digit, {
          y: i % 2 === 0 ? -18 : 14,
          rotate: i % 2 === 0 ? -2.5 : 2,
          duration: 3.2 + i * 0.35,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: 1.1 + i * 0.15,
        });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative isolate min-h-[100dvh] overflow-hidden"
      style={{
        marginTop: "calc(-1 * env(safe-area-inset-top, 0px))",
        paddingTop: "env(safe-area-inset-top, 0px)",
        minHeight: "calc(100dvh + env(safe-area-inset-top, 0px))",
      }}
    >
      <div className="absolute inset-0 -z-10">
        <Image
          src="/hero.jpg"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20 md:hidden" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-background/70 via-background/35 to-transparent dark:from-background/75 dark:via-background/40 dark:to-transparent md:block" />
        <div className="absolute inset-0 hidden bg-gradient-to-t from-background/50 via-transparent to-background/15 md:block" />
      </div>

      {/* Big motioned 404 — right side on desktop, faded behind copy on mobile */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center md:justify-end md:pr-6 lg:pr-10 xl:pr-16"
      >
        <div className="nf-giant flex select-none items-baseline gap-1 font-mono font-medium tracking-tighter text-foreground/25 dark:text-foreground/30 md:gap-2 md:text-foreground/35 dark:md:text-foreground/40">
          <span className="nf-digit text-[7.5rem] leading-none sm:text-[10rem] md:text-[14rem] lg:text-[18rem] xl:text-[20rem]">
            4
          </span>
          <span className="nf-digit text-[7.5rem] leading-none sm:text-[10rem] md:text-[14rem] lg:text-[18rem] xl:text-[20rem]">
            0
          </span>
          <span className="nf-digit text-[7.5rem] leading-none sm:text-[10rem] md:text-[14rem] lg:text-[18rem] xl:text-[20rem]">
            4
          </span>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-7xl items-end px-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))] pt-[calc(5.5rem+env(safe-area-inset-top))] sm:pb-28 md:items-center md:pb-28 md:pt-24">
        <div className="nf-copy w-full max-w-xl space-y-5 sm:space-y-7">
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

          <div className="nf-line h-px w-12 origin-left bg-foreground/40 sm:w-14" />

          <h1 className="text-[2rem] leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl md:leading-[1.05]">
            This page
            <br />
            is off the rack
          </h1>

          <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
            The link may be outdated, or the piece moved. Keep browsing — something better is still
            on the floor.
          </p>

          <div className="flex w-full flex-col gap-2.5 pt-1 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-3">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/shop">Browse the shop</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full border-foreground/20 bg-background/50 backdrop-blur-sm sm:w-auto"
            >
              <Link href="/">Back home</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
