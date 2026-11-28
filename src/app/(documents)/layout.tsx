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
  // Same icons as the storefront; without these the route falls back to app/icon.png.
  icons: {
    icon: [
      { url: '/favicon-light.png', media: '(prefers-color-scheme: light)', type: 'image/png' },
      { url: '/favicon-dark.png', media: '(prefers-color-scheme: dark)', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa">
      <body className={font.className}>{children}</body>
    </html>
  )
}
