import { Product } from '@/lib/data';

export const LOW_STOCK_MAX = 3;

const SIZE_ORDER = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', '2xl', '3xl', '4xl', '5xl'];

export type OptionStockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'untracked';

export function getVariantPropertyValues(variant: any): Array<{ nameKey: string; value: string }> {
  const raw =
    variant.ProductVariantPropertyvalues ||
    variant.ProductVariantPropertyValues ||
    variant.product_variant_property_values ||
    [];

  return raw
    .map((pv: any) => {
      const name =
        pv.Property?.name ||
        pv.Property?.Name ||
        pv.properties?.name ||
        pv.properties?.Name ||
        pv.propertyid ||
        '';
      const value = pv.value || pv.Value || '';
      if (!name || !value) return null;
      return { nameKey: String(name).toLowerCase(), value: String(value) };
    })
    .filter(Boolean) as Array<{ nameKey: string; value: string }>;
}

export function getVariantOptionsMap(variant: any): Record<string, string> {
  const map: Record<string, string> = {};
  getVariantPropertyValues(variant).forEach(({ nameKey, value }) => {
    map[nameKey] = value;
  });
  return map;
}

export function isSizePropertyKey(propertyKey: string, displayName?: string): boolean {
  const key = propertyKey.toLowerCase();
  const label = (displayName || propertyKey).toLowerCase();
  if (key === 'size' || key === 'razmer') return true;
  if (label.includes('size')) return true;
  if (key.includes('size') || key.includes('razmer')) return true;
  return false;
}

export function findSizePropertyKey(
  selectedOptions: Record<string, string>,
  propertyNameMap: Record<string, string>
): string | null {
  for (const key of Object.keys(selectedOptions)) {
    if (isSizePropertyKey(key, propertyNameMap[key])) return key;
  }
  for (const key of Object.keys(propertyNameMap)) {
    if (isSizePropertyKey(key, propertyNameMap[key])) return key;
  }
  return null;
}

function variantTracksQuantity(variant: any): boolean {
  return variant.trackquantity !== false && variant.trackquantity !== null;
}

function effectiveQuantity(variant: any): number {
  if (!variantTracksQuantity(variant)) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, Number(variant.quantity) || 0);
}

/** Variants matching an option value plus all other currently selected options. */
export function getMatchingVariantsForOption(
  variants: any[],
  selectedOptions: Record<string, string>,
  propertyKey: string,
  optionValue: string
): any[] {
  return variants.filter((variant) => {
    const opts = getVariantOptionsMap(variant);
    if (opts[propertyKey] !== optionValue) return false;
    return Object.entries(selectedOptions).every(([key, val]) => {
      if (key === propertyKey) return true;
      return opts[key] === val;
    });
  });
}

/** Minimum tracked quantity among variants that match the partial/full selection. */
export function getOptionStockQuantity(
  variants: any[],
  selectedOptions: Record<string, string>,
  propertyKey: string,
  optionValue: string
): number {
  const matches = getMatchingVariantsForOption(variants, selectedOptions, propertyKey, optionValue);
  if (matches.length === 0) return 0;

  const tracked = matches.filter(variantTracksQuantity);
  if (tracked.length === 0) return Number.MAX_SAFE_INTEGER;

  return Math.min(...tracked.map(effectiveQuantity));
}

export function getOptionStockStatus(quantity: number): OptionStockStatus {
  if (quantity >= Number.MAX_SAFE_INTEGER / 2) return 'untracked';
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= LOW_STOCK_MAX) return 'low_stock';
  return 'in_stock';
}

export function variantHasSizeValue(variant: any, sizeValue: string): boolean {
  const target = sizeValue.trim().toLowerCase();
  return getVariantPropertyValues(variant).some(({ nameKey, value }) => {
    if (!isSizePropertyKey(nameKey)) return false;
    return value.trim().toLowerCase() === target;
  });
}

export function productHasAnyVariantInStock(product: Product): boolean {
  const variants = (product.variants || product.Variants || []) as any[];
  if (variants.length === 0) {
    return (Number(product.quantity) || 0) > 0;
  }
  return variants.some((variant) => effectiveQuantity(variant) > 0);
}

export function productHasSizeInStock(product: Product, sizeValue: string): boolean {
  const variants = (product.variants || product.Variants || []) as any[];
  return variants.some((variant) => {
    if (variant.isvisible === false) return false;
    if (!variantHasSizeValue(variant, sizeValue)) return false;
    return effectiveQuantity(variant) > 0;
  });
}

function compareSizeValues(a: string, b: string): number {
  const aKey = a.trim().toLowerCase();
  const bKey = b.trim().toLowerCase();
  const aIndex = SIZE_ORDER.indexOf(aKey);
  const bIndex = SIZE_ORDER.indexOf(bKey);

  if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
  if (aIndex !== -1) return -1;
  if (bIndex !== -1) return 1;

  const aNum = parseFloat(a);
  const bNum = parseFloat(b);
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;

  return a.localeCompare(b, 'bg');
}

export function getVariantSizeLabel(variant: any): string | null {
  for (const { nameKey, value } of getVariantPropertyValues(variant)) {
    if (isSizePropertyKey(nameKey)) return value;
  }
  return null;
}

export function getInStockSizeEntries(product: Product): Array<{ size: string; quantity: number }> {
  const variants = (product.variants || product.Variants || []) as any[];
  const entries: Array<{ size: string; quantity: number }> = [];

  for (const variant of variants) {
    if (variant.isvisible === false) continue;
    const qty = effectiveQuantity(variant);
    if (qty <= 0 || qty >= Number.MAX_SAFE_INTEGER / 2) continue;
    const size = getVariantSizeLabel(variant);
    if (!size) continue;
    entries.push({ size, quantity: qty });
  }

  return entries.sort((a, b) => compareSizeValues(a.size, b.size));
}

/** Card label: e.g. "L: 2 pcs" when only one size has stock, otherwise total in stock. */
export function getProductCardStockDisplay(
  product: Product,
  language: 'bg' | 'en',
  unitLabel: string
): string {
  const entries = getInStockSizeEntries(product);
  if (entries.length === 1) {
    const { size, quantity } = entries[0];
    return `${size}: ${quantity} ${unitLabel}`;
  }

  const total = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  return `${total} ${unitLabel}`;
}

export function countProductsWithSizeInStock(products: Product[], sizeValue: string): number {
  return products.filter((product) => productHasSizeInStock(product, sizeValue)).length;
}

export function sortSizeValues(values: string[]): string[] {
  return [...values].sort(compareSizeValues);
}

export function findSameSizeAlternatives(
  allProducts: Product[],
  params: {
    sizeValue: string;
    excludeProductId: string;
    producttypeid?: string;
    rfproducttypeid?: number | null;
    limit?: number;
  }
): Product[] {
  const { sizeValue, excludeProductId, producttypeid, rfproducttypeid, limit = 4 } = params;

  const candidates = allProducts.filter((p) => {
    const pid = String(p.id || p.productid || '');
    if (!pid || pid === excludeProductId) return false;
    if ((p as any).isdisabled === true) return false;
    if (p.visible === false) return false;
    return productHasSizeInStock(p, sizeValue);
  });

  const score = (p: Product): number => {
    let s = 0;
    const pt = p.productTypeID || (p as any).producttypeid;
    const rf = (p as any).rfproducttypeid;
    if (producttypeid && pt === producttypeid) s += 2;
    if (rfproducttypeid != null && rf === rfproducttypeid) s += 1;
    return s;
  };

  return candidates.sort((a, b) => score(b) - score(a)).slice(0, limit);
}
