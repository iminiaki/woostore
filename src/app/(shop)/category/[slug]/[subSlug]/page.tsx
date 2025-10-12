import { notFound } from "next/navigation";
import { Filters } from "@/components/filters";
import { FilterModal } from "@/components/filter-modal";
import { ProductGrid } from "@/components/product-grid";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { filterProducts, parseQuery } from "@/lib/shop";
import { fetchWooCategories, fetchWooProducts, fetchWooFilterOptions } from "@/lib/woocommerce";

export default async function SubCategoryPage({ params, searchParams }: {
  params: Promise<{ slug: string; subSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug, subSlug } = await params;
  const safeDecode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
  const slugNorm = safeDecode(slug).toLowerCase();
  const subNorm = safeDecode(subSlug).toLowerCase();
  const sp = await searchParams;

  const cats = await fetchWooCategories();
  const category = cats.find((c) => (c.slug === slug) || (safeDecode(c.slug).toLowerCase() === slugNorm));
  if (!category) return notFound();

  const subCategory = category.subCategories.find((s) => (s.slug === subSlug) || (safeDecode(s.slug).toLowerCase() === subNorm));
  if (!subCategory) return notFound();

  const query = parseQuery({ ...sp, category: category.slug, subCategory: subCategory.slug });
  const wooProducts = await fetchWooProducts({ per_page: 50, categoryId: Number(category.id) });
  const products = filterProducts(wooProducts, query);
  const priceMax = products.length ? Math.max(...products.map((p) => p.price)) : 0;

  const { brands, materials, colors, sizes } = await fetchWooFilterOptions();
  const groups = [
    { key: "brand", title: "Brand", options: brands },
    { key: "material", title: "Material", options: materials },
    { key: "color", title: "Color", options: colors },
    { key: "size", title: "Size", options: sizes },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-6">
        <Breadcrumbs 
          items={[
            { label: "Shop", href: "/shop" },
            { label: category.name, href: `/category/${category.slug}` },
            { label: subCategory.name }
          ]} 
        />
      </div>
      <div className="grid gap-10 md:grid-cols-[260px_1fr]">
        <aside className="hidden md:block md:sticky md:top-20 h-max">
          <Filters groups={groups} priceMax={priceMax} />
        </aside>
        <section className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold capitalize">{subCategory.name}</h1>
              <p className="text-muted-foreground">Browse {subCategory.name.toLowerCase()} in {category.name.toLowerCase()}</p>
            </div>
            <FilterModal groups={groups} priceMax={priceMax} />
          </div>
          <ProductGrid products={products} />
        </section>
      </div>
    </div>
  );
}
