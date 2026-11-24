'use client'

import { Link, useTranslation } from '@payloadcms/ui'
import React from 'react'

import { t } from '@/i18n/admin'

export function ReportsNavLink() {
  const { i18n } = useTranslation()
  const lang = i18n.language === 'fa' ? 'fa' : 'en'
  const label = t.reports[lang]

  return (
    <Link className="nav__link" href="/admin/reports" id="nav-reports">
      <span className="nav__link-label">{label}</span>
    </Link>
  )
}

export default ReportsNavLink
