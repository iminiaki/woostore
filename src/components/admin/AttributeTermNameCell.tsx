'use client'

import type { DefaultCellComponentProps } from 'payload'
import { DefaultCell } from '@payloadcms/ui'
import React from 'react'

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)
}

function expandHex(hex: string): string {
  if (hex.length === 4) {
    const [, r, g, b] = hex
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return hex
}

/**
 * List cell for Attribute Term name — shows a color swatch when the term has a hex value.
 */
export function AttributeTermNameCell(props: DefaultCellComponentProps) {
  const hex = props.rowData?.hex
  const showSwatch = isHexColor(hex)

  if (!showSwatch) {
    return <DefaultCell {...props} />
  }

  const color = expandHex(hex)

  return (
    <div
      style={{
        alignItems: 'center',
        display: 'inline-flex',
        gap: 8,
        maxWidth: '100%',
        minWidth: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          background: color,
          border: '1px solid var(--theme-elevation-250)',
          borderRadius: 4,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.06)',
          flex: '0 0 auto',
          height: 16,
          width: 16,
        }}
        title={color}
      />
      <span
        style={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <DefaultCell {...props} />
      </span>
    </div>
  )
}
