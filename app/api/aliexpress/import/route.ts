import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { StagedProductImportPayload } from '@/lib/aliexpress/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const payload: StagedProductImportPayload = await request.json();

    const {
      name,
      description,
      producttypeid,
      rfproducttypeid = 1,
      sellingPrice,
      compareAtPrice,
      promodiscountpercent,
      images = [],
      selectedVariants = [],
      aliexpressProductId,
      aliexpressProductUrl
    } = payload;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Product name is required' },
        { status: 400 }
      );
    }

    // Determine valid product type ID
    let finalProductTypeId = producttypeid;
    if (!finalProductTypeId) {
      const { data: defaultType } = await supabase
        .from('product_types')
        .select('producttypeid')
        .limit(1)
        .maybeSingle();

      if (defaultType?.producttypeid) {
        finalProductTypeId = defaultType.producttypeid;
      }
    }

    // Generate base SKU
    const cleanSkuPrefix = name
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 5)
      .toUpperCase() || 'PET';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const baseSku = `${cleanSkuPrefix}-${randomSuffix}`;

    // 1. Insert product record
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name: name.trim(),
        sku: baseSku,
        description: description || '',
        producttypeid: finalProductTypeId,
        rfproducttypeid: rfproducttypeid || 1,
        isfeatured: false,
        isdisabled: false,
        awaitingrestock: false,
        promodiscountpercent: promodiscountpercent || null,
        aliexpress_product_id: aliexpressProductId ? String(aliexpressProductId) : null,
        aliexpress_product_url: aliexpressProductUrl || null,
        updatedat: new Date().toISOString()
      })
      .select()
      .single();

    if (productError || !product) {
      logger.error('Error inserting imported product:', productError);
      return NextResponse.json(
        { success: false, error: productError?.message || 'Failed to create product' },
        { status: 500 }
      );
    }

    const createdProductId = product.productid;

    // 2. Insert product images
    if (images.length > 0) {
      const imageRows = images.map((imageurl, idx) => ({
        productid: createdProductId,
        productvariantid: null,
        imageurl,
        isprimary: idx === 0,
        sortorder: idx
      }));

      const { error: imagesError } = await supabase
        .from('product_images')
        .insert(imageRows);

      if (imagesError) {
        logger.error('Error inserting product images:', imagesError);
      }
    }

    // 3. Insert product variants
    const variantsToInsert = selectedVariants.length > 0
      ? selectedVariants
      : [
          {
            skuId: `${aliexpressProductId || baseSku}-default`,
            sku: `${baseSku}-1`,
            price: sellingPrice || 19.99,
            compareAtPrice: compareAtPrice || null,
            quantity: 50
          }
        ];

    const variantRows = variantsToInsert.map((v, idx) => {
      const vPrice = Number(v.price) || Number(sellingPrice) || 19.99;
      const vCompareAt = v.compareAtPrice != null && Number(v.compareAtPrice) > 0
        ? Number(v.compareAtPrice)
        : (compareAtPrice ? Number(compareAtPrice) : null);

      return {
        productid: createdProductId,
        sku: v.sku || `${baseSku}-${idx + 1}`,
        price: vPrice,
        compare_at_price: vCompareAt,
        promotional_price: vCompareAt && vCompareAt > vPrice ? vPrice : null,
        quantity: v.quantity || 30,
        trackquantity: true,
        isvisible: true,
        aliexpress_sku_id: v.skuId ? String(v.skuId) : null
      };
    });

    const { error: variantsError } = await supabase
      .from('product_variants')
      .insert(variantRows);

    if (variantsError) {
      logger.error('Error inserting imported variants:', variantsError);
      return NextResponse.json(
        { success: false, error: variantsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      productId: createdProductId,
      name: product.name,
      message: 'Product imported successfully'
    });
  } catch (error: any) {
    logger.error('Error handling AliExpress product import:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
