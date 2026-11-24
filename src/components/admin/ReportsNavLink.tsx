'use client'

import { Link } from '@payloadcms/ui'
import React from 'react'

export function ReportsNavLink() {
  return (
    <Link className="nav__link" href="/admin/reports" id="nav-reports">
      <span className="nav__link-label">Reports</span>
    </Link>
  )
}

export default ReportsNavLink
