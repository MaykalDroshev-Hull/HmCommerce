import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { fetchAliExpressProduct, extractCleanSizeCode } from '@/lib/aliexpress/client';
import { logger } from '@/lib/logger';

interface SyncSupplierRequestBody {
  productId: string;
  newUrlOrId?: string;
  updateStock?: boolean;
  addNewVariants?: boolean;
  sellingPrice?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SyncSupplierRequestBody = await request.json();
    const {
      productId,
      newUrlOrId,
      updateStock = true,
      addNewVariants = false,
      sellingPrice
    } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // 1. Fetch existing product from database
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('productid, name, sku, producttypeid, aliexpress_product_id, aliexpress_product_url')
      .eq('productid', productId)
      .single();

    if (productError || !product) {
      logger.error('Product not found in sync-supplier:', productError);
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // 2. Identify target AliExpress item identifier
    const targetUrlOrId = (newUrlOrId && newUrlOrId.trim()) || product.aliexpress_product_id;
    if (!targetUrlOrId) {
      return NextResponse.json(
        { success: false, error: 'No AliExpress URL or Product ID provided or linked to this product' },
        { status: 400 }
      );
    }

    // 3. Fetch latest supplier listing from AliExpress Open Platform API
    const supplierProduct = await fetchAliExpressProduct(targetUrlOrId);
    if (!supplierProduct) {
      return NextResponse.json(
        {
          success: false,
          error: `Could not retrieve listing for '${targetUrlOrId}' from AliExpress API. Please verify the URL or ID.`
        },
        { status: 404 }
      );
    }

    // 4. Update product link if new link was provided or ID changed
    const targetUrl = supplierProduct.sourceUrl || 
      (newUrlOrId?.startsWith('http') ? newUrlOrId : `https://www.aliexpress.com/item/${supplierProduct.productId}.html`);

    const shouldUpdateProductMeta =
      Boolean(newUrlOrId) ||
      product.aliexpress_product_id !== supplierProduct.productId ||
      product.aliexpress_product_url !== targetUrl;

    if (shouldUpdateProductMeta) {
      const { error: updateMetaError } = await supabase
        .from('products')
        .update({
          aliexpress_product_id: supplierProduct.productId,
          aliexpress_product_url: targetUrl,
          updatedat: new Date().toISOString()
        })
        .eq('productid', productId);

      if (updateMetaError) {
        logger.error('Failed to update product AliExpress metadata:', updateMetaError);
      }
    }

    // 5. Fetch existing variants with their size & colour property values
    const { data: dbVariants, error: variantsError } = await supabase
      .from('product_variants')
      .select(`
        productvariantid,
        sku,
        price,
        compare_at_price,
        promotional_price,
        quantity,
        aliexpress_sku_id,
        product_variant_property_values (
          productvariantpropertyvalueid,
          value,
          propertyid,
          properties (
            propertyid,
            name
          )
        )
      `)
      .eq('productid', productId);

    if (variantsError) {
      logger.error('Failed to fetch variants for product:', variantsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch product variants' },
        { status: 500 }
      );
    }

    // 6. Structure supplier variants for matching
    const supplierVariants = supplierProduct.variants.map((sv) => {
      let rawSize = '';
      let colour = '';

      for (const prop of sv.properties || []) {
        if (/size/i.test(prop.name)) {
          rawSize = prop.value;
        } else if (/colou?r/i.test(prop.name)) {
          colour = prop.value;
        }
      }

      return {
        skuId: String(sv.skuId),
        stock: sv.stock ?? 0,
        price: sv.price,
        rawSize,
        cleanSize: extractCleanSizeCode(rawSize),
        colour,
        matched: false
      };
    });

    // 7. Match and update database variants
    const updatedVariants: Array<{
      productVariantId: string;
      sku: string;
      size: string | null;
      colour: string | null;
      oldStock: number;
      newStock: number;
      oldSkuId: string | null;
      newSkuId: string | null;
    }> = [];

    const zeroStockVariants: Array<{
      productVariantId: string;
      sku: string;
      size: string | null;
    }> = [];

    for (const dbVar of (dbVariants || [])) {
      let dbSize: string | null = null;
      let dbColour: string | null = null;

      for (const pv of (dbVar.product_variant_property_values as any[]) || []) {
        const propObj = Array.isArray(pv.properties) ? pv.properties[0] : pv.properties;
        const propName = propObj?.name || '';
        if (/size/i.test(propName)) {
          dbSize = pv.value;
        } else if (/colou?r/i.test(propName)) {
          dbColour = pv.value;
        }
      }

      const cleanDbSize = dbSize ? extractCleanSizeCode(dbSize) : '';

      // Match strategy:
      // Priority A: Match clean size + colour
      // Priority B: Match clean size only
      // Priority C: If 1-to-1 variant fallback
      let matchedSupplier = supplierVariants.find((sv) => {
        if (sv.matched) return false;
        if (cleanDbSize && sv.cleanSize === cleanDbSize) {
          if (!dbColour || !sv.colour) return true;
          return sv.colour.toLowerCase() === dbColour.toLowerCase();
        }
        return false;
      });

      if (!matchedSupplier && cleanDbSize) {
        matchedSupplier = supplierVariants.find((sv) => !sv.matched && sv.cleanSize === cleanDbSize);
      }

      if (!matchedSupplier && (dbVariants?.length === 1 && supplierVariants.length === 1)) {
        matchedSupplier = supplierVariants[0];
      }

      if (matchedSupplier && updateStock) {
        matchedSupplier.matched = true;
        const newStock = matchedSupplier.stock;
        const newSkuId = matchedSupplier.skuId;

        await supabase
          .from('product_variants')
          .update({
            quantity: newStock,
            aliexpress_sku_id: newSkuId,
            updatedat: new Date().toISOString()
          })
          .eq('productvariantid', dbVar.productvariantid);

        updatedVariants.push({
          productVariantId: dbVar.productvariantid,
          sku: dbVar.sku,
          size: dbSize,
          colour: dbColour,
          oldStock: dbVar.quantity,
          newStock,
          oldSkuId: dbVar.aliexpress_sku_id,
          newSkuId
        });
      } else if (!matchedSupplier && updateStock) {
        // Variant is no longer offered by the new supplier -> set stock to 0 to prevent unfulfillable orders
        await supabase
          .from('product_variants')
          .update({
            quantity: 0,
            updatedat: new Date().toISOString()
          })
          .eq('productvariantid', dbVar.productvariantid);

        zeroStockVariants.push({
          productVariantId: dbVar.productvariantid,
          sku: dbVar.sku,
          size: dbSize
        });
      }
    }

    // 8. Optionally add newly discovered sizes from supplier
    const addedVariants: Array<{
      sku: string;
      size: string;
      stock: number;
      skuId: string;
    }> = [];

    if (addNewVariants) {
      const unmatchedSupplierVariants = supplierVariants.filter((sv) => !sv.matched && sv.cleanSize);

      if (unmatchedSupplierVariants.length > 0) {
        // Look up properties for Size and Colour
        const { data: dbProperties } = await supabase
          .from('properties')
          .select('propertyid, name');

        let sizeProp = dbProperties?.find((p) => /size/i.test(p.name));
        let colourProp = dbProperties?.find((p) => /colou?r/i.test(p.name));

        const baseSku = product.sku || 'PROD';
        const fallbackPrice =
          sellingPrice != null && Number(sellingPrice) > 0
            ? Number(sellingPrice)
            : Number(dbVariants?.[0]?.price) || 19.99;
        const fallbackCompareAt = dbVariants?.[0]?.compare_at_price || null;

        for (const sv of unmatchedSupplierVariants) {
          const candidateSku = `${baseSku}-${sv.cleanSize}`;

          // Ensure SKU uniqueness
          let uniqueSku = candidateSku;
          const { data: existingSku } = await supabase
            .from('product_variants')
            .select('sku')
            .eq('sku', uniqueSku)
            .maybeSingle();

          if (existingSku) {
            uniqueSku = `${candidateSku}-${Math.floor(100 + Math.random() * 900)}`;
          }

          const { data: newVar, error: newVarError } = await supabase
            .from('product_variants')
            .insert({
              productid: productId,
              sku: uniqueSku,
              price: fallbackPrice,
              compare_at_price: fallbackCompareAt,
              promotional_price: fallbackCompareAt && fallbackCompareAt > fallbackPrice ? fallbackPrice : null,
              quantity: sv.stock,
              trackquantity: true,
              isvisible: true,
              aliexpress_sku_id: sv.skuId
            })
            .select()
            .single();

          if (newVar && !newVarError) {
            const propValues: Array<{ productvariantid: string; propertyid: string; value: string }> = [];

            if (sizeProp && (sv.rawSize || sv.cleanSize)) {
              propValues.push({
                productvariantid: newVar.productvariantid,
                propertyid: sizeProp.propertyid,
                value: sv.cleanSize || sv.rawSize
              });
            }

            if (colourProp && sv.colour) {
              propValues.push({
                productvariantid: newVar.productvariantid,
                propertyid: colourProp.propertyid,
                value: sv.colour
              });
            }

            if (propValues.length > 0) {
              await supabase.from('product_variant_property_values').insert(propValues);
            }

            addedVariants.push({
              sku: uniqueSku,
              size: sv.cleanSize || sv.rawSize,
              stock: sv.stock,
              skuId: sv.skuId
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      productId,
      productName: product.name,
      aliexpressProductId: supplierProduct.productId,
      aliexpressProductUrl: targetUrl,
      supplierTitle: supplierProduct.title,
      matchedCount: updatedVariants.length,
      updatedVariants,
      zeroStockVariants,
      addedVariants,
      supplierVariantsSummary: supplierVariants.map((sv) => ({
        size: sv.cleanSize || sv.rawSize,
        colour: sv.colour,
        stock: sv.stock,
        skuId: sv.skuId
      }))
    });
  } catch (error: any) {
    logger.error('Unexpected error in sync-supplier POST:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync supplier' },
      { status: 500 }
    );
  }
}
