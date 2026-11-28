"use client"

import { useEffect, useState, type ReactNode } from "react"
import Image from "next/image"
import { LocaleLink as Link } from "@/components/locale-link"
import { useReducedMotion } from "framer-motion"

import { useI18n } from "@/components/locale-provider"
import { ReceiptPrinter, type ReceiptPrinterStage } from "@/components/receipt-printer"
import { StoreMoney } from "@/components/store-money"
import { documentHrefForLocale } from "@/lib/invoice-format"
import { Button } from "@/components/ui/button"
import type { StoreCurrency } from "@/i18n/languages"
import type { OrderReceiptTotals } from "@/lib/customer-order"

function receiptDate(iso: string, localeCode: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const lang = localeCode.toLowerCase().split("-")[0]
  if (lang === "fa") {
    const day = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date)
    const time = new Intl.DateTimeFormat("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date)
    return `${day} · ${time}`
  }
  const day = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(date)
    .toUpperCase()
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
  return `${day} · ${time}`
}

function ReceiptRow({
  label,
  value,
  strong = false,
}: {
  label: string
  value: ReactNode
  strong?: boolean
}) {
  return (
    <div className={`flex items-baseline justify-between gap-4 text-sm ${strong ? "font-semibold" : ""}`}>
      <span className={strong ? "" : "text-neutral-500"}>{label}</span>
      <span className="text-end">{value}</span>
    </div>
  )
}

export function OrderComplete({
  order,
  preInvoice,
  receipt,
}: {
  order?: string
  preInvoice: string | null
  receipt?: OrderReceiptTotals | null
}) {
  const { t, active } = useI18n()
  const reduceMotion = useReducedMotion()
  const [stage, setStage] = useState<ReceiptPrinterStage>("processing")
  const currency: StoreCurrency = receipt?.currency === "irt" ? "IRT" : "USD"

  useEffect(() => {
    if (reduceMotion) {
      setStage("complete")
      return
    }
    const printing = window.setTimeout(() => setStage("printing"), 700)
    const complete = window.setTimeout(() => setStage("complete"), 700 + 1800)
    return () => {
      window.clearTimeout(printing)
      window.clearTimeout(complete)
    }
  }, [reduceMotion])

  const money = (amount: number) => (
    <StoreMoney
      amount={amount}
      currency={currency}
      locale={active.code}
      markClassName="text-current dark:text-current"
    />
  )

  const payment = (method?: string | null) => {
    if (!method) return t("pay.none")
    if (method === "cod") return t("pay.cod")
    if (method === "card") return t("pay.card")
    if (method === "wallet") return t("pay.wallet")
    if (method === "wallet+cod") return t("pay.both")
    return method
  }

  return (
    <ReceiptPrinter.Root stage={stage} className="max-w-[22rem]">
      <ReceiptPrinter.Machine>
        <ReceiptPrinter.Header className="mb-4 items-center">
          <span className="grid size-9 place-items-center rounded-lg bg-neutral-800 ring-1 ring-white/10">
            <Image
              src="/logo_light.png"
              alt="Lastore"
              width={22}
              height={22}
              priority
              className="size-[22px]"
            />
          </span>
        </ReceiptPrinter.Header>
        <ReceiptPrinter.Screen>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="rtl:font-persian rtl:tracking-normal rtl:normal-case font-mono text-[10px] tracking-[0.18em] text-neutral-500 uppercase">
                {t("orders.order")}
              </p>
              <p className="rtl:font-persian rtl:tracking-normal rtl:normal-case mt-2 truncate font-mono text-sm text-neutral-100">
                {order || t("receipt.received")}
              </p>
            </div>
            {receipt ? (
              <div className="text-end">
                <p className="rtl:font-persian rtl:tracking-normal rtl:normal-case font-mono text-[10px] tracking-[0.18em] text-neutral-500 uppercase">
                  {t("cart.total")}
                </p>
                <p className="rtl:font-persian rtl:tracking-normal rtl:normal-case mt-2 font-mono text-sm text-neutral-100">
                  {money(receipt.total)}
                </p>
              </div>
            ) : null}
          </div>
          <ReceiptPrinter.Status className="mt-4" />
        </ReceiptPrinter.Screen>
      </ReceiptPrinter.Machine>

      <ReceiptPrinter.Output className="h-auto">
        <ReceiptPrinter.Paper className="min-h-0">
          <div className="mb-10 flex justify-center">
            <span className="grid size-14 place-items-center rounded-md bg-neutral-950">
              <Image src="/logo_light.png" alt="Lastore" width={34} height={34} className="size-[34px]" />
            </span>
          </div>
          {receipt ? (
            <div className="space-y-2">
              <ReceiptRow label={t("cart.subtotal")} value={money(receipt.subtotal)} />
              {receipt.discountTotal > 0 ? (
                <ReceiptRow label={t("cart.discount")} value={money(-receipt.discountTotal)} />
              ) : null}
              {receipt.shippingTotal > 0 ? (
                <ReceiptRow label={t("checkout.shipping")} value={money(receipt.shippingTotal)} />
              ) : null}
              {receipt.taxTotal > 0 ? (
                <ReceiptRow label={t("orders.tax")} value={money(receipt.taxTotal)} />
              ) : null}
              <ReceiptRow label={t("cart.total")} value={money(receipt.total)} strong />
              {receipt.walletAmount > 0 ? (
                <ReceiptRow label={t("checkout.walletLine")} value={money(-receipt.walletAmount)} />
              ) : null}
              {receipt.walletAmount > 0 ? (
                <ReceiptRow
                  label={t("checkout.due")}
                  value={money(Math.max(0, receipt.total - receipt.walletAmount))}
                />
              ) : null}
            </div>
          ) : null}
          <div className="mt-8 space-y-2 border-t border-dashed border-neutral-300 pt-5">
            <ReceiptRow label={t("orders.order")} value={order || "—"} />
            <ReceiptRow label={t("receipt.paidWith")} value={payment(receipt?.paymentMethod)} />
            {receipt?.createdAt ? (
              <ReceiptRow label={t("receipt.date")} value={receiptDate(receipt.createdAt, active.code)} />
            ) : null}
          </div>
        </ReceiptPrinter.Paper>
      </ReceiptPrinter.Output>

      <div className="mt-6 grid w-full gap-2">
        <Button asChild size="lg" className="w-full">
          <Link href="/profile?tab=orders">{t("receipt.viewOrders")}</Link>
        </Button>
        {preInvoice ? (
          <Button asChild variant="outline" size="lg" className="w-full">
            <a href={documentHrefForLocale(preInvoice, active.code)}>{t("receipt.viewPreInvoice")}</a>
          </Button>
        ) : null}
        <Button asChild variant="ghost" className="w-full">
          <Link href="/shop">{t("receipt.continue")}</Link>
        </Button>
      </div>
    </ReceiptPrinter.Root>
  )
}
