/** Percentage off original price (1–99). Null/0 = no active promo. */
export type PromoDiscountSource = {
  promodiscountpercent?: number | null;
  promoDiscountPercent?: number | null;
};

export type VariantPriceSource = {
  price?: number | null;
  compare_at_price?: number | null;
  compareAtPrice?: number | null;
  promotional_price?: number | null;
  promotionalPrice?: number | null;
};

export type EffectivePriceResult = {
  original: number;
  sale: number;
  promoPercent: number;
  promoActive: boolean;
};

/** Parse admin/API values like 20, "20", "20%", "20,5". */
function parsePromoNumber(raw: unknown): number {
  if (raw === null || raw === undefined || raw === '') return NaN;
  if (typeof raw === 'number') return raw;
  const normalized = String(raw)
    .trim()
    .replace('%', '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  return parseFloat(normalized);
}

export function getPromoDiscountPercent(source: PromoDiscountSource | null | undefined): number {
  if (!source) return 0;
  const value = parsePromoNumber(source.promodiscountpercent ?? source.promoDiscountPercent);
  if (!Number.isFinite(value) || value <= 0) return 0;
  // Whole-percent discounts only (avoids float drift like 19.999 → odd UI).
  return Math.min(99, Math.max(1, Math.round(value)));
}

export function hasActivePromo(source: PromoDiscountSource | null | undefined): boolean {
  return getPromoDiscountPercent(source) > 0;
}

/** Round money to 2 decimals. */
export function roundMoney(amount: number): number {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

export function getPromoSalePrice(originalPrice: number, source: PromoDiscountSource | null | undefined): number {
  const percent = getPromoDiscountPercent(source);
  if (percent <= 0) return roundMoney(originalPrice);
  return roundMoney(originalPrice * (1 - percent / 100));
}

export function normalizePromoDiscountPercent(input: unknown): number | null {
  const value = parsePromoNumber(input);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.min(99, Math.max(1, Math.round(value)));
}

export function getVariantPromotionalPrice(
  variant: VariantPriceSource | null | undefined
): number | null {
  if (!variant) return null;
  const raw = variant.promotional_price ?? variant.promotionalPrice;
  if (raw === null || raw === undefined) return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return null;
  return roundMoney(num);
}

export function getDiscountPercentFromPrices(original: number, sale: number): number {
  if (original <= 0 || sale >= original) return 0;
  return Math.min(99, Math.max(1, Math.round((1 - sale / original) * 100)));
}

/** Resolve sale price: variant promo price takes precedence over product-level percent. */
export function getVariantEffectivePrice(
  variant: VariantPriceSource | null | undefined,
  product?: PromoDiscountSource | null
): EffectivePriceResult {
  const basePrice = roundMoney(Number(variant?.price) || 0);
  const compareAtRaw = variant?.compare_at_price ?? variant?.compareAtPrice;
  const compareAt = compareAtRaw != null && Number(compareAtRaw) > 0 ? roundMoney(Number(compareAtRaw)) : null;
  const variantPromo = getVariantPromotionalPrice(variant);

  // If explicit promotional_price is set and less than base price
  if (variantPromo != null && variantPromo < basePrice) {
    const original = compareAt && compareAt > basePrice ? compareAt : basePrice;
    return {
      original,
      sale: variantPromo,
      promoPercent: getDiscountPercentFromPrices(original, variantPromo),
      promoActive: true,
    };
  }

  // If compare_at_price is set and higher than base price (base price is the sale price)
  if (compareAt != null && compareAt > basePrice && basePrice > 0) {
    return {
      original: compareAt,
      sale: basePrice,
      promoPercent: getDiscountPercentFromPrices(compareAt, basePrice),
      promoActive: true,
    };
  }

  const productPercent = getPromoDiscountPercent(product);
  if (productPercent > 0 && basePrice > 0) {
    return {
      original: basePrice,
      sale: getPromoSalePrice(basePrice, product),
      promoPercent: productPercent,
      promoActive: true,
    };
  }

  return { original: basePrice, sale: basePrice, promoPercent: 0, promoActive: false };
}

export function hasVariantOrProductPromo(
  variant: VariantPriceSource | null | undefined,
  product?: PromoDiscountSource | null
): boolean {
  return getVariantEffectivePrice(variant, product).promoActive;
}

/** Pricing for product cards — uses lowest sale price among visible variants. */
export function getProductCardPricing(product: {
  price?: number;
  variants?: VariantPriceSource[];
  Variants?: VariantPriceSource[];
} & PromoDiscountSource): EffectivePriceResult {
  const variants = product.variants || product.Variants || [];
  const visible = variants.filter((v) => (v as { isvisible?: boolean }).isvisible !== false);

  if (visible.length === 0) {
    return getVariantEffectivePrice({ price: product.price }, product);
  }

  let best: EffectivePriceResult | null = null;
  let maxPromoPercent = 0;
  let anyPromo = false;

  for (const variant of visible) {
    const pricing = getVariantEffectivePrice(variant, product);
    if (!best || pricing.sale < best.sale) {
      best = pricing;
    }
    if (pricing.promoActive) {
      anyPromo = true;
      maxPromoPercent = Math.max(maxPromoPercent, pricing.promoPercent);
    }
  }

  const result = best || getVariantEffectivePrice({ price: product.price }, product);
  if (anyPromo) {
    return { ...result, promoActive: true, promoPercent: Math.max(result.promoPercent, maxPromoPercent) };
  }
  return result;
}

/** Server-side: pick checkout price for a variant row. */
export function getVariantCheckoutPrice(
  variant: VariantPriceSource,
  product?: PromoDiscountSource | null
): number {
  return getVariantEffectivePrice(variant, product).sale;
}

