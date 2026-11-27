"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogoTraceLoader } from "@/components/LogoTraceLoader";
import { useI18n } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

type FilterNav = {
  pending: boolean;
  navigate: (href: string) => void;
};

const FilterNavContext = createContext<FilterNav | null>(null);

export function useFilterNavigation() {
  return useContext(FilterNavContext);
}

export function FilterNavigation({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.toString();
  const [isPending, startTransition] = useTransition();
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    setWaiting(false);
  }, [query]);

  const navigate = useCallback(
    (href: string) => {
      const current = query ? `${window.location.pathname}?${query}` : window.location.pathname;
      if (href === current) return;
      setWaiting(true);
      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [query, router],
  );

  return (
    <FilterNavContext.Provider value={{ pending: isPending || waiting, navigate }}>
      <div className={className}>{children}</div>
    </FilterNavContext.Provider>
  );
}

export function FilterResults({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const pending = useFilterNavigation()?.pending ?? false;

  return (
    <div className="relative min-h-40" aria-busy={pending}>
      <div className={cn("space-y-6 transition-opacity duration-200", pending && "opacity-40")}>
        {children}
      </div>
      {pending ? (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center">
          <div
            role="status"
            className="flex items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-2 text-sm text-foreground shadow-sm"
          >
            <LogoTraceLoader loading size={16} strokeWidth={72} ariaLabel={t("filter.loading")} />
            {t("filter.loading")}
          </div>
        </div>
      ) : null}
    </div>
  );
}
