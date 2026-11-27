import { cache } from "react"
import { cookies, headers } from "next/headers"

import {
  LOCALE_COOKIE,
  normalizeWebsiteLanguages,
  starterLanguages,
  toPayloadLocale,
  type WebsiteLanguage,
} from "@/i18n/languages"
import { translate, type MessageKey } from "@/i18n/messages"
import { LOCALE_HEADER } from "@/i18n/routing"
import { getPayloadClient } from "@/lib/payload"

export type StorefrontRoutes = {
  languages: WebsiteLanguage[]
  unprefixedDefault: boolean
}

export const getStorefrontRoutes = cache(async (): Promise<StorefrontRoutes> => {
  try {
    const payload = await getPayloadClient()
    const settings = await payload.findGlobal({
      slug: "store-settings",
      overrideAccess: true,
    })
    const doc = settings as {
      websiteLanguages?: unknown
      defaultLocale?: string | null
      defaultCurrency?: string | null
      enabledCurrencies?: unknown
      unprefixedDefault?: boolean | null
    }
    return {
      languages: normalizeWebsiteLanguages(doc.websiteLanguages, {
        defaultLocale: doc.defaultLocale,
        defaultCurrency: doc.defaultCurrency,
        enabledCurrencies: doc.enabledCurrencies,
      }),
      unprefixedDefault: Boolean(doc.unprefixedDefault),
    }
  } catch {
    return {
      languages: starterLanguages({ defaultLocale: "fa", defaultCurrency: "IRT" }),
      unprefixedDefault: false,
    }
  }
})

export const getWebsiteLanguages = cache(async () => {
  const routes = await getStorefrontRoutes()
  return routes.languages
})

export const getRequestLocale = cache(async () => {
  const routes = await getStorefrontRoutes()
  const headerStore = await headers()
  const jar = await cookies()
  const fromHeader = headerStore.get(LOCALE_HEADER)?.toLowerCase()
  const fromCookie = jar.get(LOCALE_COOKIE)?.value?.toLowerCase()
  const requested = fromHeader || fromCookie
  const active =
    routes.languages.find((language) => language.code === requested) ||
    routes.languages.find((language) => language.isDefault) ||
    routes.languages[0]
  const fallback = routes.languages.find((language) => language.isDefault) || routes.languages[0]
  return {
    languages: routes.languages,
    unprefixedDefault: routes.unprefixedDefault,
    active,
    payloadLocale: toPayloadLocale(active.code, fallback.code),
  }
})

export async function getTranslator() {
  const request = await getRequestLocale()
  return {
    ...request,
    t: (key: MessageKey, vars?: Record<string, string | number>) =>
      translate(request.active.code, key, vars),
  }
}
