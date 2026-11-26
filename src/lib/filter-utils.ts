import { ReadonlyURLSearchParams } from "next/navigation";

/**
 * Count active shop filters. Pass dynamic group keys so attribute filters are included.
 */
export function countActiveFilters(
  params: ReadonlyURLSearchParams,
  groupKeys: string[] = [],
): number {
  let count = 0;

  for (const key of groupKeys) {
    const value = params.get(key);
    if (!value) continue;
    count += value.split(",").filter(Boolean).length;
  }

  if (params.get("category")) count += 1;
  if (params.get("clearance") === "1") count += 1;

  const subs = params.get("subCategory");
  if (subs) count += subs.split(",").filter(Boolean).length;

  if (params.get("minPrice") || params.get("maxPrice")) count += 1;

  return count;
}
