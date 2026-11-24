import type { Metadata } from 'next'
import { Vazirmatn } from 'next/font/google'
import React from 'react'

import './documents/print.css'

const font = Vazirmatn({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  fallback: ['Tahoma', 'Arial', 'sans-serif'],
})

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa">
      <body className={font.className}>{children}</body>
    </html>
  )
}
