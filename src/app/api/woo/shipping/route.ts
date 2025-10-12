import { NextRequest, NextResponse } from "next/server";
import { getWooEnv } from "@/lib/woocommerce";

// Minimal proxy to Woo shipping zones/methods (read-only)
export async function GET(req: NextRequest) {
  try {
    const { baseUrl, consumerKey, consumerSecret } = getWooEnv();
    const url = `${baseUrl.replace(/\/$/, "")}/wp-json/wc/v3/shipping/zones?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const zones = await res.json();
    return NextResponse.json(zones);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}


