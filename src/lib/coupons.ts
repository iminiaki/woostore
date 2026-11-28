export type DiscountType = 'percent' | 'fixed_cart' | 'fixed_product' | 'free_shipping'

export type CouponDoc = {
  id: string | number
  code: string
  description?: string | null
  active?: boolean | null
  discountType: DiscountType
  amount: number
  amountIrt?: number | null
  freeShipping?: boolean | null
  expiryDate?: string | null
  startDate?: string | null
  minimumAmount?: number | null
  maximumAmount?: number | null
  maximumDiscount?: number | null
  minimumAmountIrt?: number | null
  maximumAmountIrt?: number | null
  maximumDiscountIrt?: number | null
  usageLimit?: number | null
  usageLimitPerUser?: number | null
  usageCount?: number | null
  productIds?: (string | number | { id?: string | number })[] | null
  excludedProductIds?: (string | number | { id?: string | number })[] | null
  categoryIds?: (string | number | { id?: string | number })[] | null
  excludedCategoryIds?: (string | number | { id?: string | number })[] | null
  excludeSaleItems?: boolean | null
  individualUse?: boolean | null
  emailRestrictions?: string[] | null
}

export type CartLineForCoupon = {
  productId: string
  categoryId?: string
  quantity: number
  unitPrice: number
  onSale?: boolean
}

export type CouponValidationResult =
  | {
      ok: true
      discountAmount: number
      freeShipping: boolean
      coupon: {
        id: string
        code: string
        type: 'percentage' | 'fixed' | 'free_shipping'
        value: number
        description?: string
        maxDiscount?: number
      }
    }
  | { ok: false; error: string; code: CouponErrorCode; amount?: number }

export type CouponCurrency = 'usd' | 'irt'

export type CouponErrorCode =
  | 'inactive'
  | 'notStarted'
  | 'expired'
  | 'usageLimit'
  | 'userLimit'
  | 'email'
  | 'minimum'
  | 'maximum'
  | 'noEligible'
  | 'currency'

/** Money values for the cart's currency. Toman carts never fall back to the USD numbers. */
function moneyRules(coupon: CouponDoc, currency: CouponCurrency) {
  if (currency === 'irt') {
    return {
      fixedAmount: coupon.amountIrt ?? null,
      minimumAmount: coupon.minimumAmountIrt ?? null,
      maximumAmount: coupon.maximumAmountIrt ?? null,
      maximumDiscount: coupon.maximumDiscountIrt ?? null,
    }
  }
  return {
    fixedAmount: Number(coupon.amount || 0),
    minimumAmount: coupon.minimumAmount ?? null,
    maximumAmount: coupon.maximumAmount ?? null,
    maximumDiscount: coupon.maximumDiscount ?? null,
  }
}

function formatLimit(amount: number, currency: CouponCurrency) {
  return currency === 'irt' ? `${amount.toLocaleString('en-US')} Toman` : `$${amount}`
}

function relIds(list?: (string | number | { id?: string | number })[] | null): string[] {
  if (!list?.length) return []
  return list
    .map((item) => {
      if (item == null) return null
      if (typeof item === 'object') return item.id != null ? String(item.id) : null
      return String(item)
    })
    .filter(Boolean) as string[]
}

function lineEligible(coupon: CouponDoc, line: CartLineForCoupon): boolean {
  if (coupon.excludeSaleItems && line.onSale) return false

  const products = relIds(coupon.productIds)
  const excludedProducts = relIds(coupon.excludedProductIds)
  const categories = relIds(coupon.categoryIds)
  const excludedCategories = relIds(coupon.excludedCategoryIds)

  if (excludedProducts.includes(line.productId)) return false
  if (line.categoryId && excludedCategories.includes(line.categoryId)) return false

  if (products.length && !products.includes(line.productId)) return false
  if (categories.length) {
    if (!line.categoryId || !categories.includes(line.categoryId)) return false
  }

  return true
}

