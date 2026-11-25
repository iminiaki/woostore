"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Wallet } from "lucide-react"

import { useAuth } from "@/components/auth-context"
import { LogoTraceLoader } from "@/components/LogoTraceLoader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate, formatMoney } from "@/lib/invoice-format"
import type { WalletTransactionView, WalletView } from "@/lib/wallet-types"
import { cn } from "@/lib/utils"

const TYPE_LABEL: Record<WalletTransactionView["type"], string> = {
  credit: "Credit",
  debit: "Purchase",
  refund: "Refund",
}

function isIncoming(type: WalletTransactionView["type"]) {
  return type === "credit" || type === "refund"
}

export function AccountWallet() {
  const { user } = useAuth()
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
        if (!response.ok) throw new Error(data.error || "Could not load the wallet")
        return data
      })
      .then((next) => {
        if (!cancelled) setWallet(next)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [user?.email])

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Wallet</h2>
      {error ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      ) : !wallet ? (
        <div className="flex justify-center py-16">
          <LogoTraceLoader loading size={48} strokeWidth={48} ariaLabel="Loading wallet" />
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Available balance</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
                    {formatMoney(wallet.balance, wallet.currency, "en")}
                  </p>
                </div>
                <span className="grid size-10 place-items-center rounded-full bg-muted">
                  <Wallet className="size-5" />
                </span>
              </div>
              <p className="max-w-md text-sm text-muted-foreground">
                Store credit you can spend at checkout. The shop adds funds; a cancelled or refunded
                order returns what this wallet paid.
              </p>
              <Button asChild variant="outline">
                <Link href="/shop">Browse the shop</Link>
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h3 className="font-medium">Activity</h3>
            {wallet.transactions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No wallet activity yet.
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
                          <p className="text-sm font-medium">{TYPE_LABEL[entry.type]}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(entry.createdAt, "en")}
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
                        <div className="text-right">
                          <p
                            className={cn(
                              "text-sm font-medium tabular-nums",
                              incoming && "text-green-600",
                            )}
                          >
                            {incoming ? "+" : "−"}
                            {formatMoney(entry.amount, wallet.currency, "en")}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                            Balance {formatMoney(entry.balanceAfter, wallet.currency, "en")}
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
