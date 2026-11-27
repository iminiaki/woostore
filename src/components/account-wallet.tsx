"use client"

import { useEffect, useState } from "react"
import { LocaleLink as Link } from "@/components/locale-link"
import { Wallet } from "lucide-react"

import { useAuth } from "@/components/auth-context"
import { useI18n } from "@/components/locale-provider"
import { LogoTraceLoader } from "@/components/LogoTraceLoader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate, formatMoney } from "@/lib/invoice-format"
import type { MessageKey } from "@/i18n/messages"
import type { WalletTransactionView, WalletView } from "@/lib/wallet-types"
import { cn } from "@/lib/utils"

const TYPE_KEY: Record<WalletTransactionView["type"], MessageKey> = {
  credit: "wallet.credit",
  debit: "wallet.debit",
  refund: "wallet.refund",
}

function isIncoming(type: WalletTransactionView["type"]) {
  return type === "credit" || type === "refund"
}

export function AccountWallet() {
  const { user } = useAuth()
  const { t, active } = useI18n()
  const lang = active.code.toLowerCase().startsWith("fa") ? "fa" : "en"
  const [wallet, setWallet] = useState<WalletView | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.email) return
    let cancelled = false
    setWallet(null)
    setError(null)
    fetch(`/api/store/account/wallet?email=${encodeURIComponent(user.email)}`)
      .then(async (response) => {
        const data = (await response.json()) as WalletView & { error?: string }
        if (!response.ok) throw new Error("load")
        return data
      })
      .then((next) => {
        if (!cancelled) setWallet(next)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(t("wallet.loadFailed"))
      })
    return () => {
      cancelled = true
    }
  }, [user?.email, t])

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t("wallet.title")}</h2>
      {error ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      ) : !wallet ? (
        <div className="flex justify-center py-16">
          <LogoTraceLoader loading size={48} strokeWidth={48} ariaLabel={t("wallet.loading")} />
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("wallet.balance")}</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
                    {formatMoney(wallet.balance, wallet.currency, lang)}
                  </p>
                </div>
                <span className="grid size-10 place-items-center rounded-full bg-muted">
                  <Wallet className="size-5" />
                </span>
              </div>
              <p className="max-w-md text-sm text-muted-foreground">{t("wallet.hint")}</p>
              <Button asChild variant="outline">
                <Link href="/shop">{t("wallet.browse")}</Link>
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h3 className="font-medium">{t("wallet.activity")}</h3>
            {wallet.transactions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  {t("wallet.empty")}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="divide-y p-0">
                  {wallet.transactions.map((entry) => {
                    const incoming = isIncoming(entry.type)
                    return (
                      <div key={entry.id} className="flex items-start justify-between gap-4 px-6 py-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{t(TYPE_KEY[entry.type])}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(entry.createdAt, lang)}
                            {entry.note ? ` · ${entry.note}` : ""}
                          </p>
                          {entry.orderNumber ? (
                            <Link
                              href={`/profile/orders/${encodeURIComponent(entry.orderNumber)}`}
                              className="mt-1 inline-block font-mono text-xs text-muted-foreground underline-offset-4 hover:underline"
                            >
                              {entry.orderNumber}
                            </Link>
                          ) : null}
                        </div>
                        <div className="text-end">
                          <p
                            className={cn(
                              "text-sm font-medium tabular-nums",
                              incoming && "text-green-600",
                            )}
                          >
                            {incoming ? "+" : "−"}
                            {formatMoney(entry.amount, wallet.currency, lang)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                            {t("wallet.balanceAfter", {
                              amount: formatMoney(entry.balanceAfter, wallet.currency, lang),
                            })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
