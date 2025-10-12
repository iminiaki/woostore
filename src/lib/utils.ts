import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

let currencyCache: { code: string; symbol: string } | null = null;
export async function formatCurrency(amount: number): Promise<string> {
  if (!currencyCache) {
    try {
      const res = await fetch('/api/woo/settings', { cache: 'force-cache' });
      const data = await res.json();
      currencyCache = { code: data.currency_code || 'USD', symbol: data.currency_symbol || '$' };
    } catch {
      currencyCache = { code: 'USD', symbol: '$' };
    }
  }
  const code = currencyCache.code || 'USD';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount);
  } catch {
    return `${currencyCache.symbol}${amount.toFixed(2)}`;
  }
}
