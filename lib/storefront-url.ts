const DEFAULT_STOREFRONT_URL = 'https://mb-something.co.uk';

/** Public storefront origin for customer-facing links (never admin). */
export function getStorefrontBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    DEFAULT_STOREFRONT_URL;

  return raw
    .trim()
    .replace(/\/$/, '')
    .replace(/\/admin$/, '');
}

export function getProductStorefrontUrl(
  productId?: string | null,
  variantId?: string | null
): string {
  const cleanProductId = productId?.trim() || '';
  if (!cleanProductId) return '';
  if (variantId && cleanProductId === variantId) return '';

  return `${getStorefrontBaseUrl()}/products/${cleanProductId}`;
}

/** In-app link: opens product with SUPER PROMO variant pre-selected. */
export function getSuperPromoProductPath(productId: string, variantId: string): string {
  return `/products/${productId}?superPromo=${encodeURIComponent(variantId)}`;
}

export function getSuperPromoProductUrl(productId: string, variantId: string): string {
  return `${getStorefrontBaseUrl()}${getSuperPromoProductPath(productId, variantId)}`;
}
