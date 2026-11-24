import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NotFoundView } from "@/components/not-found-view";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-context";
import { CartProvider } from "@/components/cart-store";
import { WishlistProvider } from "@/components/wishlist-store";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BottomNav } from "@/components/bottom-nav";
import { ThemeFavicon } from "@/components/theme-favicon";
import "./(frontend)/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Page not found — Lastore",
  description: "This page could not be found.",
  robots: { index: false },
};

/** Full-document 404 for URLs that match no route (multi root-layout apps). */
export default function GlobalNotFound() {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <ThemeFavicon />
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <SiteHeader />
                <main className="min-h-[calc(100vh-4rem)] pb-16 md:pb-0">
                  <NotFoundView />
                </main>
                <SiteFooter />
                <BottomNav />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
