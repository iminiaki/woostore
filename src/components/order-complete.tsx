"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { LocaleLink as Link } from "@/components/locale-link"
import { useReducedMotion } from "framer-motion"

import { ReceiptPrinter, type ReceiptPrinterStage } from "@/components/receipt-printer"
import { Button } from "@/components/ui/button"
import { paymentLabel, type OrderReceiptTotals } from "@/lib/customer-order"
import { formatMoney } from "@/lib/invoice-format"

function money(amount: number, currency: OrderReceiptTotals["currency"]) {
  return formatMoney(amount, currency, "en")
}

function receiptDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
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
  value: string
  strong?: boolean
}) {
  return (
    <div className={`flex items-baseline justify-between gap-4 text-sm ${strong ? "font-semibold" : ""}`}>
      <span className={strong ? "" : "text-neutral-500"}>{label}</span>
      <span className="text-right">{value}</span>
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
  const reduceMotion = useReducedMotion()
  const [stage, setStage] = useState<ReceiptPrinterStage>("processing")

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
              <p className="font-mono text-[10px] tracking-[0.18em] text-neutral-500 uppercase">
                Order
              </p>
              <p className="mt-2 truncate font-mono text-sm text-neutral-100">
                {order || "Received"}
              </p>
            </div>
            {receipt ? (
              <div className="text-right">
                <p className="font-mono text-[10px] tracking-[0.18em] text-neutral-500 uppercase">
                  Total
                </p>
                <p className="mt-2 font-mono text-sm text-neutral-100">
                  {money(receipt.total, receipt.currency)}
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
              <ReceiptRow label="Subtotal" value={money(receipt.subtotal, receipt.currency)} />
              {receipt.discountTotal > 0 ? (
                <ReceiptRow label="Discount" value={`-${money(receipt.discountTotal, receipt.currency)}`} />
              ) : null}
              {receipt.shippingTotal > 0 ? (
                <ReceiptRow label="Shipping" value={money(receipt.shippingTotal, receipt.currency)} />
              ) : null}
              {receipt.taxTotal > 0 ? (
                <ReceiptRow label="Tax" value={money(receipt.taxTotal, receipt.currency)} />
              ) : null}
              <ReceiptRow label="Total" value={money(receipt.total, receipt.currency)} strong />
              {receipt.walletAmount > 0 ? (
                <ReceiptRow
                  label="Wallet"
                  value={`-${money(receipt.walletAmount, receipt.currency)}`}
                />
              ) : null}
              {receipt.walletAmount > 0 ? (
                <ReceiptRow
                  label="Due on delivery"
                  value={money(Math.max(0, receipt.total - receipt.walletAmount), receipt.currency)}
                />
              ) : null}
            </div>
          ) : null}
          <div className="mt-8 space-y-2 border-t border-dashed border-neutral-300 pt-5">
            <ReceiptRow label="Order" value={order || "—"} />
            <ReceiptRow label="Paid with" value={paymentLabel(receipt?.paymentMethod)} />
            {receipt?.createdAt ? <ReceiptRow label="Date" value={receiptDate(receipt.createdAt)} /> : null}
          </div>
        </ReceiptPrinter.Paper>
      </ReceiptPrinter.Output>

      <div className="mt-6 grid w-full gap-2">
        <Button asChild size="lg" className="w-full">
          <Link href="/profile?tab=orders">View your orders</Link>
        </Button>
        {preInvoice ? (
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href={preInvoice}>View pre-invoice</Link>
          </Button>
        ) : null}
        <Button asChild variant="ghost" className="w-full">
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </div>
    </ReceiptPrinter.Root>
  )
}
