"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { useFilterNavigation } from "@/components/filter-navigation"
import { useI18n } from "@/components/locale-provider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { SortOption } from "@/types"

export function ShopArchiveHeader({
  title,
  countLabel,
  filter,
}: {
  title: string
  countLabel: string
  filter?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        <div className="md:hidden">{filter}</div>
      </div>
      <div className="flex items-center gap-3 md:gap-4">
        <p className="text-sm text-muted-foreground">{countLabel}</p>
        <SortSelect />
      </div>
    </div>
  )
}

function SortSelect() {
  const router = useRouter()
  const navigation = useFilterNavigation()
  const params = useSearchParams()
  const pathname = usePathname()
  const { active, t } = useI18n()
  const value = (params.get("sortBy") as SortOption) || "newest"

  const setSort = (sortBy: SortOption) => {
    if (value === sortBy) return
    const next = new URLSearchParams(params.toString())
    if (sortBy === "newest") next.delete("sortBy")
    else next.set("sortBy", sortBy)
    const qs = next.toString()
    const href = qs ? `${pathname}?${qs}` : pathname
    if (navigation) navigation.navigate(href)
    else router.push(href, { scroll: false })
  }

  return (
    <Select dir={active.direction} value={value} onValueChange={(next) => setSort(next as SortOption)}>
      <SelectTrigger className="h-10 w-[9.5rem] rounded-lg border-border bg-background px-3 shadow-none">
        <SelectValue placeholder={t("filter.sortBy")} />
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[9.5rem]">
        <SelectItem value="newest">{t("filter.newest")}</SelectItem>
        <SelectItem value="top-sells">{t("filter.topSells")}</SelectItem>
        <SelectItem value="price-low-high">{t("filter.priceLow")}</SelectItem>
        <SelectItem value="price-high-low">{t("filter.priceHigh")}</SelectItem>
      </SelectContent>
    </Select>
  )
}
