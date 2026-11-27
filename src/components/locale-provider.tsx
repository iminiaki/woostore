"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { DirectionProvider } from "@radix-ui/react-direction"

import {
  normalizeWebsiteLanguages,
  toPayloadLocale,
  type WebsiteLanguage,
} from "@/i18n/languages"
import { translate, type MessageKey } from "@/i18n/messages"
import { localizePath, routingFromLanguages, splitLocalePath, type LocaleRouting } from "@/i18n/routing"

type LocaleContextValue = {
  languages: WebsiteLanguage[]
  active: WebsiteLanguage
  payloadLocale: "fa" | "en"
  unprefixedDefault: boolean
  routing: LocaleRouting
  setLocale: (code: string) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({
  languages,
  initialCode,
  unprefixedDefault,
  children,
}: {
  languages: WebsiteLanguage[]
  initialCode: string
  unprefixedDefault: boolean
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname() || "/"
  const list = useMemo(
    () => (languages.length ? languages : normalizeWebsiteLanguages(undefined)),
    [languages],
  )
  const [code, setCode] = useState(initialCode)

  useEffect(() => {
    setCode(initialCode)
  }, [initialCode])

  const active = list.find((language) => language.code === code) || list.find((language) => language.isDefault) || list[0]
  const fallback = list.find((language) => language.isDefault) || list[0]
  const routing = useMemo(
    () => routingFromLanguages(list, unprefixedDefault),
    [list, unprefixedDefault],
  )

  const setLocale = useCallback(
    (nextCode: string) => {
      const next = list.find((language) => language.code === nextCode)
      if (!next) return
      const search = typeof window === "undefined" ? "" : window.location.search
      const href = localizePath(`${pathname}${search}`, next.code, routing)
      document.documentElement.lang = next.code
      document.documentElement.dir = next.direction
      setCode(next.code)
      router.push(href)
    },
    [list, pathname, router, routing],
  )

  const value = useMemo<LocaleContextValue>(
    () => ({
      languages: list,
      active,
      payloadLocale: toPayloadLocale(active.code, fallback.code),
      unprefixedDefault,
      routing,
      setLocale,
    }),
    [active, fallback.code, list, routing, setLocale, unprefixedDefault],
  )

  return (
    <LocaleContext.Provider value={value}>
      <DirectionProvider dir={active.direction}>{children}</DirectionProvider>
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  const pathname = usePathname() || "/"
  const fallbackLanguages = normalizeWebsiteLanguages(undefined)
  const languages = ctx?.languages ?? fallbackLanguages
  const active =
    ctx?.active ??
    (fallbackLanguages.find((language) => language.isDefault) || fallbackLanguages[0])
  const routing = ctx?.routing ?? routingFromLanguages(fallbackLanguages, false)
  const path = splitLocalePath(pathname, routing.codes).pathname
  const localize = useCallback(
    (href: string) => localizePath(href, active.code, routing),
    [active.code, routing],
  )

  return {
    languages,
    active,
    payloadLocale: ctx?.payloadLocale ?? toPayloadLocale(active.code, active.code),
    unprefixedDefault: ctx?.unprefixedDefault ?? false,
    routing,
    path,
    localize,
    setLocale: ctx?.setLocale ?? (() => {}),
  }
}

export function useI18n() {
  const locale = useLocale()
  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      translate(locale.active.code, key, vars),
    [locale.active.code],
  )
  return { ...locale, t }
}
