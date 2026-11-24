import Link from "next/link";
import { notFound } from "next/navigation";
import { Filters } from "@/components/filters";
import { FilterModal } from "@/components/filter-modal";
import { ProductGrid } from "@/components/product-grid";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getStoreCategories, getStoreProducts, resolveStoreFilters } from "@/lib/catalog";
import { PageShell } from "@/components/page-shell";

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

  return (
    <PageShell>
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: "Shop", href: "/shop" },
            { label: category.name },
          ]}
        />
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {category.subCategories.map((sub) => (
          <Link
            key={sub.id}
            href={`/category/${category.slug}/${sub.slug}`}
            className="rounded-full border px-3 py-1 text-sm hover:bg-accent"
          >
            {sub.name}
          </Link>
        ))}
      </div>
      <div className="grid gap-10 md:grid-cols-[260px_1fr]">
        <aside className="hidden md:block md:sticky md:top-[5.5rem] h-max">
          <Filters
            groups={groups}
            priceMax={priceMax}
            categoryOptions={[{ label: category.name, value: category.slug }]}
            subOptionsByCategory={subOptionsByCategory}
          />
        </aside>
        <section className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{category.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {products.length} product{products.length !== 1 ? "s" : ""}
              </p>
            </div>
            <FilterModal
              groups={groups}
              priceMax={priceMax}
              categoryOptions={[{ label: category.name, value: category.slug }]}
              subOptionsByCategory={subOptionsByCategory}
            />
          </div>
          <ProductGrid products={products} />
        </section>
      </div>
    </PageShell>
  );
}
