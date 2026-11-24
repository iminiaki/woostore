"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { useFadeIn, useStaggerFadeIn } from "@/lib/gsap";

export function NotFoundView() {
  useStaggerFadeIn(".nf-copy", "> *", { delay: 0.08, stagger: 0.09, y: 18, duration: 0.65 });
  useFadeIn(".nf-visual", { delay: 0.22 });

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(".nf-drift", {
        y: -14,
        duration: 3.6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      gsap.fromTo(
        ".nf-line",
        { scaleX: 0 },
        { scaleX: 1, duration: 0.9, ease: "power3.out", delay: 0.45 },
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <section className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_10%_0%,oklch(0.94_0.015_75)_0%,transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_100%,oklch(0.93_0.012_230)_0%,transparent_50%),linear-gradient(180deg,oklch(0.985_0_0)_0%,oklch(0.96_0.005_90)_100%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_10%_0%,oklch(0.28_0.02_75)_0%,transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_100%,oklch(0.24_0.02_230)_0%,transparent_50%),linear-gradient(180deg,oklch(0.145_0_0)_0%,oklch(0.18_0.01_90)_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.4] mix-blend-multiply dark:opacity-[0.25] dark:mix-blend-soft-light"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-7xl grid-cols-1 items-center gap-12 px-4 py-16 md:grid-cols-2 md:gap-16 lg:gap-20">
        <div className="nf-copy space-y-7">
          <div className="flex items-center gap-3">
            <Image
              src="/logo_dark.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 dark:hidden"
              priority
            />
            <Image
              src="/logo_light.png"
              alt=""
              width={40}
              height={40}
              className="hidden h-10 w-10 dark:block"
              priority
            />
            <span className="text-2xl font-semibold tracking-tight md:text-3xl">Lastore</span>
          </div>

          <div className="nf-line origin-left h-px w-16 bg-foreground/25" />

          <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            This page
            <br />
            is off the rack
          </h1>

          <p className="max-w-md text-base text-muted-foreground md:text-lg">
            The link may be outdated, or the piece moved. Keep browsing — something better is still on the floor.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild size="lg">
              <Link href="/shop">Browse the shop</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/">Back home</Link>
            </Button>
          </div>
        </div>

        <div className="nf-visual relative mx-auto w-full max-w-lg md:max-w-none">
          <div className="nf-drift relative aspect-[4/5] w-full overflow-hidden rounded-xl">
            <Image
              src="/product images/AExSYDNEYSWEENEY_9.webp"
              alt=""
              fill
              priority
              className="object-cover object-center scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/25 to-transparent dark:from-background/90 dark:via-background/35" />
            <div className="absolute inset-0 flex items-end justify-start p-6 md:p-8">
              <span
                aria-hidden
                className="select-none font-mono text-[6.5rem] font-medium leading-none tracking-tighter text-foreground/90 md:text-[8.5rem] lg:text-[9.5rem]"
              >
                404
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
