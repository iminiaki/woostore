import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product-detail";
import { getStoreProductByIdOrSlug } from "@/lib/catalog";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getStoreProductByIdOrSlug(id);
  if (!product) return notFound();
  return <ProductDetail product={product} />;
}
