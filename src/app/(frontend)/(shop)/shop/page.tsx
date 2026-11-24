import { Filters } from "@/components/filters";
import { FilterModal } from "@/components/filter-modal";
import { ProductGrid } from "@/components/product-grid";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getStoreCategories, getStoreProducts, resolveStoreFilters } from "@/lib/catalog";
import { PageShell } from "@/components/page-shell";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
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
        <Breadcrumbs items={[{ label: "Shop" }]} />
      </div>
      <div className="grid gap-10 md:grid-cols-[260px_1fr]">
        <aside className="hidden md:block md:sticky md:top-[5.5rem] h-max">
          <Filters
            groups={groups}
            priceMax={priceMax}
            categoryOptions={categoryOptions}
            subOptionsByCategory={subOptionsByCategory}
          />
        </aside>
        <section className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold">
                {query.search ? `Search results for "${query.search}"` : "Shop"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {products.length} product{products.length !== 1 ? "s" : ""} found
              </p>
            </div>
            <FilterModal
              groups={groups}
              priceMax={priceMax}
              categoryOptions={categoryOptions}
              subOptionsByCategory={subOptionsByCategory}
            />
          </div>
          <ProductGrid products={products} />
        </section>
      </div>
    </PageShell>
  );
}
