import { NextRequest, NextResponse } from "next/server";
import { createWooOrder, fetchWooOrders } from "@/lib/woocommerce";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const per_page = Number(searchParams.get("per_page") || 20);
  const search = searchParams.get("search") || undefined;
  try {
    const orders = await fetchWooOrders({ per_page, search });
    return NextResponse.json(orders);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const order = await createWooOrder(body);
    return NextResponse.json(order);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}


