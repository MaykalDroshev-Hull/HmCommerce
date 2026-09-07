import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { getProductStorefrontUrl, getStorefrontBaseUrl } from '@/lib/storefront-url';

const FALLBACK_IMAGE = `${getStorefrontBaseUrl()}/image.png`;

export interface OrderEmailItem {
  id: string | number;
  productId: string;
  productUrl: string;
  name: string;
  brand: string;
  model: string;
  color: string;
  size?: string;
  type?: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface RawOrderItem {
  productvariantid?: string | null;
  productid?: string | null;
  quantity: number;
  price: number;
  size?: string;
}

function toAbsoluteImageUrl(url?: string | null): string {
  if (!url) return FALLBACK_IMAGE;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${getStorefrontBaseUrl()}${url.startsWith('/') ? url : `/${url}`}`;
}

async function resolveProductId(
  supabase: SupabaseClient,
  orderItem: RawOrderItem
): Promise<string> {
  const variantId = orderItem.productvariantid || null;
  const orderProductId = orderItem.productid?.trim() || '';

  if (orderProductId && (!variantId || orderProductId !== variantId)) {
    return orderProductId;
  }

  if (!variantId) {
    return orderProductId;
  }

  const { data: variant } = await supabase
    .from('product_variants')
    .select('productid')
    .eq('productvariantid', variantId)
    .single();

  return variant?.productid || orderProductId;
}

async function fetchProductImage(
  supabase: SupabaseClient,
  productId: string,
  variantId?: string | null
): Promise<string> {
  if (variantId) {
    const { data: variantImages } = await supabase
      .from('product_images')
      .select('imageurl, sortorder')
      .eq('productid', productId)
      .eq('productvariantid', variantId)
      .order('sortorder', { ascending: true })
      .limit(1);

    if (variantImages?.[0]?.imageurl) {
      return toAbsoluteImageUrl(variantImages[0].imageurl);
    }
  }

  const { data: productImages } = await supabase
    .from('product_images')
    .select('imageurl, sortorder')
    .eq('productid', productId)
    .is('productvariantid', null)
    .order('sortorder', { ascending: true })
    .limit(1);

  if (productImages?.[0]?.imageurl) {
    return toAbsoluteImageUrl(productImages[0].imageurl);
  }

  return FALLBACK_IMAGE;
}

function applyPropertyValues(
  productInfo: {
    color: string;
    size: string;
    brand: string;
    model: string;
    type?: string;
  },
  propertyValues: Array<{ value?: string; properties?: { name?: string } | { name?: string }[] }>
) {
  propertyValues.forEach((pvv) => {
    const properties = pvv.properties;
    const propName = (
      Array.isArray(properties) ? properties[0]?.name : properties?.name
    )?.toLowerCase() || '';
    const value = pvv.value || '';

    if (propName.includes('color') || propName.includes('colour')) {
      productInfo.color = value;
    } else if (propName.includes('size')) {
      productInfo.size = value;
    } else if (propName.includes('brand')) {
      productInfo.brand = value;
    } else if (propName.includes('model')) {
      productInfo.model = value;
    } else if (propName.includes('type')) {
      productInfo.type = value;
    }
  });
}

export async function buildOrderEmailItems(
  supabase: SupabaseClient,
  orderItems: RawOrderItem[]
): Promise<OrderEmailItem[]> {
  return Promise.all(
    orderItems.map(async (orderItem) => {
      let productInfo = {
        name: 'Unknown Product',
        brand: '',
        model: '',
        color: '',
        size: '',
        type: undefined as string | undefined,
      };
      let productId = await resolveProductId(supabase, orderItem);

      try {
        if (orderItem.productvariantid) {
          const { data: variant } = await supabase
            .from('product_variants')
            .select(`
              sku,
              productid,
              products!inner (
                name
              ),
              product_variant_property_values (
                value,
                properties!inner (
                  name
                )
              )
            `)
            .eq('productvariantid', orderItem.productvariantid)
            .single();

          if (variant) {
            productId = variant.productid || productId;
            const productData = variant.products;
            productInfo.name = Array.isArray(productData)
              ? productData[0]?.name || variant.sku || 'Unknown Product'
              : (productData as { name?: string })?.name || variant.sku || 'Unknown Product';

            if (Array.isArray(variant.product_variant_property_values)) {
              applyPropertyValues(productInfo, variant.product_variant_property_values);
            }

            if (!productInfo.brand && !productInfo.model) {
              const nameParts = productInfo.name.split(' ');
              productInfo.brand = nameParts[0] || '';
              productInfo.model = nameParts.slice(1).join(' ') || productInfo.name;
            }
          }
        } else if (orderItem.productid) {
          const { data: product } = await supabase
            .from('products')
            .select('name')
            .eq('productid', orderItem.productid)
            .single();

          if (product) {
            productInfo.name = product.name || 'Unknown Product';
            const nameParts = productInfo.name.split(' ');
            productInfo.brand = nameParts[0] || '';
            productInfo.model = nameParts.slice(1).join(' ') || productInfo.name;
          }
        }
      } catch (error) {
        logger.error('Error fetching product details for email', error);
      }

      const imageUrl = productId
        ? await fetchProductImage(supabase, productId, orderItem.productvariantid)
        : FALLBACK_IMAGE;

      return {
        id: orderItem.productvariantid || orderItem.productid || '',
        productId,
        productUrl: getProductStorefrontUrl(productId, orderItem.productvariantid),
        name: productInfo.name,
        brand: productInfo.brand || 'Unknown',
        model: productInfo.model || productInfo.name,
        color: productInfo.color || '',
        size: productInfo.size || orderItem.size || '',
        type: productInfo.type,
        price: orderItem.price || 0,
        quantity: orderItem.quantity,
        imageUrl,
      };
    })
  );
}
