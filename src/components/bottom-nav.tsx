"use client";

import { Home, Search, User, ShoppingBag } from "lucide-react";
import { LocaleLink as Link } from "@/components/locale-link";
import { useStandalone } from "@/hooks/use-standalone";
import { useI18n } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

/** Outer radius − padding = inner radius (concentric corners). */
const DECK_RADIUS = "1.75rem";
const DECK_PAD = "0.375rem";

export function BottomNav() {
  const standalone = useStandalone();
  const { t, path } = useI18n();
  const navItems = [
    { href: "/", label: t("nav.home"), icon: Home },
    { href: "/search", label: t("nav.search"), icon: Search },
    { href: "/shop", label: t("nav.shop"), icon: ShoppingBag },
    { href: "/profile", label: t("nav.profile"), icon: User },
  ];

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 md:hidden"
      style={{
        // Home-screen: pin near the physical bottom (home indicator overlays the gap).
        // Safari: keep clear of the home indicator.
        paddingBottom: standalone
          ? "0.9rem"
          : "max(0.75rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <nav
        style={{ borderRadius: DECK_RADIUS, padding: DECK_PAD }}
        className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-1 border border-white/20 bg-background/55 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/40 dark:border-white/10 dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
        aria-label="Mobile"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? path === "/"
              : path === item.href || path.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              style={{ borderRadius: `calc(${DECK_RADIUS} - ${DECK_PAD})` }}
              className={cn(
                "flex flex-1 items-center justify-center py-2.5 transition-colors",
                isActive
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground active:bg-foreground/5",
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.25]")} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
