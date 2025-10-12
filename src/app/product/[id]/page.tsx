import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { fetchWooProduct } from "@/lib/woocommerce";
import { ProductDetail } from "@/components/product-detail";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await fetchWooProduct(id);
  if (!product) return notFound();
  const decodeSafe = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
  const categoryLabel = product.category ? decodeSafe(product.category) : "category";
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-6">
        <Breadcrumbs 
          items={[
            { label: "Shop", href: "/shop" },
            { label: categoryLabel, href: `/category/${product.category}` },
            { label: product.name }
          ]} 
        />
      </div>
      <ProductDetail product={product} />
    </div>
  );
}


