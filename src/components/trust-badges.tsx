import { BadgeCheck, Package, ShieldCheck, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const badges = [
  {
    icon: ShieldCheck,
    title: "Secure checkout",
    detail: "Your payment is protected from cart to confirmation.",
  },
  {
    icon: Truck,
    title: "Order updates",
    detail: "Follow packing, shipping, and delivery from your account.",
  },
  {
    icon: Package,
    title: "Packed with care",
    detail: "Each piece is checked and packed before it leaves us.",
  },
  {
    icon: BadgeCheck,
    title: "Made to last",
    detail: "Comfortable clothes in durable, everyday fabrics.",
  },
] as const;

const rule =
  "pointer-events-none absolute z-10 from-transparent via-foreground/40 to-transparent";

export function TrustBadges() {
  const last = badges.length - 1;

  return (
    <section className="mx-auto max-w-7xl px-4" aria-label="Why shop with Lastore">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-border/80 bg-muted/40">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(ellipse_at_top,var(--foreground),transparent_68%)] opacity-[0.06]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent"
        />

        <ul className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <span
            aria-hidden
            className={cn(rule, "top-1/2 left-1/2 hidden h-px w-8 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r sm:max-lg:block")}
          />
          {badges.map(({ icon: Icon, title, detail }, index) => (
            <li key={title} className="group relative px-6 py-8 sm:px-8 sm:py-10">
              {index < last ? (
                <>
                  <span
                    aria-hidden
                    className={cn(rule, "bottom-0 left-1/2 hidden h-px w-8 -translate-x-1/2 translate-y-1/2 bg-gradient-to-r max-sm:block")}
                  />
                  <span
                    aria-hidden
                    className={cn(
                      rule,
                      "top-1/2 right-0 hidden h-8 w-px -translate-y-1/2 translate-x-1/2 bg-gradient-to-b",
                      index % 2 === 0 && "sm:max-lg:block",
                      "lg:block",
                    )}
                  />
                </>
              ) : null}
              <span
                aria-hidden
                className="pointer-events-none absolute top-5 right-5 text-4xl font-semibold tracking-tight text-foreground/[0.06] sm:text-5xl"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="relative flex size-12 items-center justify-center rounded-2xl border border-border/80 bg-background/80 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] transition duration-500 group-hover:-translate-y-0.5 group-hover:border-foreground/25">
                <Icon className="size-5" strokeWidth={1.5} aria-hidden />
              </span>
              <h3 className="relative mt-5 text-base font-semibold tracking-tight sm:text-lg">
                {title}
              </h3>
              <p className="relative mt-1.5 max-w-[18rem] text-sm leading-relaxed text-muted-foreground">
                {detail}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
