import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-context";
import { CartProvider } from "@/components/cart-store";
import { WishlistProvider } from "@/components/wishlist-store";
import { SiteHeader } from "@/components/site-header";
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
  viewportFit: "cover",
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
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
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
                <SiteHeader />
                <main className="min-h-[calc(100vh-4rem)] pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
                  {children}
                </main>
                <SiteFooter />
                <BottomNav />
                <Toaster />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
