import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    // Query products that have an AliExpress Product ID and are not deleted
    let query = supabase
      .from('products')
      .select(`
        productid,
        name,
        sku,
        description,
        aliexpress_product_id,
        aliexpress_product_url,
        updatedat,
        createdat,
        product_types ( name ),
        product_images (
          productimageid,
          imageurl,
          isprimary,
          sortorder
        ),
        product_variants (
          productvariantid,
          sku,
          price,
          compare_at_price,
          quantity,
          trackquantity,
          aliexpress_sku_id,
          isvisible,
          product_variant_property_values (
            value,
            properties (
              name
            )
          )
        )
      `)
      .not('aliexpress_product_id', 'is', null)
      .neq('isdeleted', true)
      .order('updatedat', { ascending: false });

    const { data: rawProducts, error } = await query;

    if (error) {
      logger.error('Error fetching linked AliExpress products:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Format products for frontend consumption
    const formattedProducts = (rawProducts || [])
      .map((p: any) => {
        // Find primary image or first available image
        const sortedImages = (p.product_images || []).sort((a: any, b: any) => {
          if (a.isprimary && !b.isprimary) return -1;
          if (!a.isprimary && b.isprimary) return 1;
          return (a.sortorder || 0) - (b.sortorder || 0);
        });
        const primaryImage = sortedImages[0]?.imageurl || null;

        // Process variants
        const variants = (p.product_variants || []).map((v: any) => {
          let size: string | null = null;
          let colour: string | null = null;

          const propValues = v.product_variant_property_values || [];
          for (const pv of propValues) {
            const propObj = Array.isArray(pv.properties) ? pv.properties[0] : pv.properties;
            const propName = propObj?.name || '';
            if (/size/i.test(propName)) {
              size = pv.value;
            } else if (/colou?r/i.test(propName)) {
              colour = pv.value;
            }
          }

          return {
            productVariantId: v.productvariantid,
            sku: v.sku,
            price: Number(v.price) || 0,
            compareAtPrice: v.compare_at_price ? Number(v.compare_at_price) : null,
            quantity: Number(v.quantity) || 0,
            aliexpressSkuId: v.aliexpress_sku_id,
            isVisible: v.isvisible,
            size,
            colour
          };
        });

        const totalStock = variants.reduce((sum: number, v: any) => sum + v.quantity, 0);

        return {
          productId: p.productid,
          name: p.name,
          sku: p.sku,
          description: p.description,
          aliexpressProductId: p.aliexpress_product_id,
          aliexpressProductUrl: p.aliexpress_product_url,
          categoryName: p.product_types?.name || 'General',
          primaryImage,
          totalStock,
          variants,
          updatedAt: p.updatedat || p.createdat
        };
      })
      .filter((p: any) => {
        if (!search) return true;
        return (
          p.name.toLowerCase().includes(search) ||
          p.sku.toLowerCase().includes(search) ||
          p.aliexpressProductId?.toLowerCase().includes(search)
        );
      });

    return NextResponse.json({
      success: true,
      products: formattedProducts
    });
  } catch (error: any) {
    logger.error('Unexpected error in linked-products GET:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
