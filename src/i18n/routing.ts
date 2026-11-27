import type { WebsiteLanguage } from "@/i18n/languages"

export const LOCALE_HEADER = "x-lastore-locale"

export type LocaleRouting = {
  codes: string[]
  defaultCode: string
  unprefixedDefault: boolean
}

const RESERVED = [/^\/admin(?:\/|$)/, /^\/api(?:\/|$)/, /^\/documents(?:\/|$)/, /^\/_next(?:\/|$)/]

export function routingFromLanguages(
  languages: Pick<WebsiteLanguage, "code" | "isDefault">[],
  unprefixedDefault: boolean,
): LocaleRouting {
  const codes = languages.map((language) => language.code.toLowerCase())
  const defaultCode = languages.find((language) => language.isDefault)?.code.toLowerCase() || codes[0] || "fa"
  return { codes, defaultCode, unprefixedDefault }
}

export function isReservedPath(pathname: string) {
  return RESERVED.some((pattern) => pattern.test(pathname))
}

export function splitLocalePath(pathname: string, codes: string[]) {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`
  const segments = normalized.split("/")
  const head = (segments[1] || "").toLowerCase()
  if (head && codes.includes(head)) {
    const rest = `/${segments.slice(2).join("/")}`.replace(/\/+$/, "") || "/"
    return { locale: head, pathname: rest }
  }
  return { locale: null as string | null, pathname: normalized || "/" }
}

/** Prefix an internal storefront href. Reserved, external, and hash links stay as they are. */
export function localizePath(href: string, code: string, routing: LocaleRouting) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return href
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return href
  if (!href.startsWith("/")) return href

  const hashAt = href.indexOf("#")
  const hash = hashAt >= 0 ? href.slice(hashAt) : ""
  const beforeHash = hashAt >= 0 ? href.slice(0, hashAt) : href
  const queryAt = beforeHash.indexOf("?")
  const query = queryAt >= 0 ? beforeHash.slice(queryAt) : ""
  const pathname = queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash
  if (isReservedPath(pathname)) return href

  const bare = splitLocalePath(pathname, routing.codes).pathname
  const hidePrefix = routing.unprefixedDefault && code === routing.defaultCode
  const prefix = hidePrefix ? "" : `/${code}`
  const next = bare === "/" ? prefix || "/" : `${prefix}${bare}`
  return `${next}${query}${hash}`
}

function prefixedPath(pathname: string, code: string) {
  return pathname === "/" ? `/${code}` : `/${code}${pathname}`
}

/**
 * Map a public URL onto the `[locale]` routes.
 * A known prefix stays visible. With the main-URL option on, the default language
 * is rewritten internally to `/${defaultCode}/...` and its own prefix redirects back.
 */
export function resolveLocaleRequest(pathname: string, routing: LocaleRouting) {
  if (isReservedPath(pathname)) {
    return { locale: routing.defaultCode, pathname, redirectTo: null as string | null }
  }

  const split = splitLocalePath(pathname, routing.codes)
  if (split.locale) {
    if (routing.unprefixedDefault && split.locale === routing.defaultCode) {
      return { locale: split.locale, pathname: split.pathname, redirectTo: split.pathname }
    }
    return { locale: split.locale, pathname, redirectTo: null as string | null }
  }

  const internal = prefixedPath(pathname, routing.defaultCode)
  if (!routing.unprefixedDefault) {
    return { locale: routing.defaultCode, pathname, redirectTo: internal }
  }

  return { locale: routing.defaultCode, pathname: internal, redirectTo: null as string | null }
}
