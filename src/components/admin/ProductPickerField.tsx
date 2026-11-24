'use client'

import { FieldLabel, useConfig, useDocumentInfo, useField } from '@payloadcms/ui'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  field: {
    label?: Record<string, string> | string
    required?: boolean
    admin?: {
      description?: Record<string, string> | string
    }
  }
  path: string
  readOnly?: boolean
}

type ProductOption = {
  id: string
  title: string
  price: number
  image?: string | null
  sku?: string | null
}

function relId(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: string | number }).id
    return id != null ? String(id) : null
  }
  return null
}

/** Postgres products use numeric ids — Payload filterOptions validation uses strict equality. */
function toRelationValue(id: string): number | string {
  const n = Number(id)
  return Number.isInteger(n) && String(n) === id ? n : id
}

function formatPrice(n: number) {
  return `$${Number(n || 0).toFixed(2)}`
}

function mapDoc(doc: Record<string, unknown>): ProductOption {
  const images = Array.isArray(doc.images) ? doc.images : []
  const first = images[0]
  let image: string | null = null
  if (typeof first === 'object' && first && 'url' in first) {
    image = (first as { url?: string | null }).url || null
  }
  const prices = (doc.prices || {}) as { usd?: number }
  return {
    id: String(doc.id),
    title: String(doc.title || doc.slug || `Product ${doc.id}`),
    price: Number(prices.usd ?? 0),
    image,
    sku: typeof doc.sku === 'string' ? doc.sku : null,
  }
}

/**
 * Modern multi-select for products: thumbnail + title + price.
 * Backed by a Payload hasMany → products relationship.
 */
export function ProductPickerField({ field, path, readOnly }: Props) {
  const { value, setValue, showError, errorMessage } = useField<unknown>({ path })
  const { config } = useConfig()
  const { id: docId } = useDocumentInfo()
  const api = config.routes.api

  const selectedIds = useMemo(() => {
    const raw = Array.isArray(value) ? value : []
    return raw.map(relId).filter(Boolean) as string[]
  }, [value])

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<ProductOption[]>([])
  const [selectedMeta, setSelectedMeta] = useState<Record<string, ProductOption>>({})
  const rootRef = useRef<HTMLDivElement>(null)

  const fetchProducts = useCallback(
    async (search: string, ids?: string[]) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          depth: '1',
          limit: ids?.length ? String(Math.max(ids.length, 20)) : '24',
          locale: 'en',
          sort: '-updatedAt',
        })
        if (ids?.length) {
          ids.forEach((id, i) => params.set(`where[id][in][${i}]`, id))
        } else if (search.trim()) {
          params.set('where[or][0][title][contains]', search.trim())
          params.set('where[or][1][sku][contains]', search.trim())
          params.set('where[or][2][slug][contains]', search.trim())
        }
        const res = await fetch(`${api}/products?${params}`, { credentials: 'include' })
        const data = (await res.json()) as { docs?: Record<string, unknown>[] }
        const mapped = (data.docs || []).map(mapDoc)
        return mapped.filter((p) => String(docId ?? '') !== p.id)
      } catch {
        return []
      } finally {
        setLoading(false)
      }
    },
    [api, docId],
  )

  // Load selected product meta
  useEffect(() => {
    if (!selectedIds.length) return
    const missing = selectedIds.filter((id) => !selectedMeta[id])
    if (!missing.length) return
    void fetchProducts('', missing).then((docs) => {
      setSelectedMeta((prev) => {
        const next = { ...prev }
        for (const d of docs) next[d.id] = d
        return next
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds.join('|'), fetchProducts])

  // Search options when open
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      void fetchProducts(query).then(setOptions)
    }, 180)
    return () => window.clearTimeout(t)
  }, [open, query, fetchProducts])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const toggle = (id: string, meta?: ProductOption) => {
    if (readOnly) return
    const set = new Set(selectedIds)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    if (meta) {
      setSelectedMeta((prev) => ({ ...prev, [id]: meta }))
    }
    setValue([...set].map(toRelationValue))
  }

  const selected = selectedIds
    .map((id) => selectedMeta[id] || { id, title: `Product ${id}`, price: 0 })
    .filter(Boolean)

  const visibleOptions = options.filter((o) => !selectedIds.includes(o.id))

  return (
    <div className="field-type" ref={rootRef} style={{ marginBottom: '1.5rem' }}>
      <FieldLabel label={field.label} path={path} required={field.required} />
      {field.admin?.description ? (
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
          {typeof field.admin.description === 'string'
            ? field.admin.description
            : field.admin.description.en || Object.values(field.admin.description)[0]}
        </div>
      ) : null}

      <div
        style={{
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: 10,
          background: 'var(--theme-elevation-50)',
          padding: 10,
          display: 'grid',
          gap: 10,
        }}
      >
        {/* Selected chips */}
        {selected.length > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            {selected.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'var(--theme-elevation-0)',
                  border: '1px solid var(--theme-elevation-100)',
                }}
              >
                <Thumb src={p.image} alt={p.title} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {p.title}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {formatPrice(p.price)}
                    {p.sku ? ` · ${p.sku}` : ''}
                  </div>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    aria-label={`Remove ${p.title}`}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      opacity: 0.6,
                      fontSize: 18,
                      lineHeight: 1,
                      padding: 4,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Search / dropdown */}
        {!readOnly && (
          <div style={{ position: 'relative' }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setOpen(true)}
              placeholder="Search products by name, SKU…"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--theme-elevation-150)',
                background: 'var(--theme-elevation-0)',
                color: 'inherit',
                fontSize: 13,
              }}
            />
            {open && (
              <div
                style={{
                  position: 'absolute',
                  zIndex: 40,
                  left: 0,
                  right: 0,
                  top: 'calc(100% + 6px)',
                  maxHeight: 320,
                  overflow: 'auto',
                  borderRadius: 10,
                  border: '1px solid var(--theme-elevation-150)',
                  background: 'var(--theme-elevation-0)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
                }}
              >
                {loading && (
                  <div style={{ padding: 12, fontSize: 12, opacity: 0.7 }}>Searching…</div>
                )}
                {!loading && visibleOptions.length === 0 && (
                  <div style={{ padding: 12, fontSize: 12, opacity: 0.7 }}>No products found</div>
                )}
                {visibleOptions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      toggle(p.id, p)
                      setQuery('')
                    }}
                    style={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      border: 'none',
                      borderBottom: '1px solid var(--theme-elevation-100)',
                      background: 'transparent',
                      color: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'start',
                    }}
                  >
                    <Thumb src={p.image} alt={p.title} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {p.title}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.65 }}>
                        {formatPrice(p.price)}
                        {p.sku ? ` · ${p.sku}` : ''}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: 999,
                        background: 'var(--theme-elevation-100)',
                      }}
                    >
                      Add
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showError && errorMessage ? (
        <div className="field-error" style={{ color: 'var(--theme-error-500)', fontSize: 12, marginTop: 6 }}>
          {errorMessage}
        </div>
      ) : null}
    </div>
  )
}

function Thumb({ src, alt }: { src?: string | null; alt: string }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 8,
        overflow: 'hidden',
        flexShrink: 0,
        background: 'var(--theme-elevation-100)',
        border: '1px solid var(--theme-elevation-100)',
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            fontSize: 11,
            opacity: 0.45,
          }}
        >
          —
        </div>
      )}
    </div>
  )
}

export default ProductPickerField
