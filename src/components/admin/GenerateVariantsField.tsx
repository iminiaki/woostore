'use client'

import {
  toast,
  useConfig,
  useForm,
  useFormFields,
  useTranslation,
} from '@payloadcms/ui'
import React, { useCallback, useMemo, useState } from 'react'

import {
  buildVariantsFromAttributes,
  fieldState,
  type GeneratedVariant,
  variantKey,
  type VariationAttr,
} from '@/lib/variant-generator'

type AttrRow = {
  attribute?: string | number | { id?: string | number }
  terms?: (string | number | { id?: string | number })[] | null
  usedForVariations?: boolean | null
}

function relId(value: unknown): string | number | null {
  if (value == null) return null
  if (typeof value === 'string' || typeof value === 'number') return value
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: string | number }).id
    return id ?? null
  }
  return null
}

function existingVariantKey(variant: {
  attributeValues?: { attribute?: unknown; term?: unknown }[] | null
}): string | null {
  const values = variant.attributeValues
  if (!values?.length) return null
  const normalized = values
    .map((av) => {
      const attribute = relId(av.attribute)
      const term = relId(av.term)
      if (attribute == null || term == null) return null
      return { attribute, term }
    })
    .filter(Boolean) as { attribute: string | number; term: string | number }[]
  if (normalized.length !== values.length) return null
  return variantKey(normalized)
}

function toSubFieldState(variant: GeneratedVariant) {
  const state: Record<string, ReturnType<typeof fieldState> | { disableFormData?: boolean; initialValue: unknown; valid: true; value: unknown }> = {
    sku: fieldState(variant.sku),
    'prices.usd': fieldState(variant.prices.usd),
    'prices.irt': fieldState(variant.prices.irt),
    stock: fieldState(variant.stock),
    inStock: fieldState(variant.inStock),
    allowBackorder: fieldState(variant.allowBackorder),
  }

  if (variant.compareAtPrices) {
    state['compareAtPrices.usd'] = fieldState(variant.compareAtPrices.usd)
    state['compareAtPrices.irt'] = fieldState(variant.compareAtPrices.irt)
  }

  state.attributeValues = {
    ...fieldState(variant.attributeValues.length),
    disableFormData: true,
  }

  variant.attributeValues.forEach((av, index) => {
    state[`attributeValues.${index}.attribute`] = fieldState(av.attribute)
    state[`attributeValues.${index}.term`] = fieldState(av.term)
  })

  return state
}

