import { notFound } from "next/navigation";
import { Filters } from "@/components/filters";
import { SubcategoryCarousel } from "@/components/subcategory-carousel";
import { FilterModal } from "@/components/filter-modal";
import { FilterNavigation, FilterResults } from "@/components/filter-navigation";
import { ProductGrid } from "@/components/product-grid";
import { ShopArchiveHeader } from "@/components/shop-archive-header";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getStoreCategories, getStoreProducts, resolveStoreFilters } from "@/lib/catalog";
import { PageShell } from "@/components/page-shell";
import { getTranslator } from "@/i18n/website";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { t } = await getTranslator();
  const [allProducts, categories] = await Promise.all([
    getStoreProducts(),
    getStoreCategories(),
  ]);
  const category = categories.find((c) => c.slug === slug);
  if (!category) return notFound();

  const archiveProducts = allProducts.filter((p) => p.category === category.slug);
  const { groups, products, priceMax } = await resolveStoreFilters({
    allProducts,
    archiveProducts,
    searchParams: { ...sp, category: category.slug },
  });

  const subOptionsByCategory = {
    [category.slug]: category.subCategories.map((s) => ({ label: s.name, value: s.slug })),
  };
  const subCards = category.subCategories.map((sub) => {
    const matches = archiveProducts.filter((p) => p.subCategory === sub.slug);
    return {
      id: sub.id,
      name: sub.name,
      slug: sub.slug,
      href: `/category/${category.slug}/${sub.slug}`,
      count: matches.length,
      image: matches.find((p) => p.images[0])?.images[0] || category.image,
    };
  });

  return (
    <PageShell>
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: t("shop.title"), href: "/shop" },
            { label: category.name },
          ]}
        />
      </div>
      <SubcategoryCarousel items={subCards} />
      <FilterNavigation className="grid gap-10 md:grid-cols-[260px_1fr]">
        <aside className="hidden md:block md:sticky md:top-[5.5rem] h-max">
          <Filters
            groups={groups}
            priceMax={priceMax}
            categoryOptions={[{ label: category.name, value: category.slug }]}
            subOptionsByCategory={subOptionsByCategory}
          />
        </aside>
        <section className="space-y-6">
          <ShopArchiveHeader
            title={category.name}
            countLabel={t("shop.found", { count: products.length })}
            filter={
              <FilterModal
                groups={groups}
                priceMax={priceMax}
                categoryOptions={[{ label: category.name, value: category.slug }]}
                subOptionsByCategory={subOptionsByCategory}
              />
            }
          />
          <FilterResults>
            <ProductGrid products={products} />
          </FilterResults>
        </section>
      </FilterNavigation>
    </PageShell>
  );
}
