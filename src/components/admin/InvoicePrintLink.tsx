'use client'

import { Button, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import React from 'react'

export function InvoicePrintLink() {
  const info = useDocumentInfo()
  const number = useFormFields(([fields]) => fields.number?.value) as string | undefined
  const token = useFormFields(([fields]) => fields.viewToken?.value) as string | undefined
  const docNumber = number || (info.data?.number as string | undefined)
  const docToken = token || (info.data?.viewToken as string | undefined)

  if (!docNumber || !docToken) return null

  const href = `/documents/${encodeURIComponent(docNumber)}?token=${encodeURIComponent(docToken)}`

  return (
    <div style={{ marginBottom: 12 }}>
      <Button buttonStyle="secondary" el="anchor" url={href} newTab={true}>
        Open printable document
      </Button>
    </div>
  )
}
