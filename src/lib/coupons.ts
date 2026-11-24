export type DiscountType = 'percent' | 'fixed_cart' | 'fixed_product' | 'free_shipping'

export type CouponDoc = {
  id: string | number
  code: string
  description?: string | null
  active?: boolean | null
  discountType: DiscountType
  amount: number
  freeShipping?: boolean | null
  expiryDate?: string | null
  startDate?: string | null
  minimumAmount?: number | null
  maximumAmount?: number | null
  maximumDiscount?: number | null
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
  | { ok: false; error: string }

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
  options?: { email?: string; userUsageCount?: number },
): CouponValidationResult {
  if (!coupon.active) {
    return { ok: false, error: 'This coupon is inactive' }
  }

  const now = Date.now()
  if (coupon.startDate && new Date(coupon.startDate).getTime() > now) {
    return { ok: false, error: 'This coupon is not valid yet' }
  }
  if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < now) {
    return { ok: false, error: 'This coupon has expired' }
  }

  if (coupon.usageLimit != null && Number(coupon.usageCount || 0) >= coupon.usageLimit) {
    return { ok: false, error: 'Coupon usage limit reached' }
  }

  if (
    coupon.usageLimitPerUser != null &&
    options?.userUsageCount != null &&
    options.userUsageCount >= coupon.usageLimitPerUser
  ) {
    return { ok: false, error: 'You have already used this coupon the maximum times' }
  }

  const emails = (coupon.emailRestrictions || [])
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (emails.length) {
    const email = options?.email?.trim().toLowerCase()
    if (!email || !emails.includes(email)) {
      return { ok: false, error: 'This coupon is not valid for your email' }
    }
  }

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)
  if (coupon.minimumAmount != null && subtotal < coupon.minimumAmount) {
    return {
      ok: false,
      error: `Minimum order amount of $${coupon.minimumAmount} required`,
    }
  }
  if (coupon.maximumAmount != null && subtotal > coupon.maximumAmount) {
    return {
      ok: false,
      error: `This coupon only applies to orders up to $${coupon.maximumAmount}`,
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
    return { ok: false, error: 'No eligible products in your cart for this coupon' }
  }

  let discountAmount = 0
  let freeShipping = Boolean(coupon.freeShipping) || coupon.discountType === 'free_shipping'

  switch (coupon.discountType) {
    case 'percent': {
      const base = eligible.length ? eligibleSubtotal : subtotal
      discountAmount = (base * Number(coupon.amount || 0)) / 100
      if (coupon.maximumDiscount != null) {
        discountAmount = Math.min(discountAmount, coupon.maximumDiscount)
      }
      break
    }
    case 'fixed_cart': {
      discountAmount = Math.min(Number(coupon.amount || 0), subtotal)
      break
    }
    case 'fixed_product': {
      // Per eligible unit, Woo-style
      const units = eligible.reduce((n, l) => n + l.quantity, 0)
      discountAmount = Math.min(Number(coupon.amount || 0) * units, eligibleSubtotal)
      break
    }
    case 'free_shipping': {
      discountAmount = 0
      freeShipping = true
      break
    }
  }

  discountAmount = Math.max(0, Math.min(discountAmount, subtotal))

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
      value: Number(coupon.amount || 0),
      description: coupon.description || undefined,
      maxDiscount: coupon.maximumDiscount ?? undefined,
    },
  }
}
