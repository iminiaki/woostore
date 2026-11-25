"use client";

import { LogoTraceLoader } from "@/components/LogoTraceLoader";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number;
  ariaLabel?: string;
};

/** Full-area page/route loading state for Next.js `loading.tsx` and Suspense. */
export function PageLoading({
  className,
  size = 64,
  ariaLabel = "Loading page",
}: Props) {
  return (
    <div
      className={cn(
        "flex min-h-[calc(100dvh-8rem)] w-full flex-col items-center justify-center gap-4 px-4 py-24",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <LogoTraceLoader loading size={size} strokeWidth={40} ariaLabel={ariaLabel} />
    </div>
  );
}
