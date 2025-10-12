import { NextRequest, NextResponse } from "next/server";
import { fetchWooProducts, fetchWooProduct } from "@/lib/woocommerce";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    try {
      const prod = await fetchWooProduct(id);
      if (!prod) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(prod);
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
    }
  }
  const search = searchParams.get("search") || undefined;
  const per_page = Number(searchParams.get("per_page") || 6);
  const page = Number(searchParams.get("page") || 1);
  const categoryId = searchParams.get("categoryId");
  try {
    const products = await fetchWooProducts({ search, per_page, page, categoryId: categoryId ? Number(categoryId) : undefined });
    return NextResponse.json(products);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}