export function calculateCouponDiscount(
  coupon: CouponDoc,
  lines: CartLineForCoupon[],
  options?: { email?: string; userUsageCount?: number; currency?: CouponCurrency },
): CouponValidationResult {
  const currency: CouponCurrency = options?.currency === 'irt' ? 'irt' : 'usd'
  const rules = moneyRules(coupon, currency)

  if (!coupon.active) {
    return { ok: false, error: 'This coupon is inactive', code: 'inactive' }
  }

  const now = Date.now()
  if (coupon.startDate && new Date(coupon.startDate).getTime() > now) {
    return { ok: false, error: 'This coupon is not valid yet', code: 'notStarted' }
  }
  if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < now) {
    return { ok: false, error: 'This coupon has expired', code: 'expired' }
  }

  if (coupon.usageLimit != null && Number(coupon.usageCount || 0) >= coupon.usageLimit) {
    return { ok: false, error: 'Coupon usage limit reached', code: 'usageLimit' }
  }

  if (
    coupon.usageLimitPerUser != null &&
    options?.userUsageCount != null &&
    options.userUsageCount >= coupon.usageLimitPerUser
  ) {
    return { ok: false, error: 'You have already used this coupon the maximum times', code: 'userLimit' }
  }

  const emails = (coupon.emailRestrictions || [])
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (emails.length) {
    const email = options?.email?.trim().toLowerCase()
    if (!email || !emails.includes(email)) {
      return { ok: false, error: 'This coupon is not valid for your email', code: 'email' }
    }
  }

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)
  const isFixed = coupon.discountType === 'fixed_cart' || coupon.discountType === 'fixed_product'
  if (isFixed && rules.fixedAmount == null) {
    return { ok: false, error: 'This coupon is not available in this currency', code: 'currency' }
  }
  if (rules.minimumAmount != null && subtotal < rules.minimumAmount) {
    return {
      ok: false,
      error: `Minimum order amount of ${formatLimit(rules.minimumAmount, currency)} required`,
      code: 'minimum',
      amount: rules.minimumAmount,
    }
  }
  if (rules.maximumAmount != null && subtotal > rules.maximumAmount) {
    return {
      ok: false,
      error: `This coupon only applies to orders up to ${formatLimit(rules.maximumAmount, currency)}`,
      code: 'maximum',
      amount: rules.maximumAmount,
    }
  }

  const eligible = lines.filter((l) => lineEligible(coupon, l))
  const eligibleSubtotal = eligible.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)

  if (
    (coupon.discountType === 'fixed_product' ||
      coupon.discountType === 'percent' ||
      relIds(coupon.productIds).length > 0 ||
      relIds(coupon.categoryIds).length > 0) &&
    eligible.length === 0
  ) {
    return { ok: false, error: 'No eligible products in your cart for this coupon', code: 'noEligible' }
  }

  let discountAmount = 0
  let freeShipping = Boolean(coupon.freeShipping) || coupon.discountType === 'free_shipping'

  switch (coupon.discountType) {
    case 'percent': {
      const base = eligible.length ? eligibleSubtotal : subtotal
      discountAmount = (base * Number(coupon.amount || 0)) / 100
      if (rules.maximumDiscount != null) {
        discountAmount = Math.min(discountAmount, rules.maximumDiscount)
      }
      break
    }
    case 'fixed_cart': {
      discountAmount = Math.min(Number(rules.fixedAmount || 0), subtotal)
      break
    }
    case 'fixed_product': {
      // Per eligible unit, Woo-style
      const units = eligible.reduce((n, l) => n + l.quantity, 0)
      discountAmount = Math.min(Number(rules.fixedAmount || 0) * units, eligibleSubtotal)
      break
    }
    case 'free_shipping': {
      discountAmount = 0
      freeShipping = true
      break
    }
  }

  discountAmount = Math.max(0, Math.min(discountAmount, subtotal))
  // Toman has no fractional unit.
  if (currency === 'irt') discountAmount = Math.round(discountAmount)

  const type: 'percentage' | 'fixed' | 'free_shipping' =
    coupon.discountType === 'percent'
      ? 'percentage'
      : coupon.discountType === 'free_shipping'
        ? 'free_shipping'
        : 'fixed'

  return {
    ok: true,
    discountAmount,
    freeShipping,
    coupon: {
      id: String(coupon.id),
      code: coupon.code,
      type,
      value:
        coupon.discountType === 'percent' ? Number(coupon.amount || 0) : Number(rules.fixedAmount || 0),
      description: coupon.description || undefined,
      maxDiscount: rules.maximumDiscount ?? undefined,
    },
  }
}
