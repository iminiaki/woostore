"use client";

import { useEffect, useMemo, useState } from "react";

type Settings = {
  currency_code: string;
  currency_symbol: string;
};

export function useCurrency() {
  const [settings, setSettings] = useState<Settings>({ currency_code: "USD", currency_symbol: "$" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/woo/settings', { cache: 'force-cache' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setSettings({ currency_code: data.currency_code || 'USD', currency_symbol: data.currency_symbol || '$' });
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const format = useMemo(() => {
    try {
      const nf = new Intl.NumberFormat(undefined, { style: 'currency', currency: settings.currency_code || 'USD' });
      return (n: number) => nf.format(n);
    } catch {
      return (n: number) => `${settings.currency_symbol}${n.toFixed(2)}`;
    }
  }, [settings.currency_code, settings.currency_symbol]);

  return { format, code: settings.currency_code, symbol: settings.currency_symbol };
}


