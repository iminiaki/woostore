import Link from "next/link";
import { notFound } from "next/navigation";
import { Filters } from "@/components/filters";
import { FilterModal } from "@/components/filter-modal";
import { ProductGrid } from "@/components/product-grid";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { filterProducts, parseQuery } from "@/lib/shop";
import { fetchWooCategories, fetchWooProducts, fetchWooFilterOptions } from "@/lib/woocommerce";

export default async function CategoryPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const cats = await fetchWooCategories();
  // Try match top-level first, then fallback to any subcategory slug (normalize decoding)
  const safeDecode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
  const slugNorm = safeDecode(slug).toLowerCase();
  const category = cats.find((c) => {
    const cNorm = safeDecode(c.slug).toLowerCase();
    return c.slug === slug || cNorm === slugNorm;
  });
  if (!category) {
    const subHit = cats.flatMap(c => c.subCategories.map(sc => ({ sc, parent: c })))
      .find(({ sc }) => {
        const scNorm = safeDecode(sc.slug).toLowerCase();
        return sc.slug === slug || scNorm === slugNorm;
      });
    if (!subHit) return notFound();
    const querySub = parseQuery({ ...sp, category: subHit.parent.slug, subCategory: subHit.sc.slug });
    const wooProductsSub = await fetchWooProducts({ per_page: 50, categoryId: Number(subHit.sc.id) });
    const productsSub = filterProducts(wooProductsSub, querySub);
    const priceMaxSub = productsSub.length ? Math.max(...productsSub.map((p) => p.price)) : 0;
    const filters = await fetchWooFilterOptions();
    const groupsSub = [
      { key: "brand", title: "Brand", options: filters.brands },
      { key: "material", title: "Material", options: filters.materials },
      { key: "color", title: "Color", options: filters.colors },
      { key: "size", title: "Size", options: filters.sizes },
    ];
    const subOptionsByCategorySub = { [subHit.parent.slug]: subHit.parent.subCategories.map(s => ({ label: s.name, value: s.slug })) } as Record<string, { label: string; value: string }[]>;
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6">
          <Breadcrumbs 
            items={[
              { label: "Shop", href: "/shop" },
              { label: subHit.parent.name, href: `/category/${subHit.parent.slug}` },
              { label: subHit.sc.name }
            ]} 
          />
        </div>
        <div className="grid gap-10 md:grid-cols-[260px_1fr]">
          <aside className="hidden md:block md:sticky md:top-20 h-max">
            <Filters groups={groupsSub} priceMax={priceMaxSub} subOptionsByCategory={subOptionsByCategorySub} />
          </aside>
          <section className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold capitalize">{subHit.sc.name}</h1>
                  <p className="text-muted-foreground">Browse {subHit.sc.name} in {subHit.parent.name}</p>
                </div>
              </div>
              <FilterModal groups={groupsSub} priceMax={priceMaxSub} subOptionsByCategory={subOptionsByCategorySub} />
            </div>
            <ProductGrid products={productsSub} />
          </section>
        </div>
      </div>
    );
  }

  // Top-level category listing: include products from this category and its subcategories
  const parent = category!;
  const ids = [Number(parent.id), ...parent.subCategories.map(sc => Number(sc.id))];
  const allProductsLists = await Promise.all(ids.map(id => fetchWooProducts({ per_page: 50, categoryId: id })));
  const merged = Object.values(
    allProductsLists.flat().reduce<Record<string, typeof allProductsLists[number][number]>>((acc, p) => {
      acc[p.id] = p; return acc;
    }, {})
  );
  const queryTop = parseQuery({ ...sp, category: parent.slug });
  const productsTop = filterProducts(merged, queryTop);
  const priceMaxTop = productsTop.length ? Math.max(...productsTop.map((p) => p.price)) : 0;
  const filtersTop = await fetchWooFilterOptions();
  const groupsTop = [
    { key: "brand", title: "Brand", options: filtersTop.brands },
    { key: "material", title: "Material", options: filtersTop.materials },
    { key: "color", title: "Color", options: filtersTop.colors },
    { key: "size", title: "Size", options: filtersTop.sizes },
  ];
  const subOptionsByCategoryTop = { [parent.slug]: parent.subCategories.map(s => ({ label: s.name, value: s.slug })) } as Record<string, { label: string; value: string }[]>;
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-6">
        <Breadcrumbs 
          items={[
            { label: "Shop", href: "/shop" },
            { label: parent.name }
          ]} 
        />
      </div>
      <div className="grid gap-10 md:grid-cols-[260px_1fr]">
        <aside className="hidden md:block md:sticky md:top-20 h-max">
          <Filters groups={groupsTop} priceMax={priceMaxTop} subOptionsByCategory={subOptionsByCategoryTop} />
        </aside>
        <section className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold capitalize">{parent.name}</h1>
                <p className="text-muted-foreground">Browse {parent.name.toLowerCase()} collection</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {parent.subCategories.map((subCategory) => (
                  <Link
                    key={subCategory.id}
                    href={`/category/${parent.slug}/${subCategory.slug}`}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-accent transition-colors capitalize"
                  >
                    {subCategory.name}
                  </Link>
                ))}
              </div>
            </div>
            <FilterModal groups={groupsTop} priceMax={priceMaxTop} subOptionsByCategory={subOptionsByCategoryTop} />
          </div>
          <ProductGrid products={productsTop} />
        </section>
      </div>
    </div>
  );
}


