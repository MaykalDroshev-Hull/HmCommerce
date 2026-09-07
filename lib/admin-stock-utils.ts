import { LOW_STOCK_MAX } from '@/lib/variant-stock';

export interface StockCharacteristic {
  property_name: string;
  value: string;
}

export interface StockVariant {
  productvariantid: string;
  productid: string;
  product_name: string;
  sku: string | null;
  price: number;
  promotional_price: number | null;
  quantity: number;
  trackquantity: boolean;
  isvisible: boolean;
  product_isdisabled?: boolean;
  product_awaitingrestock?: boolean;
  primary_image?: string | null;
  characteristics: StockCharacteristic[];
}

export interface GroupedStockProduct {
  productid: string;
  product_name: string;
  primary_image: string | null;
  colors: string[];
  total_stock: number;
  variant_count: number;
  has_out_of_stock: boolean;
  has_low_stock: boolean;
  has_negative_stock: boolean;
  isdisabled: boolean;
  awaitingrestock: boolean;
  variants: StockVariant[];
}

const SIZE_ORDER = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', '2xl', '3xl', '4xl', '5xl'];

const COLOR_KEYS = ['color', 'colour', 'cvyat'];

const SIZE_KEYS = ['size', 'razmer'];

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

export function isSizeProperty(name: string): boolean {
  const key = normalizeKey(name);
  return SIZE_KEYS.some((k) => key === k || key.includes(k));
}

export function isColorProperty(name: string): boolean {
  const key = normalizeKey(name);
  return COLOR_KEYS.some((k) => key === k || key.includes(k));
}

export function getVariantSize(variant: StockVariant): string | null {
  const match = variant.characteristics.find((c) => isSizeProperty(c.property_name));
  return match?.value ?? null;
}

export function getVariantColor(variant: StockVariant): string | null {
  const match = variant.characteristics.find((c) => isColorProperty(c.property_name));
  return match?.value ?? null;
}

export function compareSizeValues(a: string, b: string): number {
  const aKey = normalizeKey(a);
  const bKey = normalizeKey(b);
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

export function sortVariantsBySize(variants: StockVariant[]): StockVariant[] {
  return [...variants].sort((a, b) => {
    const sizeA = getVariantSize(a);
    const sizeB = getVariantSize(b);
    if (sizeA && sizeB) return compareSizeValues(sizeA, sizeB);
    if (sizeA) return -1;
    if (sizeB) return 1;
    return (a.sku || '').localeCompare(b.sku || '', 'bg');
  });
}

export type VariantStockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'negative' | 'untracked';

export function getVariantStockStatus(variant: StockVariant): VariantStockStatus {
  if (!variant.trackquantity) return 'untracked';
  const qty = variant.quantity;
  if (qty < 0) return 'negative';
  if (qty === 0) return 'out_of_stock';
  if (qty <= LOW_STOCK_MAX) return 'low_stock';
  return 'in_stock';
}

export function groupVariantsIntoProducts(variants: StockVariant[]): GroupedStockProduct[] {
  const byProduct = new Map<string, StockVariant[]>();

  for (const variant of variants) {
    const list = byProduct.get(variant.productid) || [];
    list.push(variant);
    byProduct.set(variant.productid, list);
  }

  const products: GroupedStockProduct[] = [];

  for (const [productid, productVariants] of byProduct) {
    const sortedVariants = sortVariantsBySize(productVariants);
    const colors = [
      ...new Set(
        sortedVariants.map((v) => getVariantColor(v)).filter((c): c is string => Boolean(c))
      ),
    ];

    const totalStock = sortedVariants.reduce((sum, v) => sum + (v.trackquantity ? v.quantity : 0), 0);
    const statuses = sortedVariants.map(getVariantStockStatus);

    const first = sortedVariants[0];
    products.push({
      productid,
      product_name: first?.product_name || 'Unknown Product',
      primary_image:
        sortedVariants.find((v) => v.primary_image)?.primary_image ||
        first?.primary_image ||
        null,
      colors,
      total_stock: totalStock,
      variant_count: sortedVariants.length,
      has_out_of_stock: statuses.some((s) => s === 'out_of_stock'),
      has_low_stock: statuses.some((s) => s === 'low_stock'),
      has_negative_stock: statuses.some((s) => s === 'negative'),
      isdisabled: first?.product_isdisabled === true,
      awaitingrestock: first?.product_awaitingrestock === true,
      variants: sortedVariants,
    });
  }

  return products.sort((a, b) => a.product_name.localeCompare(b.product_name, 'bg'));
}

export function variantMatchesSearch(variant: StockVariant, searchLower: string): boolean {
  if (variant.product_name.toLowerCase().includes(searchLower)) return true;
  if (variant.sku?.toLowerCase().includes(searchLower)) return true;
  return variant.characteristics.some(
    (c) =>
      c.property_name.toLowerCase().includes(searchLower) ||
      c.value.toLowerCase().includes(searchLower)
  );
}

export function productMatchesStockFilter(
  product: GroupedStockProduct,
  filter: 'all' | 'low' | 'out' | 'negative'
): boolean {
  if (filter === 'all') return true;
  if (filter === 'low') return product.has_low_stock;
  if (filter === 'out') return product.has_out_of_stock;
  if (filter === 'negative') return product.has_negative_stock;
  return true;
}

export function filterGroupedProducts(
  products: GroupedStockProduct[],
  searchTerm: string,
  stockFilter: 'all' | 'low' | 'out' | 'negative'
): { products: GroupedStockProduct[]; matchedVariantIds: Set<string>; autoExpandProductIds: Set<string> } {
  const searchLower = searchTerm.trim().toLowerCase();
  const matchedVariantIds = new Set<string>();
  const autoExpandProductIds = new Set<string>();

  let filtered = products.filter((p) => productMatchesStockFilter(p, stockFilter));

  if (searchLower) {
    filtered = filtered
      .map((product) => {
        const productNameMatch = product.product_name.toLowerCase().includes(searchLower);
        const matchingVariants = product.variants.filter((v) => variantMatchesSearch(v, searchLower));

        matchingVariants.forEach((v) => matchedVariantIds.add(v.productvariantid));

        if (productNameMatch) {
          return product;
        }

        if (matchingVariants.length > 0) {
          autoExpandProductIds.add(product.productid);
          return product;
        }

        return null;
      })
      .filter((p): p is GroupedStockProduct => p !== null);
  }

  return { products: filtered, matchedVariantIds, autoExpandProductIds };
}

export function getStockSummary(variants: StockVariant[]) {
  const statuses = variants.map(getVariantStockStatus);
  return {
    totalVariants: variants.length,
    totalProducts: new Set(variants.map((v) => v.productid)).size,
    inStockCount: statuses.filter((s) => s === 'in_stock').length,
    lowStockCount: statuses.filter((s) => s === 'low_stock').length,
    outOfStockCount: statuses.filter((s) => s === 'out_of_stock').length,
    negativeStockCount: statuses.filter((s) => s === 'negative').length,
  };
}
