import { NextResponse } from "next/server"

import { loadCustomerOrders } from "@/lib/customer-orders"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase() || ""
  if (!email.includes("@")) {
    return NextResponse.json({ error: "A customer email is required." }, { status: 400 })
  }

  try {
    const orders = await loadCustomerOrders(email)
    return NextResponse.json({ orders })
  } catch (error) {
    console.error("account orders", error)
    return NextResponse.json({ error: "Could not load orders." }, { status: 500 })
  }
}
