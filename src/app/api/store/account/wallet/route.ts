import { NextResponse } from "next/server"

import { loadWalletAccount } from "@/lib/wallet"
import { getPayloadClient } from "@/lib/payload"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase() || ""
  if (!email.includes("@")) {
    return NextResponse.json({ error: "A customer email is required." }, { status: 400 })
  }

  try {
    const payload = await getPayloadClient()
    const wallet = await loadWalletAccount(payload, email)
    return NextResponse.json(wallet)
  } catch (error) {
    console.error("account wallet", error)
    return NextResponse.json({ error: "Could not load the wallet." }, { status: 500 })
  }
}
