"use client"

import { FieldError, FieldLabel, useField, useFormFields } from "@payloadcms/ui"
import React, { useEffect, useRef, useState } from "react"

import {
  LANGUAGE_PRESETS,
  defaultsFor,
  isLanguageCode,
  normalizeWebsiteLanguages,
  type StoreCurrency,
  type TextDirection,
  type WebsiteLanguage,
} from "@/i18n/languages"

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

const inputStyle: React.CSSProperties = {
  background: "var(--theme-input-bg)",
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: 4,
  color: "var(--theme-elevation-800)",
  fontSize: 13,
  padding: "8px 10px",
  width: "100%",
}

function textOf(value: Record<string, string> | string | undefined, fallback: string) {
  if (!value) return fallback
  if (typeof value === "string") return value
  return value.en || value.fa || fallback
}

export function WebsiteLanguagesField({ field, path, readOnly }: Props) {
  const { value, setValue, showError, errorMessage } = useField<WebsiteLanguage[]>({ path })
  const enabledRaw = useFormFields(([fields]) => fields.enabledCurrencies?.value)
  const savedLocale = useFormFields(([fields]) => fields.defaultLocale?.value)
  const savedCurrency = useFormFields(([fields]) => fields.defaultCurrency?.value)
  const enabled = (Array.isArray(enabledRaw) ? enabledRaw : ["IRT", "USD"]).filter(
    (item): item is StoreCurrency => item === "IRT" || item === "USD",
  )
  const currencies: StoreCurrency[] = enabled.length ? enabled : ["IRT", "USD"]
  const [customCode, setCustomCode] = useState("")
  const [customError, setCustomError] = useState("")
  const seeded = useRef(false)

  useEffect(() => {
    if (seeded.current) return
    if (Array.isArray(value) && value.length > 0) {
      seeded.current = true
      return
    }
    if (savedLocale == null && savedCurrency == null) return
    seeded.current = true
    setValue(
      normalizeWebsiteLanguages(undefined, {
        defaultLocale: typeof savedLocale === "string" ? savedLocale : "fa",
        defaultCurrency: typeof savedCurrency === "string" ? savedCurrency : "IRT",
        enabledCurrencies: currencies,
      }),
    )
  }, [currencies, savedCurrency, savedLocale, setValue, value])

  const rows = normalizeWebsiteLanguages(value, { enabledCurrencies: currencies })
  const stored = Array.isArray(value) && value.length > 0

  const commit = (next: WebsiteLanguage[]) => {
    setValue(normalizeWebsiteLanguages(next, { enabledCurrencies: currencies }))
  }

  const update = (index: number, patch: Partial<WebsiteLanguage>) => {
    commit(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)))
  }

  const add = (code: string) => {
    const normalized = code.trim().toLowerCase()
    if (!isLanguageCode(normalized)) {
      setCustomError("Use a language code like de or pt-BR.")
      return
    }
    if (rows.some((row) => row.code === normalized)) {
      setCustomError("That language is already added.")
      return
    }
    const defaults = defaultsFor(normalized)
    const currency = currencies.includes(defaults.currency) ? defaults.currency : currencies[0]
    commit([
      ...rows,
      {
        code: defaults.code,
        label: defaults.label,
        direction: defaults.direction,
        currency,
        isDefault: rows.length === 0,
      },
    ])
    setCustomCode("")
    setCustomError("")
  }

  const remove = (index: number) => {
    if (rows.length <= 1) return
    const next = rows.filter((_, rowIndex) => rowIndex !== index)
    if (!next.some((row) => row.isDefault)) next[0] = { ...next[0], isDefault: true }
    commit(next)
  }

  const available = LANGUAGE_PRESETS.filter((preset) => !rows.some((row) => row.code === preset.code))

  return (
    <div className="field-type" style={{ marginBottom: "1.5rem" }}>
      <FieldLabel label={field.label} path={path} required={field.required} />
      <p style={{ color: "var(--theme-elevation-500)", fontSize: 13, margin: "0.35rem 0 0.85rem" }}>
        {textOf(
          field.admin?.description,
          "Direction and currency fill in from the language. Persian starts right-to-left with Toman. Both can be changed.",
        )}
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        {rows.map((row, index) => (
          <div
            key={row.id || row.code}
            style={{
              border: "1px solid var(--theme-elevation-150)",
              borderRadius: 8,
              display: "grid",
              gap: 10,
              padding: 12,
            }}
          >
            <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 8 }}>
              <strong style={{ fontSize: 14 }}>{row.label}</strong>
              <span style={{ color: "var(--theme-elevation-450)", fontSize: 12 }}>{row.code}</span>
            </div>
            <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
              Name
              <input
                disabled={readOnly}
                onChange={(event) => update(index, { label: event.target.value })}
                style={inputStyle}
                value={row.label}
              />
            </label>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                Direction
                <select
                  disabled={readOnly}
                  onChange={(event) => update(index, { direction: event.target.value as TextDirection })}
                  style={inputStyle}
                  value={row.direction}
                >
                  <option value="ltr">Left to right</option>
                  <option value="rtl">Right to left</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                Currency
                <select
                  disabled={readOnly}
                  onChange={(event) => update(index, { currency: event.target.value as StoreCurrency })}
                  style={inputStyle}
                  value={row.currency}
                >
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency === "IRT" ? "Toman (IRT)" : "US Dollar (USD)"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 8 }}>
              <label style={{ alignItems: "center", display: "flex", fontSize: 13, gap: 8 }}>
                <input
                  checked={row.isDefault}
                  disabled={readOnly}
                  onChange={() => commit(rows.map((item, rowIndex) => ({ ...item, isDefault: rowIndex === index })))}
                  type="radio"
                />
                Default language
              </label>
              <button
                disabled={readOnly || rows.length <= 1}
                onClick={() => remove(index)}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "var(--theme-error-500)",
                  cursor: rows.length <= 1 ? "not-allowed" : "pointer",
                  fontSize: 13,
                }}
                type="button"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {!stored ? (
        <p style={{ color: "var(--theme-elevation-500)", fontSize: 12, marginTop: 8 }}>
          These defaults are not saved yet. Saving store settings keeps them.
        </p>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        <select
          aria-label="Add a language"
          disabled={readOnly || available.length === 0}
          onChange={(event) => {
            if (event.target.value) add(event.target.value)
            event.target.value = ""
          }}
          style={{ ...inputStyle, width: "auto", minWidth: 220 }}
          value=""
        >
          <option value="">Add a language…</option>
          {available.map((preset) => (
            <option key={preset.code} value={preset.code}>
              {preset.label} ({preset.code})
            </option>
          ))}
        </select>
        <input
          aria-label="Custom language code"
          disabled={readOnly}
          onChange={(event) => {
            setCustomCode(event.target.value)
            setCustomError("")
          }}
          placeholder="Custom code, e.g. de"
          style={{ ...inputStyle, width: 180 }}
          value={customCode}
        />
        <button
          disabled={readOnly || !customCode.trim()}
          onClick={() => add(customCode)}
          style={{
            background: "var(--theme-elevation-100)",
            border: "1px solid var(--theme-elevation-150)",
            borderRadius: 4,
            cursor: "pointer",
            padding: "8px 12px",
          }}
          type="button"
        >
          Add code
        </button>
      </div>
      {customError ? (
        <p style={{ color: "var(--theme-error-500)", fontSize: 12, marginTop: 6 }}>{customError}</p>
      ) : null}
      {showError ? <FieldError message={errorMessage} path={path} /> : null}
    </div>
  )
}
