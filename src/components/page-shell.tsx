import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Matches site header/footer: `mx-auto max-w-7xl px-4`. */
export function PageShell({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "main" | "section" | "article";
}) {
  return <Tag className={cn("mx-auto max-w-7xl px-4 py-12", className)}>{children}</Tag>;
}
