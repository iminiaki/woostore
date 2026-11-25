import { APIError, type CollectionBeforeChangeHook, type Payload, type PayloadRequest } from 'payload'
import { sql } from 'drizzle-orm'

import type { WalletTransactionType, WalletView } from '@/lib/wallet-types'

type LedgerDb = {
  execute: (query: ReturnType<typeof sql>) => Promise<unknown>
}

type LedgerAdapter = {
  drizzle: LedgerDb
  sessions?: Record<string, { db?: LedgerDb }>
}

export function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100
}

export function normalizeWalletEmail(email: string) {
  return email.trim().toLowerCase()
}

function relationId(value: unknown): number | string | undefined {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return undefined
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[]
  if (result && typeof result === 'object' && 'rows' in result) {
    const rows = (result as { rows?: unknown }).rows
    if (Array.isArray(rows)) return rows as Record<string, unknown>[]
  }
  return []
}

function ledgerDb(payload: Payload, req: PayloadRequest): LedgerDb {
  const adapter = payload.db as unknown as LedgerAdapter
  const id = req.transactionID
  if (typeof id !== 'string') {
    throw new APIError('Wallet update is missing a database transaction.', 500)
  }
  const db = adapter.sessions?.[id]?.db
  if (!db) throw new APIError('Wallet update is missing a database transaction.', 500)
  return db
}

async function lockedBalance(db: LedgerDb, walletId: number | string) {
  const result = await db.execute(sql`
    SELECT balance
    FROM wallets
    WHERE id = ${walletId}
    FOR UPDATE
  `)
  const row = rowsOf(result)[0]
  if (!row) throw new APIError('Wallet could not be locked.', 500)
  return roundMoney(Number(row.balance || 0))
}

async function writeBalance(db: LedgerDb, walletId: number | string, balance: number) {
  await db.execute(sql`
    UPDATE wallets
    SET balance = ${balance}, updated_at = NOW()
    WHERE id = ${walletId}
  `)
}

