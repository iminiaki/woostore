import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function ShopCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16" aria-labelledby="shop-cta-title">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-border/80 bg-muted/40">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(ellipse_at_top,var(--foreground),transparent_68%)] opacity-[0.06]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent"
        />
        <span aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-80 rounded-full border border-foreground/20" />
        <span aria-hidden className="pointer-events-none absolute -top-8 -right-4 size-44 rounded-full border border-foreground/15" />
        <span aria-hidden className="pointer-events-none absolute -bottom-20 right-10 size-56 rounded-full bg-foreground/10 blur-2xl" />
        <span aria-hidden className="pointer-events-none absolute bottom-0 -left-16 size-56 rounded-full bg-foreground/[0.06] blur-3xl" />
        <div className="relative flex flex-col gap-6 px-6 py-8 sm:px-10 sm:py-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 id="shop-cta-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Find a piece you’ll wear on repeat
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Minimal clothes, cut to last. Start with what just arrived.
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
          >
            Shop the collection
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
