import { TomanMark } from "@/components/toman-mark"
import { formatStoreAmount, usesTomanMark, type StoreCurrency } from "@/i18n/languages"
import { cn } from "@/lib/utils"

export function StoreMoney({
  amount,
  currency,
  locale,
  className,
  compare,
}: {
  amount: number
  currency: StoreCurrency
  locale: string
  className?: string
  /** When set and different from `amount`, both numbers share one toman mark. */
  compare?: number
}) {
  const numbers =
    compare != null && compare !== amount
      ? `${formatStoreAmount(amount, currency, locale)} – ${formatStoreAmount(compare, currency, locale)}`
      : formatStoreAmount(amount, currency, locale)

  if (!usesTomanMark(currency, locale)) {
    return <span className={className}>{numbers}</span>
  }

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span>{numbers}</span>
      <TomanMark />
    </span>
  )
}
