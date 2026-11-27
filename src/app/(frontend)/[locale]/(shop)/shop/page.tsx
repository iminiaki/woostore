import { Filters } from "@/components/filters";
import { FilterModal } from "@/components/filter-modal";
import { FilterNavigation, FilterResults } from "@/components/filter-navigation";
import { ProductGrid } from "@/components/product-grid";
import { ShopArchiveHeader } from "@/components/shop-archive-header";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getStoreCategories, getStoreProducts, resolveStoreFilters } from "@/lib/catalog";
import { PageShell } from "@/components/page-shell";
import { getTranslator } from "@/i18n/website";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { t } = await getTranslator();
  const [allProducts, categories] = await Promise.all([
    getStoreProducts(),
    getStoreCategories(),
  ]);

  // When a category is selected on /shop, facet within that category
  const categoryParam = typeof sp.category === "string" ? sp.category : undefined;
  const subParam = typeof sp.subCategory === "string" ? sp.subCategory : undefined;
  let archiveProducts = allProducts;
  if (categoryParam) {
    archiveProducts = archiveProducts.filter((p) => p.category === categoryParam);
  }
  if (subParam) {
    const subs = subParam.split(",").filter(Boolean);
    if (subs.length) {
      archiveProducts = archiveProducts.filter((p) => subs.includes(p.subCategory));
    }
  }

  const { query, groups, products, priceMax } = await resolveStoreFilters({
    allProducts,
    archiveProducts,
    searchParams: sp,
  });

  const categoryOptions = categories.map((c) => ({ label: c.name, value: c.slug }));
  const subOptionsByCategory = Object.fromEntries(
    categories.map((c) => [
      c.slug,
      c.subCategories.map((s) => ({ label: s.name, value: s.slug })),
    ]),
  );

  return (
    <PageShell>
      <div className="mb-6">
        <Breadcrumbs items={[{ label: t("shop.title") }]} />
      </div>
      <FilterNavigation className="grid gap-10 md:grid-cols-[260px_1fr]">
        <aside className="hidden md:block md:sticky md:top-[5.5rem] h-max">
          <Filters
            groups={groups}
            priceMax={priceMax}
            categoryOptions={categoryOptions}
            subOptionsByCategory={subOptionsByCategory}
          />
        </aside>
        <section className="space-y-6">
          <ShopArchiveHeader
            title={query.search ? t("shop.results", { query: query.search }) : t("shop.title")}
            countLabel={t("shop.found", { count: products.length })}
            filter={
              <FilterModal
                groups={groups}
                priceMax={priceMax}
                categoryOptions={categoryOptions}
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
