'use client'

import type { DefaultCellComponentProps } from 'payload'
import { useConfig } from '@payloadcms/ui'
import React, { useEffect, useMemo, useState } from 'react'

type MediaDoc = {
  id?: string | number
  url?: string | null
  thumbnailURL?: string | null
  filename?: string | null
  sizes?: {
    thumbnail?: { url?: string | null } | null
  } | null
}

function mediaUrl(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const media = value as MediaDoc
  return media.sizes?.thumbnail?.url || media.thumbnailURL || media.url || null
}

function mainRef(cellData: unknown, rowData: Record<string, unknown> | undefined): unknown {
  if (Array.isArray(cellData) && cellData.length) return cellData[0]
  if (cellData != null && !Array.isArray(cellData)) return cellData
  const images = rowData?.images
  if (Array.isArray(images) && images.length) return images[0]
  return null
}

function refId(value: unknown): string | number | null {
  if (value == null) return null
  if (typeof value === 'string' || typeof value === 'number') return value
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: string | number }).id
    return id ?? null
  }
  return null
}

/**
 * Products list cell — shows only the main (first) gallery image.
 * List queries return media IDs (depth 0), so we resolve the thumbnail via API when needed.
 */
export function ProductMainImageCell(props: DefaultCellComponentProps) {
  const { config } = useConfig()
  const api = config.routes.api

  const raw = useMemo(
    () => mainRef(props.cellData, props.rowData as Record<string, unknown> | undefined),
    [props.cellData, props.rowData],
  )
  const id = refId(raw)
  const immediateSrc = mediaUrl(raw)
  const [src, setSrc] = useState<string | null>(immediateSrc)

  useEffect(() => {
    setSrc(immediateSrc)
  }, [immediateSrc, id])

  useEffect(() => {
    if (immediateSrc || id == null) return

    const controller = new AbortController()
    void fetch(`${api}/media/${id}?depth=0`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((doc) => {
        const url = mediaUrl(doc)
        if (url) setSrc(url)
      })
      .catch(() => {
        /* aborted or failed — keep placeholder */
      })

    return () => controller.abort()
  }, [api, id, immediateSrc])

  if (!src) {
    return (
      <div
        title={id != null ? `Media #${id}` : undefined}
        style={{
          alignItems: 'center',
          background: 'var(--theme-elevation-100)',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: 6,
          color: 'var(--theme-elevation-500)',
          display: 'grid',
          fontSize: 10,
          height: 40,
          placeItems: 'center',
          width: 40,
        }}
      >
        —
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt=""
      src={src}
      style={{
        background: 'var(--theme-elevation-50)',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 6,
        display: 'block',
        height: 40,
        objectFit: 'cover',
        width: 40,
      }}
    />
  )
}

export default ProductMainImageCell
