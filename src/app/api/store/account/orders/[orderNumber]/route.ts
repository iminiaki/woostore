import { NextResponse } from "next/server"

import { loadCustomerOrder } from "@/lib/customer-orders"

export const dynamic = "force-dynamic"

export async function GET(req: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase() || ""
  const { orderNumber } = await context.params
  if (!email.includes("@") || !orderNumber) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 })
  }

  try {
    const order = await loadCustomerOrder(email, decodeURIComponent(orderNumber))
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 })
    return NextResponse.json({ order })
  } catch (error) {
    console.error("account order", error)
    return NextResponse.json({ error: "Could not load this order." }, { status: 500 })
  }
}
