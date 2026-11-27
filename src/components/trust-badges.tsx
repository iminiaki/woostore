import { BadgeCheck, Package, ShieldCheck, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLocaleNumber } from "@/i18n/languages";
import { getTranslator } from "@/i18n/website";
import type { MessageKey } from "@/i18n/messages";

const badgeKeys = [
  { icon: ShieldCheck, title: "trust.secure.title", detail: "trust.secure.detail" },
  { icon: Truck, title: "trust.updates.title", detail: "trust.updates.detail" },
  { icon: Package, title: "trust.packed.title", detail: "trust.packed.detail" },
  { icon: BadgeCheck, title: "trust.lasting.title", detail: "trust.lasting.detail" },
] as const satisfies ReadonlyArray<{
  icon: typeof ShieldCheck;
  title: MessageKey;
  detail: MessageKey;
}>;

export async function TrustBadges() {
  const { t, active } = await getTranslator();
  const badges = badgeKeys.map((badge) => ({
    ...badge,
    title: t(badge.title),
    detail: t(badge.detail),
  }));
  const last = badges.length - 1;
  const rule =
    "pointer-events-none absolute z-10 from-transparent via-foreground/40 to-transparent";

  return (
    <section className="mx-auto max-w-7xl px-4" aria-label={t("trust.aria")}>
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
                      "top-1/2 end-0 hidden h-8 w-px -translate-y-1/2 rtl:-translate-x-1/2 ltr:translate-x-1/2 bg-gradient-to-b",
                      index % 2 === 0 && "sm:max-lg:block",
                      "lg:block",
                    )}
                  />
                </>
              ) : null}
              <span
                aria-hidden
                className="pointer-events-none absolute top-5 end-5 text-4xl font-semibold tracking-tight text-foreground/[0.06] sm:text-5xl"
              >
                {formatLocaleNumber(index + 1, active.code, { minimumIntegerDigits: 2 })}
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
