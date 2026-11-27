import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { LOCALE_COOKIE, normalizeWebsiteLanguages, starterLanguages } from "@/i18n/languages"
import { LOCALE_HEADER, resolveLocaleRequest, routingFromLanguages } from "@/i18n/routing"
import { getPayloadClient } from "@/lib/payload"

type RouteSettings = {
  languages: ReturnType<typeof normalizeWebsiteLanguages>
  unprefixedDefault: boolean
}

let cached: { at: number; settings: RouteSettings } | null = null
const CACHE_MS = 3000

async function loadSettings(): Promise<RouteSettings> {
  const now = Date.now()
  if (cached && now - cached.at < CACHE_MS) return cached.settings
  try {
    const payload = await getPayloadClient()
    const doc = (await payload.findGlobal({
      slug: "store-settings",
      overrideAccess: true,
    })) as {
      websiteLanguages?: unknown
      defaultLocale?: string | null
      defaultCurrency?: string | null
      enabledCurrencies?: unknown
      unprefixedDefault?: boolean | null
    }
    const settings: RouteSettings = {
      languages: normalizeWebsiteLanguages(doc.websiteLanguages, {
        defaultLocale: doc.defaultLocale,
        defaultCurrency: doc.defaultCurrency,
        enabledCurrencies: doc.enabledCurrencies,
      }),
      unprefixedDefault: Boolean(doc.unprefixedDefault),
    }
    cached = { at: now, settings }
    return settings
  } catch {
    const settings: RouteSettings = {
      languages: starterLanguages({ defaultLocale: "fa", defaultCurrency: "IRT" }),
      unprefixedDefault: false,
    }
    cached = { at: now, settings }
    return settings
  }
}

function withLocale(response: NextResponse, locale: string) {
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname.includes(".")) return NextResponse.next()

  const settings = await loadSettings()
  const routing = routingFromLanguages(settings.languages, settings.unprefixedDefault)
  const decision = resolveLocaleRequest(pathname, routing)

  if (decision.redirectTo && decision.redirectTo !== pathname) {
    const url = request.nextUrl.clone()
    url.pathname = decision.redirectTo
    return withLocale(NextResponse.redirect(url), decision.locale)
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(LOCALE_HEADER, decision.locale)

  if (decision.pathname !== pathname) {
    const url = request.nextUrl.clone()
    url.pathname = decision.pathname
    return withLocale(
      NextResponse.rewrite(url, { request: { headers: requestHeaders } }),
      decision.locale,
    )
  }

  return withLocale(
    NextResponse.next({ request: { headers: requestHeaders } }),
    decision.locale,
  )
}

export const config = {
  matcher: ["/((?!api|admin|documents|_next/static|_next/image|.*\\..*).*)"],
}