export function GenerateVariantsField() {
  const { i18n } = useTranslation()
  const isFa = i18n.language === 'fa'
  const { config } = useConfig()
  const { addFieldRow, dispatchFields, getData } = useForm()
  const [busy, setBusy] = useState(false)

  const attributesField = useFormFields(([fields]) => fields.attributes)
  const variantsField = useFormFields(([fields]) => fields.variants)
  const productType = useFormFields(([fields]) => fields.productType?.value)

  const attrRowsCount = typeof attributesField?.value === 'number' ? attributesField.value : 0
  const variantRowsCount = typeof variantsField?.value === 'number' ? variantsField.value : 0

  const labels = useMemo(
    () =>
      isFa
        ? {
            title: 'ساخت تنوع‌ها از ویژگی‌ها',
            help: 'مانند ووکامرس: از ویژگی‌هایی که «استفاده برای تنوع» دارند، همه ترکیب‌ها ساخته می‌شود.',
            preview: 'ترکیب قابل ساخت',
            selected: 'ویژگی انتخاب‌شده برای تنوع',
            none: 'هیچ ویژگی «استفاده برای تنوع» با مقدار انتخاب نشده است.',
            generateMissing: 'ساخت تنوع‌های جدید',
            regenerate: 'حذف همه و ساخت مجدد',
            deleteAll: 'حذف همه تنوع‌ها',
            created: (n: number) => `${n} تنوع ساخته شد`,
            skipped: (n: number) => `${n} مورد از قبل وجود داشت`,
            deleted: (n: number) => `${n} تنوع حذف شد`,
            tooMany: 'تعداد ترکیب‌ها بیش از حد است (حداکثر ۲۰۰). ویژگی‌ها را کمتر کنید.',
            onlyVariable: 'فقط برای محصول متغیر در دسترس است.',
          }
        : {
            title: 'Generate variations from attributes',
            help: 'WooCommerce-style: builds all combinations from attributes marked “Used for variations”.',
            preview: 'Combinations',
            selected: 'Variation attributes',
            none: 'No attributes marked “Used for variations” with selected terms.',
            generateMissing: 'Generate missing variations',
            regenerate: 'Delete all & regenerate',
            deleteAll: 'Delete all variations',
            created: (n: number) => `Created ${n} variation(s)`,
            skipped: (n: number) => `Skipped ${n} existing`,
            deleted: (n: number) => `Deleted ${n} variation(s)`,
            tooMany: 'Too many combinations (max 200). Narrow attribute terms.',
            onlyVariable: 'Available only for variable products.',
          },
    [isFa],
  )

  const readVariationAttrs = useCallback((): VariationAttr[] => {
    const data = getData() as {
      attributes?: AttrRow[] | null
    }
    const rows = Array.isArray(data.attributes) ? data.attributes : []

    return rows
      .filter((row) => row?.usedForVariations)
      .map((row) => {
        const attributeId = relId(row.attribute)
        const termIds = (row.terms || [])
          .map((term) => relId(term))
          .filter((id): id is string | number => id != null)
        if (!attributeId || !termIds.length) return null
        return { attributeId, termIds }
      })
      .filter(Boolean) as VariationAttr[]
  }, [getData])

  const fetchTermSlugs = useCallback(
    async (termIds: (string | number)[]) => {
      const map = new Map<string, string>()
      if (!termIds.length) return map

      const unique = [...new Set(termIds.map(String))]
      const params = new URLSearchParams()
      params.set('limit', String(Math.max(unique.length, 1)))
      params.set('depth', '0')
      unique.forEach((id, index) => {
        params.set(`where[id][in][${index}]`, id)
      })

      const res = await fetch(`${config.serverURL}${config.routes.api}/attribute-terms?${params}`, {
        credentials: 'include',
      })
      if (!res.ok) return map
      const json = (await res.json()) as {
        docs?: { id: string | number; slug?: string; name?: string }[]
      }
      for (const doc of json.docs || []) {
        map.set(String(doc.id), doc.slug || String(doc.name || doc.id))
      }
      return map
    },
    [config.routes.api, config.serverURL],
  )

  const clearVariants = useCallback(() => {
    const count =
      typeof variantsField?.value === 'number'
        ? variantsField.value
        : Array.isArray((getData() as { variants?: unknown[] }).variants)
          ? ((getData() as { variants?: unknown[] }).variants?.length ?? 0)
          : 0

    for (let i = count - 1; i >= 0; i -= 1) {
      dispatchFields({ type: 'REMOVE_ROW', path: 'variants', rowIndex: i })
    }
    return count
  }, [dispatchFields, getData, variantsField?.value])

  const appendVariants = useCallback(
    (variants: GeneratedVariant[]) => {
      const currentCount =
        typeof variantsField?.value === 'number'
          ? variantsField.value
          : Array.isArray((getData() as { variants?: unknown[] }).variants)
            ? ((getData() as { variants?: unknown[] }).variants?.length ?? 0)
            : 0

      variants.forEach((variant, index) => {
        addFieldRow({
          path: 'variants',
          rowIndex: currentCount + index,
          schemaPath: 'variants',
          subFieldState: toSubFieldState(variant),
        })
      })
    },
    [addFieldRow, getData, variantsField?.value],
  )

  const buildAll = useCallback(async () => {
    const data = getData() as {
      sku?: string | null
      prices?: { usd?: number; irt?: number } | null
      compareAtPrices?: { usd?: number; irt?: number } | null
      variants?: {
        attributeValues?: { attribute?: unknown; term?: unknown }[] | null
      }[]
    }

    const attrs = readVariationAttrs()
    if (!attrs.length) {
      toast.error(labels.none)
      return null
    }

    const allTermIds = attrs.flatMap((a) => a.termIds)
    const termSlugById = await fetchTermSlugs(allTermIds)
    const generated = buildVariantsFromAttributes({
      attrs,
      termSlugById,
      baseSku: data.sku,
      prices: data.prices,
      compareAtPrices: data.compareAtPrices,
    })

    if (generated.length > 200) {
      toast.error(labels.tooMany)
      return null
    }

    return { generated, existing: data.variants || [] }
  }, [fetchTermSlugs, getData, labels.none, labels.tooMany, readVariationAttrs])

  const onGenerateMissing = useCallback(async () => {
    setBusy(true)
    try {
      const result = await buildAll()
      if (!result) return

      const existingKeys = new Set(
        result.existing
          .map((v) => existingVariantKey(v))
          .filter((k): k is string => Boolean(k)),
      )

      const missing = result.generated.filter(
        (v) => !existingKeys.has(variantKey(v.attributeValues)),
      )

      if (!missing.length) {
        toast.message(labels.skipped(result.generated.length))
        return
      }

      appendVariants(missing)
      toast.success(
        `${labels.created(missing.length)}${
          result.generated.length - missing.length
            ? ` · ${labels.skipped(result.generated.length - missing.length)}`
            : ''
        }`,
      )
    } catch (error) {
      console.error(error)
      toast.error(isFa ? 'ساخت تنوع ناموفق بود' : 'Failed to generate variations')
    } finally {
      setBusy(false)
    }
  }, [appendVariants, buildAll, isFa, labels])

  const onRegenerate = useCallback(async () => {
    const ok = window.confirm(
      isFa
        ? 'همه تنوع‌های فعلی حذف و از نو ساخته می‌شوند. ادامه؟'
        : 'This will delete all current variations and recreate them. Continue?',
    )
    if (!ok) return

    setBusy(true)
    try {
      const result = await buildAll()
      if (!result) return
      const deleted = clearVariants()
      appendVariants(result.generated)
      toast.success(
        `${labels.deleted(deleted)} · ${labels.created(result.generated.length)}`,
      )
    } catch (error) {
      console.error(error)
      toast.error(isFa ? 'بازسازی تنوع ناموفق بود' : 'Failed to regenerate variations')
    } finally {
      setBusy(false)
    }
  }, [appendVariants, buildAll, clearVariants, isFa, labels])

  const onDeleteAll = useCallback(() => {
    if (!variantRowsCount && !(getData() as { variants?: unknown[] }).variants?.length) {
      return
    }
    const ok = window.confirm(
      isFa ? 'همه تنوع‌ها حذف شوند؟' : 'Delete all variations?',
    )
    if (!ok) return
    const deleted = clearVariants()
    toast.success(labels.deleted(deleted))
  }, [clearVariants, getData, isFa, labels, variantRowsCount])

  const preview = useMemo(() => {
    // Depend on attributesField so preview updates when rows change
    void attrRowsCount
    void attributesField
    const attrs = readVariationAttrs()
    if (!attrs.length) return { count: 0, dims: 0 }
    const count = attrs.reduce((acc, a) => acc * a.termIds.length, 1)
    return { count, dims: attrs.length }
  }, [attrRowsCount, attributesField, readVariationAttrs])

  if (productType && productType !== 'variable') {
    return (
      <div className="field-type ui" style={{ marginBottom: '1.25rem', opacity: 0.75 }}>
        <p style={{ margin: 0 }}>{labels.onlyVariable}</p>
      </div>
    )
  }

  return (
    <div
      className="field-type ui"
      style={{
        background: 'var(--theme-elevation-50)',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 8,
        marginBottom: '1.5rem',
        padding: '1rem 1.1rem',
      }}
    >
      <div style={{ marginBottom: '0.75rem' }}>
        <strong style={{ display: 'block', fontSize: 14, marginBottom: 4 }}>
          {labels.title}
        </strong>
        <p style={{ color: 'var(--theme-elevation-650)', fontSize: 13, margin: 0 }}>
          {labels.help}
        </p>
      </div>

      <div
        style={{
          color: 'var(--theme-elevation-800)',
          fontSize: 13,
          marginBottom: '0.9rem',
        }}
      >
        <div>
          {labels.selected}: <strong>{preview.dims}</strong>
        </div>
        <div>
          {labels.preview}: <strong>{preview.count || 0}</strong>
          {variantRowsCount ? ` · ${isFa ? 'فعلی' : 'current'}: ${variantRowsCount}` : null}
        </div>
        {!preview.count ? (
          <div style={{ color: 'var(--theme-warning-650)', marginTop: 6 }}>{labels.none}</div>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button
          className="btn btn--style-primary btn--size-medium"
          disabled={busy || !preview.count}
          onClick={(e) => {
            e.preventDefault()
            void onGenerateMissing()
          }}
          type="button"
        >
          {labels.generateMissing}
        </button>
        <button
          className="btn btn--style-secondary btn--size-medium"
          disabled={busy || !preview.count}
          onClick={(e) => {
            e.preventDefault()
            void onRegenerate()
          }}
          type="button"
        >
          {labels.regenerate}
        </button>
        <button
          className="btn btn--style-secondary btn--size-medium"
          disabled={busy || !variantRowsCount}
          onClick={(e) => {
            e.preventDefault()
            onDeleteAll()
          }}
          type="button"
        >
          {labels.deleteAll}
        </button>
      </div>

    </div>
  )
}
