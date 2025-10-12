import { NextRequest, NextResponse } from "next/server";
import { getWooEnv } from "@/lib/woocommerce";

export async function GET(_req: NextRequest) {
  try {
    const { baseUrl, consumerKey, consumerSecret } = getWooEnv();
    const url = `${baseUrl.replace(/\/$/, "")}/wp-json/wc/v3/system_status?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json();
    const code = data?.settings?.currency || data?.store?.currency || 'USD';
    const symbol = data?.settings?.currency_symbol || data?.store?.currency_symbol || '$';
    return NextResponse.json({ currency_code: code, currency_symbol: symbol, currency_pos: 'left', thousand_sep: ',', decimal_sep: '.', num_decimals: 2 });
  } catch (e: any) {
    return NextResponse.json({ currency_code: 'USD', currency_symbol: '$', currency_pos: 'left', thousand_sep: ',', decimal_sep: '.', num_decimals: 2 });
  }
}


