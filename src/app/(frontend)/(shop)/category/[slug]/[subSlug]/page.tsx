import { notFound } from "next/navigation";
import { Filters } from "@/components/filters";
import { FilterModal } from "@/components/filter-modal";
import { ProductGrid } from "@/components/product-grid";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getStoreCategories, getStoreProducts, resolveStoreFilters } from "@/lib/catalog";
import { PageShell } from "@/components/page-shell";

export const dynamic = "force-dynamic";

export default async function SubCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; subSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug, subSlug } = await params;
  const sp = await searchParams;
  const [allProducts, categories] = await Promise.all([
    getStoreProducts(),
    getStoreCategories(),
  ]);

  const category = categories.find((c) => c.slug === slug);
  if (!category) return notFound();

  const subCategory = category.subCategories.find((s) => s.slug === subSlug);
  if (!subCategory) return notFound();

  const archiveProducts = allProducts.filter(
    (p) => p.category === category.slug && p.subCategory === subCategory.slug,
  );
  const { groups, products, priceMax } = await resolveStoreFilters({
    allProducts,
    archiveProducts,
    searchParams: {
      ...sp,
      category: category.slug,
      subCategory: subCategory.slug,
    },
  });

  return (
    <PageShell>
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: "Shop", href: "/shop" },
            { label: category.name, href: `/category/${category.slug}` },
            { label: subCategory.name },
          ]}
        />
      </div>
      <div className="grid gap-10 md:grid-cols-[260px_1fr]">
        <aside className="hidden md:block md:sticky md:top-[5.5rem] h-max">
          <Filters groups={groups} priceMax={priceMax} />
        </aside>
        <section className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{subCategory.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {products.length} product{products.length !== 1 ? "s" : ""}
              </p>
            </div>
            <FilterModal groups={groups} priceMax={priceMax} />
          </div>
          <ProductGrid products={products} />
        </section>
      </div>
    </PageShell>
  );
}
