export type WalletCurrency = "usd"

export type WalletTransactionType = "credit" | "debit" | "refund"

export type WalletTransactionView = {
  id: string
  type: WalletTransactionType
  amount: number
  balanceAfter: number
  note?: string | null
  orderNumber?: string | null
  createdAt: string
}

export type WalletView = {
  balance: number
  currency: WalletCurrency
  transactions: WalletTransactionView[]
}
