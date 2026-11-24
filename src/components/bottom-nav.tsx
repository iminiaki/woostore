"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, User, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/profile", label: "Profile", icon: User },
];

/** Outer radius − padding = inner radius (concentric corners). */
const DECK_RADIUS = "1.75rem";
const DECK_PAD = "0.375rem";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <nav
        style={{ borderRadius: DECK_RADIUS, padding: DECK_PAD }}
        className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-1 border border-white/20 bg-background/55 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/40 dark:border-white/10 dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
        aria-label="Mobile"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

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
