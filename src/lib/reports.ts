export type ReportOrder = {
  id: string
  createdAt: string
  status: string
  email: string
  total: number
  subtotal: number
  discountTotal: number
  currency: string
  customer?: string | number | { id?: string | number; email?: string; name?: string } | null
  items?: {
    productTitle?: string
    quantity?: number
    lineTotal?: number
    product?: string | number | { id?: string | number } | null
    categorySlug?: string | null
    categoryName?: string | null
  }[]
}

const COUNTED = new Set(['processing', 'completed', 'on-hold'])

export function filterOrdersByRange(
  orders: ReportOrder[],
  from?: string | null,
  to?: string | null,
) {
  const fromTs = from ? new Date(from).getTime() : null
  const toTs = to ? new Date(to).getTime() : null
  return orders.filter((o) => {
    if (!COUNTED.has(o.status)) return false
    const ts = new Date(o.createdAt).getTime()
    if (fromTs != null && ts < fromTs) return false
    if (toTs != null && ts > toTs) return false
    return true
  })
}

function dayKey(iso: string) {
  return iso.slice(0, 10)
}

export function buildReportSummary(orders: ReportOrder[]) {
  const salesByDayMap = new Map<string, { date: string; orders: number; revenue: number }>()
  const byProduct = new Map<
    string,
    { key: string; name: string; quantity: number; revenue: number }
  >()
  const byCategory = new Map<
    string,
    { key: string; name: string; quantity: number; revenue: number }
  >()
  const byCustomer = new Map<
    string,
    { key: string; name: string; orders: number; revenue: number }
  >()

  let revenue = 0
  let discount = 0
  let itemsSold = 0

  for (const order of orders) {
    revenue += Number(order.total || 0)
    discount += Number(order.discountTotal || 0)

    const day = dayKey(order.createdAt)
    const dayRow = salesByDayMap.get(day) || { date: day, orders: 0, revenue: 0 }
    dayRow.orders += 1
    dayRow.revenue += Number(order.total || 0)
    salesByDayMap.set(day, dayRow)

    const email = order.email || 'unknown'
    const cust = byCustomer.get(email) || {
      key: email,
      name: email,
      orders: 0,
      revenue: 0,
    }
    cust.orders += 1
    cust.revenue += Number(order.total || 0)
    byCustomer.set(email, cust)

    for (const item of order.items || []) {
      const qty = Number(item.quantity || 0)
      const line = Number(item.lineTotal || 0)
      itemsSold += qty

      const productId =
        typeof item.product === 'object' && item.product
          ? String(item.product.id)
          : item.product != null
            ? String(item.product)
            : item.productTitle || 'unknown'
      const prod = byProduct.get(productId) || {
        key: productId,
        name: item.productTitle || productId,
        quantity: 0,
        revenue: 0,
      }
      prod.quantity += qty
      prod.revenue += line
      byProduct.set(productId, prod)

      const catKey = item.categorySlug || 'uncategorized'
      const cat = byCategory.get(catKey) || {
        key: catKey,
        name: item.categoryName || catKey,
        quantity: 0,
        revenue: 0,
      }
      cat.quantity += qty
      cat.revenue += line
      byCategory.set(catKey, cat)
    }
  }

  const salesByDay = [...salesByDayMap.values()].sort((a, b) => a.date.localeCompare(b.date))
  const products = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue)
  const categories = [...byCategory.values()].sort((a, b) => b.revenue - a.revenue)
  const customers = [...byCustomer.values()].sort((a, b) => b.revenue - a.revenue)

  return {
    totals: {
      orders: orders.length,
      revenue,
      discount,
      itemsSold,
      averageOrder: orders.length ? revenue / orders.length : 0,
    },
    salesByDay,
    products,
    categories,
    customers,
  }
}
