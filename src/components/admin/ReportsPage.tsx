import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import React from 'react'

import { ReportsView } from './ReportsView'

/** Root admin view wrapper so Reports keeps the default sidebar + header. */
export function ReportsPage({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { locale, permissions, req, visibleEntities } = initPageResult

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <ReportsView />
    </DefaultTemplate>
  )
}

export default ReportsPage
