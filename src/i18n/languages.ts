export type TextDirection = "ltr" | "rtl"
export type StoreCurrency = "IRT" | "USD"
export type PayloadContentLocale = "fa" | "en"

export const LOCALE_COOKIE = "lastore-lang"

export type WebsiteLanguage = {
  id?: string
  code: string
  label: string
  direction: TextDirection
  currency: StoreCurrency
  isDefault: boolean
}

export type LanguagePreset = WebsiteLanguage & {
  intlLocale: string
}

/** Languages whose script is right-to-left when the code is not in the preset list. */
const RTL_BASES = new Set(["ar", "fa", "he", "ur", "ps", "sd", "ug", "dv", "yi", "ckb"])

export const LANGUAGE_PRESETS: LanguagePreset[] = [
  { code: "fa", label: "فارسی", direction: "rtl", currency: "IRT", isDefault: false, intlLocale: "fa-IR" },
  { code: "en", label: "English", direction: "ltr", currency: "USD", isDefault: false, intlLocale: "en-US" },
  { code: "ar", label: "العربية", direction: "rtl", currency: "USD", isDefault: false, intlLocale: "ar" },
  { code: "tr", label: "Türkçe", direction: "ltr", currency: "USD", isDefault: false, intlLocale: "tr-TR" },
  { code: "de", label: "Deutsch", direction: "ltr", currency: "USD", isDefault: false, intlLocale: "de-DE" },
  { code: "fr", label: "Français", direction: "ltr", currency: "USD", isDefault: false, intlLocale: "fr-FR" },
  { code: "es", label: "Español", direction: "ltr", currency: "USD", isDefault: false, intlLocale: "es-ES" },
  { code: "it", label: "Italiano", direction: "ltr", currency: "USD", isDefault: false, intlLocale: "it-IT" },
  { code: "pt", label: "Português", direction: "ltr", currency: "USD", isDefault: false, intlLocale: "pt-PT" },
  { code: "nl", label: "Nederlands", direction: "ltr", currency: "USD", isDefault: false, intlLocale: "nl-NL" },
  { code: "ru", label: "Русский", direction: "ltr", currency: "USD", isDefault: false, intlLocale: "ru-RU" },
  { code: "zh", label: "中文", direction: "ltr", currency: "USD", isDefault: false, intlLocale: "zh-CN" },
  { code: "ja", label: "日本語", direction: "ltr", currency: "USD", isDefault: false, intlLocale: "ja-JP" },
  { code: "ko", label: "한국어", direction: "ltr", currency: "USD", isDefault: false, intlLocale: "ko-KR" },
  { code: "hi", label: "हिन्दी", direction: "ltr", currency: "USD", isDefault: false, intlLocale: "hi-IN" },
  { code: "ur", label: "اردو", direction: "rtl", currency: "USD", isDefault: false, intlLocale: "ur" },
  { code: "he", label: "עברית", direction: "rtl", currency: "USD", isDefault: false, intlLocale: "he" },
  { code: "ps", label: "پښتو", direction: "rtl", currency: "USD", isDefault: false, intlLocale: "ps" },
  { code: "ckb", label: "کوردیی ناوەندی", direction: "rtl", currency: "USD", isDefault: false, intlLocale: "ckb" },
  { code: "az", label: "Azərbaycan", direction: "ltr", currency: "USD", isDefault: false, intlLocale: "az" },
]

const CODE_PATTERN = /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/

export function isLanguageCode(code: string) {
  return CODE_PATTERN.test(code.trim().toLowerCase())
}

function displayName(code: string) {
  try {
    const name = new Intl.DisplayNames([code, "en"], { type: "language" }).of(code)
    if (!name || name.toLowerCase() === code.toLowerCase()) return ""
    return name
  } catch {
    return ""
  }
}

export function defaultsFor(code: string): LanguagePreset {
  const normalized = code.trim().toLowerCase()
  const exact = LANGUAGE_PRESETS.find((preset) => preset.code === normalized)
  if (exact) return { ...exact, isDefault: false }

  const base = normalized.split("-")[0] || normalized
  const byBase = LANGUAGE_PRESETS.find((preset) => preset.code === base)
  const native = byBase?.label || displayName(normalized) || displayName(base) || normalized.toUpperCase()

  return {
    code: normalized,
    label: native,
    direction: byBase?.direction || (RTL_BASES.has(base) ? "rtl" : "ltr"),
    currency: byBase?.currency || "USD",
    isDefault: false,
    intlLocale: byBase?.intlLocale || normalized,
  }
}

export function toPayloadLocale(code: string, fallbackCode = "fa"): PayloadContentLocale {
  const base = code.toLowerCase().split("-")[0]
  if (base === "fa" || base === "en") return base
  const fallback = fallbackCode.toLowerCase().split("-")[0]
  if (fallback === "fa" || fallback === "en") return fallback
  return "fa"
}

export function localeCookie(code: string) {
  return `${LOCALE_COOKIE}=${encodeURIComponent(code)}; Path=/; Max-Age=31536000; SameSite=Lax`
}

function readAmount(value: unknown): number | undefined {
  if (typeof value === "number" && !Number.isNaN(value)) return value
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value)
  return undefined
}

export function pickPrice(
  prices: { usd?: number | null; irt?: number | null } | null | undefined,
  currency: StoreCurrency,
): number {
  const primary = readAmount(currency === "IRT" ? prices?.irt : prices?.usd)
  if (primary != null) return primary
  const secondary = readAmount(currency === "IRT" ? prices?.usd : prices?.irt)
  return secondary ?? 0
}

