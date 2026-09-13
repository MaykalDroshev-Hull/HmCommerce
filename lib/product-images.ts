/** Max product photos allowed across admin and product gallery. */
export const MAX_PRODUCT_IMAGES = 24;

/** Dedupe image URLs and keep at most MAX_PRODUCT_IMAGES (or custom limit). */
export function normalizeProductImages(
  images: string[] | undefined | null,
  fallback = '/image.png',
  limit = MAX_PRODUCT_IMAGES
): string[] {
  const safeFallback = fallback && fallback.trim() ? fallback.trim() : '/image.png';
  if (!images || images.length === 0) return [safeFallback];

  const seen = new Set<string>();
  const unique: string[] = [];

  for (const image of images) {
    if (!image || typeof image !== 'string') continue;
    const normalized = image.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(image.trim());
    if (unique.length >= limit) break;
  }

  return unique.length > 0 ? unique : [safeFallback];
}

