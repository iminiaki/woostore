"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ShoppingBag, User2 } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { useCart } from "./cart-store";
import { useAuth } from "./auth-context";
import { useStandalone } from "@/hooks/use-standalone";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "./search";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/shop", label: "Shop" },
  // { href: "/blog", label: "Blog" }, // temporarily hidden
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const { totalQuantity } = useCart();
  const { isAuthenticated } = useAuth();
  const standalone = useStandalone();

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setScrolled(y > 16);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Home at top: clear glass. Otherwise / scrolled: solid frosted dock.
  const clearGlass = isHome && !scrolled;

  return (
    <>
      {/*
        Fixed shell stays empty in the iOS status-bar zone.
        Blur only on the dock below safe-area.
      */}
      <header
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-50",
          clearGlass ? "md:px-0" : "md:px-4",
        )}
      >
        <div
          className={cn(
            "pointer-events-auto mx-auto w-full max-w-7xl px-3 md:px-0",
            // Mobile: below status bar. Desktop home clear: flush top.
            clearGlass
              ? "mt-[max(0.5rem,env(safe-area-inset-top,0px))] md:mt-0"
              : "mt-[max(0.5rem,env(safe-area-inset-top,0px))] md:mt-4",
          )}
        >
          <div
            className={cn(
              "mx-auto flex h-14 w-full items-center px-3 transition-[background-color,box-shadow,border-radius,backdrop-filter,border-color,height] duration-300 sm:h-16 sm:px-4",
              clearGlass
                ? standalone
                  ? "rounded-2xl border border-white/15 bg-background/55 shadow-none backdrop-blur-md supports-[backdrop-filter]:bg-background/40 md:rounded-none md:border-transparent md:bg-transparent md:px-4 md:backdrop-blur-none md:supports-[backdrop-filter]:bg-transparent"
                  : "rounded-2xl border border-white/15 bg-background/25 shadow-none backdrop-blur-xl supports-[backdrop-filter]:bg-background/20 md:rounded-none md:border-transparent md:bg-transparent md:px-4 md:backdrop-blur-none md:supports-[backdrop-filter]:bg-transparent"
                : "rounded-2xl border border-white/25 bg-background/65 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/50 dark:border-white/10 dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
            )}
          >
            <div className="flex flex-1 items-center gap-8 md:gap-12">
              <Link href="/" className="flex items-center" aria-label="Lastore home">
                <Image
                  src="/logo_dark.png"
                  alt="Lastore"
                  width={36}
                  height={36}
                  priority
                  className="block h-8 w-8 dark:hidden sm:h-9 sm:w-9"
                />
                <Image
                  src="/logo_light.png"
                  alt="Lastore"
                  width={36}
                  height={36}
                  priority
                  className="hidden h-8 w-8 dark:block sm:h-9 sm:w-9"
                />
              </Link>
              <nav className="hidden gap-6 md:flex">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm text-black transition-opacity hover:opacity-70 dark:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center justify-end gap-0.5 sm:gap-2">
              <Search />
              <Link
                href={isAuthenticated ? "/profile" : "/auth/login"}
                aria-label="Profile"
                className="hidden md:block"
              >
                <Button variant="ghost" size="icon">
                  <User2 className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/cart" className="relative" aria-label="Cart">
                <Button variant="ghost" size="icon">
                  <ShoppingBag className="h-5 w-5" />
                </Button>
                {totalQuantity > 0 && (
                  <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
                    {totalQuantity}
                  </Badge>
                )}
              </Link>
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer: home overlays hero; other pages clear the floating bar */}
      <div
        className={cn(
          isHome
            ? "h-0"
            : "h-[calc(4.5rem+env(safe-area-inset-top))] md:h-[5.5rem]",
        )}
        aria-hidden
      />
    </>
  );
}