export function pickOptionalPrice(
  prices: { usd?: number | null; irt?: number | null } | null | undefined,
  currency: StoreCurrency,
): number | undefined {
  return readAmount(currency === "IRT" ? prices?.irt : prices?.usd)
}

export function usesTomanMark(currency: StoreCurrency, localeCode: string) {
  return currency === "IRT" && localeCode.toLowerCase().split("-")[0] === "fa"
}

/** Formatted amount. Persian toman prices are the number only; the toman sign is drawn beside them. */
export function formatStoreAmount(amount: number, currency: StoreCurrency, localeCode: string) {
  const intl = defaultsFor(localeCode).intlLocale
  const value = Number(amount) || 0
  if (currency === "IRT") {
    const formatted = new Intl.NumberFormat(intl, { maximumFractionDigits: 0 }).format(Math.round(value))
    return usesTomanMark(currency, localeCode) ? formatted : `${formatted} IRT`
  }
  return new Intl.NumberFormat(intl, { style: "currency", currency: "USD" }).format(value)
}

export function formatStoreMoney(amount: number, currency: StoreCurrency, localeCode: string) {
  return formatStoreAmount(amount, currency, localeCode)
}

/** Digits and grouping for the active language, including Persian numerals. */
export function formatLocaleNumber(
  value: number,
  localeCode: string,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(defaultsFor(localeCode).intlLocale, options).format(value)
}

function enabledCurrencies(raw: unknown): StoreCurrency[] {
  const list = Array.isArray(raw) ? raw.filter((item): item is StoreCurrency => item === "IRT" || item === "USD") : []
  return list.length ? list : ["IRT", "USD"]
}

function coerceCurrency(currency: StoreCurrency, enabled: StoreCurrency[]): StoreCurrency {
  if (enabled.includes(currency)) return currency
  return enabled[0] || "IRT"
}

function parseLanguage(row: unknown, enabled: StoreCurrency[]): WebsiteLanguage | null {
  if (!row || typeof row !== "object") return null
  const record = row as Record<string, unknown>
  const code = String(record.code || "").trim().toLowerCase()
  if (!isLanguageCode(code)) return null
  const defaults = defaultsFor(code)
  const direction: TextDirection = record.direction === "rtl" || record.direction === "ltr"
    ? record.direction
    : defaults.direction
  const requested: StoreCurrency = record.currency === "IRT" || record.currency === "USD"
    ? record.currency
    : defaults.currency
  const label = String(record.label || "").trim() || defaults.label
  const id = typeof record.id === "string" ? record.id : undefined
  return {
    ...(id ? { id } : {}),
    code,
    label,
    direction,
    currency: coerceCurrency(requested, enabled),
    isDefault: Boolean(record.isDefault),
  }
}

export function starterLanguages(hints?: {
  defaultLocale?: string | null
  defaultCurrency?: string | null
}): WebsiteLanguage[] {
  const preferred = String(hints?.defaultLocale || "fa").trim().toLowerCase()
  const codes = [isLanguageCode(preferred) ? preferred : "fa"]
  for (const code of ["fa", "en"]) {
    if (!codes.includes(code)) codes.push(code)
  }
  const enabled = enabledCurrencies(["IRT", "USD"])
  const preferredCurrency: StoreCurrency = hints?.defaultCurrency === "USD" || hints?.defaultCurrency === "IRT"
    ? hints.defaultCurrency
    : defaultsFor(codes[0]).currency

  return codes.map((code, index) => {
    const defaults = defaultsFor(code)
    return {
      code: defaults.code,
      label: defaults.label,
      direction: defaults.direction,
      currency: coerceCurrency(index === 0 ? preferredCurrency : defaults.currency, enabled),
      isDefault: index === 0,
    }
  })
}

export function normalizeWebsiteLanguages(
  raw: unknown,
  hints?: {
    defaultLocale?: string | null
    defaultCurrency?: string | null
    enabledCurrencies?: unknown
  },
): WebsiteLanguage[] {
  const enabled = enabledCurrencies(hints?.enabledCurrencies)
  const parsed = (Array.isArray(raw) ? raw : [])
    .map((row) => parseLanguage(row, enabled))
    .filter((row): row is WebsiteLanguage => Boolean(row))

  const unique: WebsiteLanguage[] = []
  for (const row of parsed) {
    if (unique.some((item) => item.code === row.code)) continue
    unique.push(row)
  }

  const languages = unique.length ? unique : starterLanguages(hints).map((row) => ({
    ...row,
    currency: coerceCurrency(row.currency, enabled),
  }))

  let defaultIndex = languages.findIndex((row) => row.isDefault)
  if (defaultIndex < 0) defaultIndex = 0

  return languages.map((row, index) => ({
    ...row,
    currency: coerceCurrency(row.currency, enabled),
    isDefault: index === defaultIndex,
  }))
}

export function applyLanguageDefaults<T extends Record<string, unknown>>(data: T): T {
  const languages = normalizeWebsiteLanguages(data.websiteLanguages, {
    defaultLocale: typeof data.defaultLocale === "string" ? data.defaultLocale : null,
    defaultCurrency: typeof data.defaultCurrency === "string" ? data.defaultCurrency : null,
    enabledCurrencies: data.enabledCurrencies,
  })
  const selected = languages.find((row) => row.isDefault) || languages[0]
  return {
    ...data,
    websiteLanguages: languages,
    defaultLocale: toPayloadLocale(selected.code, "fa"),
    defaultCurrency: selected.currency,
  }
}
