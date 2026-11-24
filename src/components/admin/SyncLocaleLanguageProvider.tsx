'use client'

import type { AcceptedLanguages } from '@payloadcms/translations'
import { useLocale, useTranslation } from '@payloadcms/ui'
import React, { useEffect, useRef } from 'react'

const SUPPORTED_ADMIN_LANGS = new Set(['fa', 'en'])

/**
 * Keeps Payload admin UI language (and RTL via payload-lng) in sync with the
 * content locale selector in the top bar.
 */
export function SyncLocaleLanguageProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = useLocale()
  const { i18n, switchLanguage } = useTranslation()
  const switchingRef = useRef(false)

  useEffect(() => {
    const localeCode =
      locale && typeof locale === 'object' && 'code' in locale
        ? String((locale as { code?: string }).code || '')
        : ''

    if (!localeCode || !SUPPORTED_ADMIN_LANGS.has(localeCode)) return
    if (!switchLanguage) return
    if (i18n.language === localeCode) return
    if (switchingRef.current) return

    switchingRef.current = true
    void switchLanguage(localeCode as AcceptedLanguages).finally(() => {
      switchingRef.current = false
    })
  }, [locale, i18n.language, switchLanguage])

  return children
}
