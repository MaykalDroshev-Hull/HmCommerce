import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { StagedProductImportPayload } from '@/lib/aliexpress/types';
import { extractCleanSizeCode } from '@/lib/aliexpress/client';

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

    // Enforce size in SKU and guarantee batch uniqueness
    const seenBatchSkus = new Set<string>();

    const candidateVariantRows = variantsToInsert.map((v, idx) => {
      const vPrice = Number(v.price) || Number(sellingPrice) || 19.99;
      const vCompareAt = v.compareAtPrice != null && Number(v.compareAtPrice) > 0
        ? Number(v.compareAtPrice)
        : (compareAtPrice ? Number(compareAtPrice) : null);

      let variantSku = (v.sku || `${baseSku}-${idx + 1}`).trim().toUpperCase();

      // Ensure sizing is incorporated into the SKU
      if (v.size) {
        const cleanSize = extractCleanSizeCode(v.size);
        if (cleanSize && !variantSku.endsWith(`-${cleanSize}`) && !variantSku.includes(`-${cleanSize}-`)) {
          variantSku = `${variantSku}-${cleanSize}`;
        }
      }

      // Guarantee uniqueness within the import batch
      let uniqueSku = variantSku;
      if (seenBatchSkus.has(uniqueSku)) {
        let counter = 2;
        while (seenBatchSkus.has(`${uniqueSku}-${counter}`)) {
          counter++;
        }
        uniqueSku = `${uniqueSku}-${counter}`;
      }
      seenBatchSkus.add(uniqueSku);

      return {
        productid: createdProductId,
        sku: uniqueSku,
        price: vPrice,
        compare_at_price: vCompareAt,
        promotional_price: vCompareAt && vCompareAt > vPrice ? vPrice : null,
        quantity: v.quantity || 30,
        trackquantity: true,
        isvisible: true,
        aliexpress_sku_id: v.skuId ? String(v.skuId) : null
      };
    });

    // Check database to prevent collision with any existing records in product_variants
    const skusToCheck = candidateVariantRows.map((r) => r.sku);
    const { data: existingRows } = await supabase
      .from('product_variants')
      .select('sku')
      .in('sku', skusToCheck);

    const existingSkuSet = new Set((existingRows || []).map((r: any) => r.sku));

    const finalVariantRows = candidateVariantRows.map((row) => {
      let finalSku = row.sku;
      if (existingSkuSet.has(finalSku)) {
        const randomTail = Math.floor(100 + Math.random() * 900);
        finalSku = `${finalSku}-${randomTail}`;
      }
      return {
        ...row,
        sku: finalSku
      };
    });

    const { data: insertedVariants, error: variantsError } = await supabase
      .from('product_variants')
      .insert(finalVariantRows)
      .select('productvariantid, sku');

    if (variantsError) {
      logger.error('Error inserting imported variants:', variantsError);
      return NextResponse.json(
        { success: false, error: variantsError.message },
        { status: 500 }
      );
    }

    // Insert property values for Colour and Size so shop frontend can render option selectors
    if (insertedVariants && insertedVariants.length > 0) {
      try {
        const { data: dbProperties } = await supabase
          .from('properties')
          .select('propertyid, name');

        let colourProp = dbProperties?.find((p) => /colou?r/i.test(p.name));
        let sizeProp = dbProperties?.find((p) => /size/i.test(p.name));

        if (!colourProp) {
          const { data: newColour } = await supabase
            .from('properties')
            .insert({ name: 'Colour', description: 'Product colour options', datatype: 'text' })
            .select('propertyid, name')
            .single();
          if (newColour) colourProp = newColour;
        }

        if (!sizeProp) {
          const { data: newSize } = await supabase
            .from('properties')
            .insert({ name: 'Size', description: 'Product size options', datatype: 'text' })
            .select('propertyid, name')
            .single();
          if (newSize) sizeProp = newSize;
        }

        const propertyValuesToInsert: Array<{
          productvariantid: string;
          propertyid: string;
          value: string;
        }> = [];

        insertedVariants.forEach((iv, idx) => {
          const orig = variantsToInsert[idx];
          if (!orig) return;

          if (colourProp && orig.colour) {
            propertyValuesToInsert.push({
              productvariantid: iv.productvariantid,
              propertyid: colourProp.propertyid,
              value: orig.colour
            });
          }
          if (sizeProp && orig.size) {
            propertyValuesToInsert.push({
              productvariantid: iv.productvariantid,
              propertyid: sizeProp.propertyid,
              value: orig.size
            });
          }
        });

        if (propertyValuesToInsert.length > 0) {
          const { error: pvError } = await supabase
            .from('product_variant_property_values')
            .insert(propertyValuesToInsert);

          if (pvError) {
            logger.error('Error inserting product variant property values:', pvError);
          }
        }

        // Link product type to properties for store navigation/filtering
        if (producttypeid) {
          const propIds = [colourProp?.propertyid, sizeProp?.propertyid].filter(Boolean) as string[];
          for (const pid of propIds) {
            const { data: existingLink } = await supabase
              .from('product_type_properties')
              .select('producttypepropertyid')
              .eq('producttypeid', producttypeid)
              .eq('propertyid', pid)
              .maybeSingle();

            if (!existingLink) {
              await supabase
                .from('product_type_properties')
                .insert({
                  producttypeid,
                  propertyid: pid
                });
            }
          }
        }
      } catch (propErr) {
        logger.warn('Failed to associate variant property values:', propErr);
      }
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
