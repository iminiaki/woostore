import Image from "next/image";
import { LocaleLink as Link } from "@/components/locale-link";
import { HomeHero } from "@/components/home-hero";
import { CategoryCarousel } from "@/components/category-carousel";
import { ProductCardCarousel } from "@/components/product-card-carousel";
import { TrustBadges } from "@/components/trust-badges";
import { ShopCta } from "@/components/shop-cta";
import { getStoreCategories, getStoreHeroSlides, getStoreProducts } from "@/lib/catalog";
import { getTranslator } from "@/i18n/website";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { t } = await getTranslator();
  const [products, categories, heroSlides] = await Promise.all([
    getStoreProducts(),
    getStoreCategories(),
    getStoreHeroSlides(),
  ]);
  const newest = products.slice(0, 12);
  const newArrivals = products.filter((p) => p.newArrival).slice(0, 12);
  const homeNew = newArrivals.length ? newArrivals : newest;
  const clearance = products.filter((p) => p.clearance).slice(0, 12);

  return (
    <div className="space-y-20">
      <HomeHero slides={heroSlides} />

      <TrustBadges />

      <CategoryCarousel
        title={t("home.categories")}
        categories={categories}
        viewAllHref="/shop"
      />

      <ProductCardCarousel
        title={t("home.newArrivals")}
        products={homeNew}
        viewAllHref="/shop?sort=newest"
        className="mx-auto mt-0 max-w-7xl px-4"
      />

      <section className="mx-auto max-w-7xl px-4">
        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              title: t("home.mens"),
              subtitle: t("home.mensSubtitle"),
              image: "/product images/man banner.jpg",
              href: "/category/men",
            },
            {
              title: t("home.womens"),
              subtitle: t("home.womensSubtitle"),
              image: "/product images/woman banner.jpg",
              href: "/category/women",
            },
          ].map((item) => (
            <Link href={item.href} key={item.href}>
              <div className="group relative cursor-pointer overflow-hidden rounded-2xl bg-muted transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl">
                <div className="relative aspect-[4/3]">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
                </div>
                <div className="absolute inset-0 flex flex-col justify-end p-8">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white drop-shadow-lg">{item.title}</h3>
                    <p className="text-sm font-medium text-white/90 drop-shadow-md">{item.subtitle}</p>
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-sm font-medium text-white/80">{t("home.shopNow")}</span>
                      <svg
                        className="h-4 w-4 text-white/80 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="absolute top-4 right-4">
                  <div className="rounded-full bg-white/20 px-3 py-1 backdrop-blur-sm">
                    <span className="text-xs font-medium text-white">{t("home.newBadge")}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <ProductCardCarousel
        title={t("home.clearance")}
        products={clearance}
        viewAllHref="/shop?clearance=1"
        className="mx-auto mt-0 max-w-7xl px-4"
      />

      <ShopCta />
    </div>
  );
}
