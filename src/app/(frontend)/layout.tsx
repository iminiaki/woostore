import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-context";
import { CartProvider } from "@/components/cart-store";
import { WishlistProvider } from "@/components/wishlist-store";
import { HeaderHeroModeProvider, SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BottomNav } from "@/components/bottom-nav";
import { Toaster } from "@/components/ui/toaster";
import { ThemeFavicon } from "@/components/theme-favicon";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  // Avoid solid black theme-color — it fights black-translucent on iOS.
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  title: {
    default: "Lastore — Clothes Store",
    template: "%s — Lastore",
  },
  description: "A minimal e-commerce clothing store built with Next.js, Tailwind CSS, and shadcn/ui.",
  icons: {
    icon: [
      { url: "/favicon-light.png", media: "(prefers-color-scheme: light)", type: "image/png" },
      { url: "/favicon-dark.png", media: "(prefers-color-scheme: dark)", type: "image/png" },
    ],
    // Opaque dark plate + white mark so the icon stays visible with iOS Dark/Tinted home-screen icons.
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Lastore",
    statusBarStyle: "black-translucent",
  },
  other: {
    // Next 16 may omit the Apple-prefixed tag; iOS needs it for translucent status bar.
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <ThemeFavicon />
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <HeaderHeroModeProvider>
                  <SiteHeader />
                  <main className="min-h-[calc(100vh-4rem)] pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
                    {children}
                  </main>
                  <SiteFooter />
                  <BottomNav />
                  <Toaster />
                </HeaderHeroModeProvider>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
