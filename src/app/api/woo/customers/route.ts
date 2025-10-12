import { NextRequest, NextResponse } from "next/server";
import { getWooEnv } from "@/lib/woocommerce";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { baseUrl, consumerKey, consumerSecret } = getWooEnv();
    const url = `${baseUrl.replace(/\/$/, "")}/wp-json/wc/v3/customers?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, ...rest } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const { baseUrl, consumerKey, consumerSecret } = getWooEnv();
    const url = `${baseUrl.replace(/\/$/, "")}/wp-json/wc/v3/customers/${id}?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
    const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rest) });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}


