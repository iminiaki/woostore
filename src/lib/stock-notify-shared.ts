const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

export function toWesternDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (ch) => {
    const p = PERSIAN_DIGITS.indexOf(ch)
    if (p >= 0) return String(p)
    const a = ARABIC_DIGITS.indexOf(ch)
    return a >= 0 ? String(a) : ch
  })
}

/** Strip formatting; keep a leading `+` when present (E.164-style). */
export function normalizePhone(raw: string): string {
  const western = toWesternDigits(raw).trim()
  if (!western) return ''
  const hasPlus = western.startsWith('+')
  const digits = western.replace(/\D+/g, '')
  if (!digits) return ''
  return hasPlus ? `+${digits}` : digits
}

/** Accept international numbers: 8–15 digits (ITU E.164). */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D+/g, '')
  return digits.length >= 8 && digits.length <= 15
}

/** @deprecated Use isValidPhone — kept for any older imports. */
export function isValidIranMobile(phone: string): boolean {
  return isValidPhone(phone)
}

export function buildVariantKey(color?: string, size?: string, id?: string): string {
  if (id) return id
  const parts = [color || '', size || ''].filter(Boolean)
  return parts.length ? parts.join('|') : ''
}
