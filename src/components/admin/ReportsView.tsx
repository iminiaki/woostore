'use client'

import {
  Banner,
  Button,
  Gutter,
  SetStepNav,
  useTranslation,
} from '@payloadcms/ui'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { t } from '@/i18n/admin'
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

type Lang = 'en' | 'fa'
type TabKey = 'overview' | 'products' | 'categories' | 'customers'

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

function label(key: keyof typeof t, lang: Lang): string {
  const value = t[key]
  if (typeof value === 'object' && value !== null && 'en' in value && 'fa' in value) {
    return (value as { en: string; fa: string })[lang]
  }
  return String(key)
}

export function ReportsView() {
  const { i18n } = useTranslation()
  const lang: Lang = i18n.language === 'fa' ? 'fa' : 'en'
  const reportsLabel = label('reports', lang)
  const initial = useMemo(() => defaultRange(), [])
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [tab, setTab] = useState<TabKey>('overview')
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
      setError(lang === 'fa' ? 'بارگذاری گزارش‌ها ناموفق بود' : 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [from, to, lang])

  useEffect(() => {
    void load()
  }, [load])

  const tabs: { key: TabKey; text: string }[] = [
    { key: 'overview', text: label('reportsOverview', lang) },
    { key: 'products', text: label('reportsProducts', lang) },
    { key: 'categories', text: label('reportsCategories', lang) },
    { key: 'customers', text: label('reportsCustomers', lang) },
  ]

  return (
    <div className="collection-list reports-view">
      <SetStepNav nav={[{ label: reportsLabel }]} />
      <Gutter className="collection-list__wrap">
        <header className="list-header">
          <div className="list-header__content">
            <div className="list-header__title-and-actions">
              <h1 className="list-header__title">{reportsLabel}</h1>
            </div>
            <div className="list-header__actions">
              <div className="field-type reports-view__date">
                <label className="field-label" htmlFor="reports-from">
                  {label('reportsFrom', lang)}
                </label>
                <input
                  id="reports-from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="field-type reports-view__date">
                <label className="field-label" htmlFor="reports-to">
                  {label('reportsTo', lang)}
                </label>
                <input
                  id="reports-to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <Button
                buttonStyle="primary"
                size="small"
                onClick={() => void load()}
                disabled={loading}
              >
                {loading ? label('reportsLoading', lang) : label('reportsApply', lang)}
              </Button>
            </div>
          </div>
          <div className="list-header__after-header-content">
            <p className="reports-view__desc">{label('reportsDesc', lang)}</p>
          </div>
        </header>

        {error ? <Banner type="error">{error}</Banner> : null}

        {data ? (
          <>
            <div className="reports-view__stats">
              {[
                { label: label('reportsOrders', lang), value: String(data.totals.orders) },
                { label: label('reportsRevenue', lang), value: money(data.totals.revenue) },
                { label: label('reportsItemsSold', lang), value: String(data.totals.itemsSold) },
                { label: label('reportsDiscounts', lang), value: money(data.totals.discount) },
                { label: label('reportsAvgOrder', lang), value: money(data.totals.averageOrder) },
              ].map((card) => (
                <div key={card.label} className="reports-view__stat">
                  <div className="reports-view__stat-label">{card.label}</div>
                  <div className="reports-view__stat-value">{card.value}</div>
                </div>
              ))}
            </div>

            <div className="reports-view__tabs">
              {tabs.map((item) => (
                <Button
                  key={item.key}
                  buttonStyle={tab === item.key ? 'pill' : 'tab'}
                  size="small"
                  onClick={() => setTab(item.key)}
                >
                  {item.text}
                </Button>
              ))}
            </div>

            {tab === 'overview' ? (
              <section className="reports-view__panel">
                <h2 className="reports-view__panel-title">{label('reportsSalesOverTime', lang)}</h2>
                <div className="reports-view__chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.salesByDay}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
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
              </section>
            ) : null}

            {tab === 'products' ? (
              <ChartAndTable
                title={label('reportsByProduct', lang)}
                chartData={data.products.slice(0, 12)}
                rows={data.products}
                lang={lang}
              />
            ) : null}

            {tab === 'categories' ? (
              <ChartAndTable
                title={label('reportsByCategory', lang)}
                chartData={data.categories.slice(0, 12)}
                rows={data.categories}
                lang={lang}
              />
            ) : null}

            {tab === 'customers' ? (
              <div className="reports-view__stack">
                <section className="reports-view__panel">
                  <h2 className="reports-view__panel-title">{label('reportsTopCustomers', lang)}</h2>
                  <div className="reports-view__chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.customers.slice(0, 12)}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={70}
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="revenue" fill="var(--theme-success-500, #22c55e)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <div className="table">
                  <table>
                    <thead>
                      <tr>
                        <th>{label('reportsCustomer', lang)}</th>
                        <th>{label('reportsOrders', lang)}</th>
                        <th>{label('reportsRevenue', lang)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.customers.map((row) => (
                        <tr key={row.key}>
                          <td>{row.name}</td>
                          <td>{row.orders}</td>
                          <td>{money(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </Gutter>
    </div>
  )
}

function ChartAndTable({
  title,
  chartData,
  rows,
  lang,
}: {
  title: string
  chartData: { name: string; quantity: number; revenue: number }[]
  rows: { key: string; name: string; quantity: number; revenue: number }[]
  lang: Lang
}) {
  return (
    <div className="reports-view__stack">
      <section className="reports-view__panel">
        <h2 className="reports-view__panel-title">{title}</h2>
        <div className="reports-view__chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={70}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="var(--theme-success-500, #22c55e)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <div className="table">
        <table>
          <thead>
            <tr>
              <th>{label('reportsName', lang)}</th>
              <th>{label('reportsQty', lang)}</th>
              <th>{label('reportsRevenue', lang)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.name}</td>
                <td>{row.quantity}</td>
                <td>{money(row.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ReportsView
