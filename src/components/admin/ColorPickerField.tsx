'use client'

import { FieldError, FieldLabel, useField } from '@payloadcms/ui'
import React, { useMemo } from 'react'

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

function normalizeHex(value: string | null | undefined): string {
  if (!value) return '#000000'
  const v = value.trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v.toUpperCase()
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
    const [, r, g, b] = v
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  if (/^[0-9A-Fa-f]{6}$/.test(v)) return `#${v}`.toUpperCase()
  return '#000000'
}

export function ColorPickerField({ field, path, readOnly }: Props) {
  const { value, setValue, showError, errorMessage } = useField<string>({ path })
  const pickerValue = useMemo(() => normalizeHex(value), [value])

  return (
    <div className="field-type text" style={{ marginBottom: '1.5rem' }}>
      <FieldLabel label={field.label} path={path} required={field.required} />

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <input
          aria-label="Color picker"
          disabled={readOnly}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          style={{
            background: 'transparent',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 6,
            cursor: readOnly ? 'not-allowed' : 'pointer',
            height: 40,
            padding: 2,
            width: 52,
          }}
          type="color"
          value={pickerValue}
        />

        <input
          disabled={readOnly}
          onBlur={(e) => {
            const next = e.target.value.trim()
            if (!next) {
              setValue(undefined)
              return
            }
            setValue(normalizeHex(next))
          }}
          onChange={(e) => setValue(e.target.value)}
          placeholder="#000000"
          style={{
            background: 'var(--theme-input-bg)',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 4,
            color: 'var(--theme-elevation-800)',
            flex: '1 1 140px',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            height: 40,
            maxWidth: 180,
            padding: '0 12px',
          }}
          type="text"
          value={value ?? ''}
        />

        <span
          aria-hidden
          style={{
            background: pickerValue,
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 999,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.08)',
            display: 'inline-block',
            flex: '0 0 auto',
            height: 28,
            width: 28,
          }}
          title={pickerValue}
        />
      </div>

      {field.admin?.description ? (
        <div className="field-description" style={{ marginTop: 6 }}>
          {typeof field.admin.description === 'string'
            ? field.admin.description
            : field.admin.description.en || Object.values(field.admin.description)[0]}
        </div>
      ) : null}

      <FieldError message={errorMessage} path={path} showError={showError} />
    </div>
  )
}
