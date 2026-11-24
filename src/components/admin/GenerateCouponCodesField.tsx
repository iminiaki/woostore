'use client'

import { Button, FieldLabel, toast, useConfig } from '@payloadcms/ui'
import React, { useCallback, useState } from 'react'

import { playErrorSound, playSuccessSound } from '@/lib/feedback-sounds'

function randomCode(prefix: string, length: number) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let body = ''
  for (let i = 0; i < length; i++) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `${prefix}${body}`.toUpperCase()
}

/**
 * Woo-style bulk coupon generator — clones the current draft's discount settings
 * into N new coupon documents with unique codes.
 */
export function GenerateCouponCodesField() {
  useConfig()
  const [prefix, setPrefix] = useState('SAVE')
  const [count, setCount] = useState(5)
  const [length, setLength] = useState(8)
  const [busy, setBusy] = useState(false)
  const [lastCodes, setLastCodes] = useState<string[]>([])

  const generate = useCallback(async () => {
    if (count < 1 || count > 100) {
      playErrorSound()
      toast.error('Generate between 1 and 100 codes')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/store/coupons/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefix: prefix.trim().toUpperCase(),
          count,
          length,
        }),
      })
      const data = (await res.json()) as { codes?: string[]; error?: string }
      if (!res.ok) {
        playErrorSound()
        toast.error(data.error || 'Failed to generate coupons')
        return
      }
      setLastCodes(data.codes || [])
      playSuccessSound()
      toast.success(`Created ${data.codes?.length || 0} coupons`)
    } catch {
      playErrorSound()
      toast.error('Failed to generate coupons')
    } finally {
      setBusy(false)
    }
  }, [count, length, prefix])

  const preview = randomCode(prefix.trim().toUpperCase() || 'SAVE', length)

  return (
    <div
      style={{
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 4,
        padding: 16,
        display: 'grid',
        gap: 12,
      }}
    >
      <FieldLabel label="Generate coupon codes" />
      <p style={{ margin: 0, color: 'var(--theme-elevation-800)', fontSize: 13 }}>
        Creates new coupons with random codes using defaults (10% off, active). Open each coupon to
        refine restrictions. Example: <code>{preview}</code>
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          Prefix
          <input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value.toUpperCase())}
            style={{ padding: '8px 10px', minWidth: 100 }}
          />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          Count
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 1)}
            style={{ padding: '8px 10px', width: 80 }}
          />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          Code length
          <input
            type="number"
            min={4}
            max={16}
            value={length}
            onChange={(e) => setLength(Number(e.target.value) || 8)}
            style={{ padding: '8px 10px', width: 80 }}
          />
        </label>
        <Button buttonStyle="secondary" disabled={busy} onClick={generate} type="button">
          {busy ? 'Generating…' : 'Generate'}
        </Button>
      </div>
      {lastCodes.length > 0 && (
        <div style={{ fontSize: 12, fontFamily: 'monospace' }}>
          {lastCodes.join(', ')}
        </div>
      )}
    </div>
  )
}
