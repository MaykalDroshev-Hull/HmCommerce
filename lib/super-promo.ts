import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import {
  getDiscountPercentFromPrices,
  getVariantEffectivePrice,
  roundMoney,
} from '@/lib/product-promo';
import { getProductStorefrontUrl, getSuperPromoProductPath } from '@/lib/storefront-url';
import { getVariantPropertyValues, isSizePropertyKey } from '@/lib/variant-stock';
import { normalizeProductImages } from '@/lib/product-images';

export interface SuperPromoItemRow {
  superpromoid: string;
  productid: string;
  productvariantid: string;
  promoprice: number;
  sortorder: number;
  isactive: boolean;
  createdat?: string;
  updatedat?: string;
}

export interface SuperPromoDisplayItem {
  superpromoid: string;
  productid: string;
  productvariantid: string;
  promoPrice: number;
  originalPrice: number;
  discountPercent: number;
  sortorder: number;
  isactive: boolean;
  name: string;
  brand: string;
  model: string;
  color: string;
  size: string;
  imageUrl: string;
  images: string[];
  productUrl: string;
  productPath: string;
  inStock: boolean;
  quantity: number;
  category: 'clothes' | 'shoes' | 'accessories';
}

function parseVariantProps(variant: Record<string, unknown>) {
  const props = getVariantPropertyValues(variant);
  let color = '';
  let size = '';

  props.forEach(({ nameKey, value }) => {
    if (nameKey.includes('color') || nameKey.includes('colour')) {
      color = value;
    } else if (isSizePropertyKey(nameKey, nameKey)) {
      size = value;
    }
  });

  return { color, size };
}

function splitProductName(name: string) {
  const parts = name.split(' ');
  return {
    brand: parts[0] || '',
    model: parts.slice(1).join(' ') || name,
  };
}

export async function getActiveSuperPromoPriceMap(
  supabase: SupabaseClient,
  variantIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (variantIds.length === 0) return map;

  const { data } = await supabase
    .from('super_promo_items')
    .select('productvariantid, promoprice')
    .in('productvariantid', variantIds)
    .eq('isactive', true);

  (data || []).forEach((row) => {
    const price = roundMoney(Number(row.promoprice));
    if (price > 0) {
      map.set(row.productvariantid, price);
    }
  });

  return map;
}

export async function getActiveSuperPromoPrice(
  supabase: SupabaseClient,
  variantId: string
): Promise<number | null> {
  const map = await getActiveSuperPromoPriceMap(supabase, [variantId]);
  return map.get(variantId) ?? null;
}

export async function enrichSuperPromoItems(
  supabase: SupabaseClient,
  rows: SuperPromoItemRow[]
): Promise<SuperPromoDisplayItem[]> {
  const items: SuperPromoDisplayItem[] = [];

  for (const row of rows) {
    try {
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select(`
          productvariantid,
          productid,
          price,
          promotional_price,
          quantity,
          trackquantity,
          isvisible,
          products!inner (
            name,
            promodiscountpercent,
            isdisabled,
            isdeleted
          ),
          product_variant_property_values (
            value,
            properties (
              name
            )
          )
        `)
        .eq('productvariantid', row.productvariantid)
        .single();

      if (variantError || !variant) {
        logger.error('Super promo variant fetch failed', {
          variantId: row.productvariantid,
          error: variantError?.message,
        });
        continue;
      }

      const productRaw = variant.products as
        | {
            name?: string;
            promodiscountpercent?: number | null;
            isdisabled?: boolean;
            isdeleted?: boolean;
          }
        | {
            name?: string;
            promodiscountpercent?: number | null;
            isdisabled?: boolean;
            isdeleted?: boolean;
          }[];

      const product = Array.isArray(productRaw) ? productRaw[0] : productRaw;
      if (!product || product.isdeleted || product.isdisabled) continue;
      if (variant.isvisible === false) continue;

      const { data: variantImages } = await supabase
        .from('product_images')
        .select('imageurl, sortorder')
        .eq('productid', row.productid)
        .eq('productvariantid', row.productvariantid)
        .order('sortorder', { ascending: true });

      let imageUrls: string[] = (variantImages || [])
        .map((img) => img.imageurl)
        .filter(Boolean);

      if (imageUrls.length === 0) {
        const { data: productImages } = await supabase
          .from('product_images')
          .select('imageurl, sortorder')
          .eq('productid', row.productid)
          .is('productvariantid', null)
          .order('sortorder', { ascending: true });

        imageUrls = (productImages || []).map((img) => img.imageurl).filter(Boolean);
      }

      const images = normalizeProductImages(imageUrls.length > 0 ? imageUrls : ['/image.png']);
      const productName = product.name || 'Product';
      const { brand, model } = splitProductName(productName);
      const { color, size } = parseVariantProps(variant as Record<string, unknown>);
      const originalPricing = getVariantEffectivePrice(variant, product);
      const promoPrice = roundMoney(Number(row.promoprice));
      const originalPrice = originalPricing.original;
      const trackQuantity = variant.trackquantity !== false;
      const quantity = Number(variant.quantity) || 0;
      const inStock = !trackQuantity || quantity > 0;

      items.push({
        superpromoid: row.superpromoid,
        productid: row.productid,
        productvariantid: row.productvariantid,
        promoPrice,
        originalPrice,
        discountPercent: getDiscountPercentFromPrices(originalPrice, promoPrice),
        sortorder: row.sortorder,
        isactive: row.isactive,
        name: productName,
        brand,
        model,
        color,
        size,
        imageUrl: images[0] || '/image.png',
        images,
        productUrl: getProductStorefrontUrl(row.productid),
        productPath: getSuperPromoProductPath(row.productid, row.productvariantid),
        inStock,
        quantity,
        category: 'clothes',
      });
    } catch (error) {
      logger.error('Super promo enrich failed', error);
    }
  }

  return items;
}
