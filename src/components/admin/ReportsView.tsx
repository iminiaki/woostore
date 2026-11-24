'use client'

import { Gutter, SetStepNav } from '@payloadcms/ui'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type ReportPayload = {
  totals: {
    orders: number
    revenue: number
    discount: number
    itemsSold: number
    averageOrder: number
  }
  salesByDay: { date: string; orders: number; revenue: number }[]
  products: { key: string; name: string; quantity: number; revenue: number }[]
  categories: { key: string; name: string; quantity: number; revenue: number }[]
  customers: { key: string; name: string; orders: number; revenue: number }[]
}

function money(n: number) {
  return `$${n.toFixed(2)}`
}

function defaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

export function ReportsView() {
  const initial = useMemo(() => defaultRange(), [])
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [tab, setTab] = useState<'overview' | 'products' | 'categories' | 'customers'>('overview')
  const [data, setData] = useState<ReportPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({
        from: `${from}T00:00:00.000Z`,
        to: `${to}T23:59:59.999Z`,
      })
      const res = await fetch(`/api/store/reports?${qs}`, { credentials: 'include' })
      const json = (await res.json()) as ReportPayload & { error?: string }
      if (!res.ok) {
        setError(json.error || 'Failed to load')
        setData(null)
        return
      }
      setData(json)
    } catch {
      setError('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <SetStepNav nav={[{ label: 'Reports' }]} />
      <Gutter>
        <div style={{ display: 'grid', gap: 20, padding: '24px 0 48px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 28 }}>Reports</h1>
              <p style={{ margin: '6px 0 0', opacity: 0.7 }}>
                Woo-style sales analytics with custom date range
              </p>
            </div>
            <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8, alignItems: 'end' }}>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                From
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  style={{ padding: '8px 10px' }}
                />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                To
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  style={{ padding: '8px 10px' }}
                />
              </label>
              <button
                type="button"
                onClick={() => void load()}
                style={{
                  padding: '10px 14px',
                  borderRadius: 4,
                  border: '1px solid var(--theme-elevation-250)',
                  background: 'var(--theme-elevation-100)',
                  cursor: 'pointer',
                }}
              >
                {loading ? 'Loading…' : 'Apply'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ color: 'var(--theme-error-500)' }}>{error}</div>
          )}

          {data && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 12,
                }}
              >
                {[
                  { label: 'Orders', value: String(data.totals.orders) },
                  { label: 'Revenue', value: money(data.totals.revenue) },
                  { label: 'Items sold', value: String(data.totals.itemsSold) },
                  { label: 'Discounts', value: money(data.totals.discount) },
                  { label: 'Avg order', value: money(data.totals.averageOrder) },
                ].map((card) => (
                  <div
                    key={card.label}
                    style={{
                      border: '1px solid var(--theme-elevation-150)',
                      borderRadius: 8,
                      padding: 16,
                      background: 'var(--theme-elevation-50)',
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{card.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{card.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(
                  [
                    ['overview', 'Overview'],
                    ['products', 'Products'],
                    ['categories', 'Categories'],
                    ['customers', 'Customers'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 999,
                      border: '1px solid var(--theme-elevation-250)',
                      background:
                        tab === key ? 'var(--theme-elevation-150)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'overview' && (
                <div
                  style={{
                    border: '1px solid var(--theme-elevation-150)',
                    borderRadius: 8,
                    padding: 16,
                    height: 360,
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>Sales over time</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <LineChart data={data.salesByDay}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="var(--theme-success-500, #22c55e)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {tab === 'products' && (
                <ChartAndTable
                  title="Sales by product"
                  chartData={data.products.slice(0, 12)}
                  rows={data.products}
                  nameKey="name"
                />
              )}
              {tab === 'categories' && (
                <ChartAndTable
                  title="Sales by category"
                  chartData={data.categories.slice(0, 12)}
                  rows={data.categories}
                  nameKey="name"
                />
              )}
              {tab === 'customers' && (
                <div style={{ display: 'grid', gap: 16 }}>
                  <div
                    style={{
                      border: '1px solid var(--theme-elevation-150)',
                      borderRadius: 8,
                      padding: 16,
                      height: 360,
                    }}
                  >
                    <h3 style={{ marginTop: 0 }}>Top customers</h3>
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart data={data.customers.slice(0, 12)}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="revenue" fill="var(--theme-success-500, #22c55e)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th style={th}>Customer</th>
                        <th style={th}>Orders</th>
                        <th style={th}>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.customers.map((row) => (
                        <tr key={row.key}>
                          <td style={td}>{row.name}</td>
                          <td style={td}>{row.orders}</td>
                          <td style={td}>{money(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </Gutter>
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'start',
  borderBottom: '1px solid var(--theme-elevation-150)',
  padding: '8px 6px',
}
const td: React.CSSProperties = {
  borderBottom: '1px solid var(--theme-elevation-100)',
  padding: '8px 6px',
}

function ChartAndTable({
  title,
  chartData,
  rows,
  nameKey,
}: {
  title: string
  chartData: { name: string; quantity: number; revenue: number }[]
  rows: { key: string; name: string; quantity: number; revenue: number }[]
  nameKey: 'name'
}) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div
        style={{
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: 8,
          padding: 16,
          height: 360,
        }}
      >
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey={nameKey} tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="revenue" fill="var(--theme-success-500, #22c55e)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Qty</th>
            <th style={th}>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td style={td}>{row.name}</td>
              <td style={td}>{row.quantity}</td>
              <td style={td}>{money(row.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ReportsView