async function findWallet(payload: Payload, email: string, req?: Partial<PayloadRequest>) {
  const found = await payload.find({
    collection: 'wallets',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return found.docs[0] || null
}

async function openWallet(payload: Payload, email: string, req: PayloadRequest) {
  const existing = await findWallet(payload, email, req)
  if (existing) return existing

  let customer: number | string | undefined
  const users = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (users.docs[0]) customer = users.docs[0].id

  try {
    return await payload.create({
      collection: 'wallets',
      data: {
        email,
        balance: 0,
        currency: 'usd',
        customer,
      },
      overrideAccess: true,
      req,
    })
  } catch {
    const again = await findWallet(payload, email, req)
    if (again) return again
    throw new APIError('Could not open a wallet for this customer.', 400)
  }
}

function orderNumberOf(order: unknown): string | null {
  if (!order || typeof order !== 'object' || !('orderNumber' in order)) return null
  const value = (order as { orderNumber?: unknown }).orderNumber
  return typeof value === 'string' ? value : null
}

export async function loadWalletAccount(payload: Payload, email: string): Promise<WalletView> {
  const normalized = normalizeWalletEmail(email)
  const wallet = await findWallet(payload, normalized)
  if (!wallet) {
    return { balance: 0, currency: 'usd', transactions: [] }
  }

  const found = await payload.find({
    collection: 'wallet-transactions',
    where: { wallet: { equals: wallet.id } },
    sort: '-createdAt',
    limit: 40,
    depth: 1,
    overrideAccess: true,
  })

  return {
    balance: roundMoney(Number(wallet.balance || 0)),
    currency: 'usd',
    transactions: found.docs.map((doc) => ({
      id: String(doc.id),
      type: doc.type,
      amount: roundMoney(Number(doc.amount || 0)),
      balanceAfter: roundMoney(Number(doc.balanceAfter || 0)),
      note: doc.note,
      orderNumber: orderNumberOf(doc.order),
      createdAt: doc.createdAt,
    })),
  }
}

/**
 * Moves store credit and writes a ledger row.
 * Debits are capped to the available balance when `upTo` is set.
 * A debit against an empty wallet returns a zero movement instead of throwing.
 */
export async function applyWalletEntry(args: {
  payload: Payload
  req?: Partial<PayloadRequest>
  email: string
  type: WalletTransactionType
  amount: number
  note?: string
  orderId?: number | string
  upTo?: boolean
}) {
  const email = normalizeWalletEmail(args.email)
  const amount = roundMoney(args.amount)
  if (!email.includes('@')) throw new APIError('A valid email is required for the wallet.', 400)
  if (!(amount > 0)) throw new APIError('Enter an amount greater than zero.', 400)

  try {
    const doc = await args.payload.create({
      collection: 'wallet-transactions',
      data: {
        email,
        type: args.type,
        amount,
        note: args.note,
        order: args.orderId,
      },
      overrideAccess: true,
      req: args.req,
      context: {
        systemWallet: true,
        walletUpTo: args.upTo === true,
      },
    })

    return {
      id: doc.id as number | string,
      amount: roundMoney(Number(doc.amount || 0)),
      balance: roundMoney(Number(doc.balanceAfter || 0)),
    }
  } catch (err) {
    if (args.upTo && err instanceof APIError && err.status === 400 && /no balance/i.test(err.message)) {
      return { id: null, amount: 0, balance: 0 }
    }
    throw err
  }
}

function walletContext(req: PayloadRequest) {
  return (req.context || {}) as {
    linkWalletOrder?: boolean
    systemWallet?: boolean
    walletUpTo?: boolean
    skipWalletGuard?: boolean
  }
}

export const settleWalletTransaction: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (!data) return data
  const context = walletContext(req)

  if (operation === 'update') {
    if (!context.linkWalletOrder || !originalDoc) {
      throw new APIError('Wallet transactions cannot be changed.', 400)
    }
    data.email = originalDoc.email
    data.type = originalDoc.type
    data.amount = originalDoc.amount
    data.balanceAfter = originalDoc.balanceAfter
    data.wallet = originalDoc.wallet
    if (typeof data.note !== 'string') data.note = originalDoc.note
    return data
  }

  if (operation !== 'create') return data

  const type = String(data.type || '')
  if (!['credit', 'debit', 'refund'].includes(type)) {
    throw new APIError('Choose credit, debit, or refund.', 400)
  }

  let email = normalizeWalletEmail(String(data.email || ''))
  const walletId = relationId(data.wallet)
  if (!email && walletId != null) {
    const wallet = await req.payload.findByID({
      collection: 'wallets',
      id: walletId,
      depth: 0,
      overrideAccess: true,
      req,
    })
    email = normalizeWalletEmail(String(wallet.email || ''))
  }
  if (!email.includes('@')) throw new APIError('Customer email is required.', 400)

  let amount = roundMoney(Number(data.amount || 0))
  if (!(amount > 0)) throw new APIError('Enter an amount greater than zero.', 400)

  const wallet =
    type === 'debit'
      ? await findWallet(req.payload, email, req)
      : await openWallet(req.payload, email, req)

  if (!wallet) {
    if (type === 'debit' && context.walletUpTo === true) {
      throw new APIError('This wallet has no balance to spend.', 400)
    }
    throw new APIError('This customer has no wallet balance.', 400)
  }

  const db = ledgerDb(req.payload, req)
  const before = await lockedBalance(db, wallet.id)
  if (type === 'debit') {
    if (before + 0.0001 < amount) {
      if (context.walletUpTo === true) amount = before
      else throw new APIError('Wallet balance is too low for this debit.', 400)
    }
    if (!(amount > 0)) throw new APIError('This wallet has no balance to spend.', 400)
  }

  const after = roundMoney(before + (type === 'debit' ? -amount : amount))
  await writeBalance(db, wallet.id, after)

  data.email = email
  data.amount = amount
  data.wallet = wallet.id
  data.balanceAfter = after
  return data
}
