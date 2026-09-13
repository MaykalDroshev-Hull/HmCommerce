import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isVerifiedAdminRequest } from '@/lib/api/is-verified-admin-request';
import { normalizePromoDiscountPercent } from '@/lib/product-promo';
import { logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/api-error';

// Type-safe Supabase client for this module
const getSupabase = () => supabaseAdmin as any;

// Ensure SKUs are unique by checking database and generating alternatives if needed
async function ensureUniqueSKUs(variants: any[], supabase: any) {
  if (variants.length === 0) return variants;

  // Get all SKUs from variants
  const skus = variants.map(v => v.sku).filter(Boolean);
  if (skus.length === 0) return variants;

  // Batch check all SKUs at once
  const { data: existingVariants } = await supabase
    .from('product_variants')
    .select('sku')
    .in('sku', skus);

  const existingSKUs = new Set((existingVariants || []).map((v: any) => v.sku));

  // Process each variant to ensure unique SKU
  const processedVariants = [];
  for (const variant of variants) {
    let finalSKU = variant.sku;
    let counter = 1;

    // Only check if SKU is in the existing set
    while (existingSKUs.has(finalSKU)) {
      // Generate alternative SKU
      const baseSKU = variant.sku.split('-').slice(0, -1).join('-') || variant.sku;
      finalSKU = `${baseSKU}-${counter}`;
      counter++;

      // Safety check to prevent infinite loops
      if (counter > 100) {
        finalSKU = `${variant.sku}_${Date.now()}`;
        break;
      }
    }

    // Add to set to prevent duplicates within the same batch
    if (finalSKU !== variant.sku) {
      existingSKUs.add(finalSKU);
    }

    processedVariants.push({
      ...variant,
      sku: finalSKU
    });
  }

  return processedVariants;
}

// GET - Fetch all products with variants and images
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const rfproducttypeid = searchParams.get('rfproducttypeid');
    const propertyid = searchParams.get('propertyid');
    const basic = searchParams.get('basic') === 'true';
    const producttypeid = searchParams.get('producttypeid');
    const excludeId = searchParams.get('excludeId');
    const limit = searchParams.get('limit');

    const hideDisabledProducts = !(
      searchParams.get('includeDisabled') === 'true' && (await isVerifiedAdminRequest(request))
    );

    // Build query
    let query = supabase
      .from('products')
      .select(`
        *,
        product_types(*)
      `)
      .neq('isdeleted', true);

    if (hideDisabledProducts) {
      query = query.eq('isdisabled', false);
    }

    // Filter by rfproducttypeid if provided
    if (rfproducttypeid) {
      query = query.eq('rfproducttypeid', parseInt(rfproducttypeid));
    }

    // Filter by product type if provided
    if (producttypeid) {
      query = query.eq('producttypeid', producttypeid);
    }

    if (propertyid) {
      const { data: productPropertyValues, error: propertyValuesError } = await supabase
        .from('product_property_values')
        .select('productid')
        .eq('propertyid', propertyid);

      if (propertyValuesError) {
        logger.error('Error fetching product property values', propertyValuesError);
        return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error: propertyValuesError });
      }

      const { data: variantPropertyValues, error: variantPropertyError } = await supabase
        .from('product_variant_property_values')
        .select('product_variants(productid)')
        .eq('propertyid', propertyid);

      if (variantPropertyError) {
        logger.error('Error fetching product variant property values', variantPropertyError);
        return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error: variantPropertyError });
      }

      const productIds = new Set<string>();
      (productPropertyValues || []).forEach((row: any) => {
        if (row.productid) productIds.add(row.productid);
      });
      (variantPropertyValues || []).forEach((row: any) => {
        const productId = row.product_variants?.productid;
        if (productId) productIds.add(productId);
      });

      const productIdList = Array.from(productIds);
      if (productIdList.length === 0) {
        return NextResponse.json({
          success: true,
          products: []
        });
      }

      if (basic) {
        let basicQuery = supabase
          .from('products')
          .select('productid,name')
          .in('productid', productIdList)
          .neq('isdeleted', true);

        if (hideDisabledProducts) {
          basicQuery = basicQuery.eq('isdisabled', false);
        }

        const { data: basicProducts, error: basicError } = await basicQuery.order('name', { ascending: true });

        if (basicError) {
          logger.error('Error fetching basic products', basicError);
          return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error: basicError });
        }

        return NextResponse.json({
          success: true,
          products: basicProducts || []
        });
      }

      query = query.in('productid', productIdList);
    }
    // Exclude specific product ID (for related products)
    if (excludeId) {
      query = query.neq('productid', excludeId);
    }

    // Filter by isfeatured if provided
    const isFeatured = searchParams.get('isfeatured');
    if (isFeatured === 'true') {
      query = query.eq('isfeatured', true);
    }

    // Apply limit if provided
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: products, error: productsError } = await query
      .order('createdat', { ascending: false });

    if (productsError) {
      logger.error('Error fetching products', productsError);
      return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error: productsError });
    }

    // For each product, get variants and images
    const productsWithDetails = await Promise.all(
      (products || []).map(async (product: any) => {
        // Get variants
        const { data: variants } = await supabase
          .from('product_variants')
          .select(`
            *,
            product_variant_property_values(
              *,
              properties(*)
            )
          `)
          .eq('productid', product.productid);

        // Get images
        const { data: images } = await supabase
          .from('product_images')
          .select('*')
          .eq('productid', product.productid)
          .order('sortorder', { ascending: true });

        // For backwards compatibility, create a "legacy" product from the first variant
        const firstVariant = variants?.[0];
        
        // Extract property values from variant for easy access
        const variantProperties = firstVariant?.product_variant_property_values?.reduce((acc: Record<string, string>, pv: any) => {
          if (pv.properties?.name) {
            acc[pv.properties.name] = pv.value;
          }
          return acc;
        }, {}) || {};
        
        // Try to extract brand and model from name (format: "Brand Model")
        const nameParts = product.name?.split(' ') || [];
        const brand = nameParts[0] || 'Unknown';
        const model = nameParts.slice(1).join(' ') || product.name || 'Unknown';
        
        // Map ProductType code to legacy category
        const categoryMap: Record<string, 'clothes' | 'shoes' | 'accessories'> = {
          'clothes': 'clothes',
          'shoes': 'shoes',
          'accessories': 'accessories',
          'shirts': 'clothes',
          'pants': 'clothes',
          'jackets': 'clothes',
          'sneakers': 'shoes',
          'boots': 'shoes',
          'bags': 'accessories',
          'watches': 'accessories'
        };
        const category = categoryMap[product.product_types?.code?.toLowerCase() || ''] || 'clothes';

        const productImages = (images || []).filter((img: any) => !img.productvariantid);
        const productImageUrls = productImages.map((img: any) => img.imageurl).filter(Boolean);

        const legacyProduct = {
          // New schema fields
          ...product,
          variants: variants || [],
          productTypeID: product.producttypeid,
          isfeatured: product.isfeatured || false,
          awaitingrestock: !!product.awaitingrestock,
          promodiscountpercent:
            product.promodiscountpercent != null && Number(product.promodiscountpercent) > 0
              ? Number(product.promodiscountpercent)
              : null,

          // Legacy fields for backwards compatibility
          id: product.productid,
          brand: brand,
          model: model,
          category: category,
          type: product.product_types?.name || '',
          color: variantProperties.color || variantProperties.colour || '',
          size: variantProperties.size || '',
          price: firstVariant?.price || 0,
          compare_at_price: firstVariant?.compare_at_price ?? null,
          promotional_price: firstVariant?.promotional_price ?? null,
          quantity: firstVariant?.quantity || 0,
          visible: firstVariant?.isvisible ?? true,
          images: productImageUrls.length > 0 ? productImageUrls : ['/image.png'],
          description: product.description || '',
          subtitle: product.subtitle || '',
          propertyValues: variantProperties
        };

        return legacyProduct;
      })
    );

    return NextResponse.json({
      success: true,
      products: productsWithDetails
    });

  } catch (error) {
    return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
  }
}

// POST - Create new product with variants
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();

    const {
      name,
      sku,
      description,
      subtitle,
      producttypeid,
      rfproducttypeid,
      isfeatured,
      isdisabled,
      awaitingrestock,
      promodiscountpercent,
      Variants = [],
    } = body;
    const productImages = Array.isArray(body.productImages) ? body.productImages.filter(Boolean) : [];

    // Ensure SKUs are unique before creating variants
    const uniqueVariants = await ensureUniqueSKUs(Variants, supabase);


    if (!name || !producttypeid) {
      return NextResponse.json(
        { error: 'Missing required fields: name, producttypeid' },
        { status: 400 }
      );
    }

    // Validate that producttypeid is a leaf category (has no children)
    const { data: categoryChildren, error: childrenError } = await supabase
      .from('product_types')
      .select('producttypeid')
      .eq('parent_producttypeid', producttypeid)
      .limit(1);

    if (childrenError) {
      logger.error('Error checking category children', childrenError);
      return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error: childrenError });
    }

    if (categoryChildren && categoryChildren.length > 0) {
      return NextResponse.json(
        { error: 'Products can only be assigned to leaf categories (categories with no subcategories). This category has child categories.' },
        { status: 400 }
      );
    }

    // Create the product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name,
        sku,
        description,
        subtitle: subtitle || null,
        producttypeid,
        rfproducttypeid: rfproducttypeid || 1, // Default to 1 (For Him) if not provided
        isfeatured: isfeatured || false,
        isdisabled: !!isdisabled,
        awaitingrestock: !!awaitingrestock,
        promodiscountpercent: normalizePromoDiscountPercent(promodiscountpercent),
        updatedat: new Date().toISOString()
      })
      .select()
      .single();

    if (productError) {
      logger.error('Error creating product', productError);
      return apiErrorResponse({ code: 'PRODUCT_SAVE_FAILED', status: 500, error: productError });
    }

    if (productImages.length > 0) {
      const uniqueImages = Array.from(new Set(productImages)) as string[];
      const imageRows = uniqueImages.map((imageurl, index) => ({
        productid: product.productid,
        productvariantid: null,
        imageurl,
        isprimary: index === 0,
        sortorder: index
      }));

      const { error: productImagesError } = await supabase
        .from('product_images')
        .insert(imageRows);

      if (productImagesError) {
        logger.error('Error creating product images', productImagesError);
      }
    }

      // Batch create all variants at once
      if (uniqueVariants.length > 0) {
        const variantRows = uniqueVariants.map((variantData) => {
          const price = Number(variantData.price) || 0;
          const promotionalPrice =
            variantData.promotional_price != null &&
            variantData.promotional_price !== '' &&
            !isNaN(Number(variantData.promotional_price)) &&
            Number(variantData.promotional_price) > 0
              ? Number(variantData.promotional_price)
              : null;
          const compareAtPrice =
            variantData.compare_at_price != null &&
            variantData.compare_at_price !== '' &&
            !isNaN(Number(variantData.compare_at_price)) &&
            Number(variantData.compare_at_price) > 0
              ? Number(variantData.compare_at_price)
              : (promotionalPrice && promotionalPrice < price ? price : null);

          return {
            productid: product.productid,
            sku: variantData.sku,
            price,
            compare_at_price: compareAtPrice,
            promotional_price: promotionalPrice,
            quantity: variantData.quantity || 0,
            trackquantity: variantData.trackquantity ?? true,
            isvisible: variantData.isvisible ?? true
          };
        });

        const { data: createdVariants, error: variantError } = await supabase
          .from('product_variants')
          .insert(variantRows)
          .select();

        if (variantError) {
          logger.error('Error creating variants', variantError);
          return apiErrorResponse({ code: 'PRODUCT_SAVE_FAILED', status: 500, error: variantError });
        }

        // Batch insert all property values
        const allPropertyValues: any[] = [];
        createdVariants.forEach((variant: any, index: number) => {
          const variantData = uniqueVariants[index];
          const propertyvalues = variantData.propertyvalues || [];
          
          propertyvalues.forEach((pv: any) => {
            allPropertyValues.push({
              productvariantid: variant.productvariantid,
              propertyid: pv.propertyid,
              value: pv.value
            });
          });
        });

        if (allPropertyValues.length > 0) {
          const { error: pvError } = await supabase
            .from('product_variant_property_values')
            .insert(allPropertyValues);

          if (pvError) {
            logger.error('Error creating property values', pvError);
          }
        }

        // Batch insert all variant images
        const allVariantImages: any[] = [];
        createdVariants.forEach((variant: any, index: number) => {
          const variantData = uniqueVariants[index];
          const { imageurl, images, IsPrimaryImage } = variantData;
          
          // Handle variant images - prioritize images array, fall back to imageurl
          const variantImages = images && Array.isArray(images) && images.length > 0 
            ? images 
            : imageurl 
              ? [imageurl] 
              : [];

          if (variantImages.length > 0) {
            variantImages.forEach((imgUrl: string, imgIndex: number) => {
              allVariantImages.push({
                productid: product.productid,
                productvariantid: variant.productvariantid,
                imageurl: imgUrl,
                isprimary: (IsPrimaryImage && imgIndex === 0) || imgIndex === 0,
                sortorder: imgIndex
              });
            });
          }
        });

        if (allVariantImages.length > 0) {
          const { error: imageError } = await supabase
            .from('product_images')
            .insert(allVariantImages);

          if (imageError) {
            logger.error('Error creating variant images', imageError);
          }
        }
      }

    return NextResponse.json({
      success: true,
      product
    });

  } catch (error) {
    return apiErrorResponse({ code: 'PRODUCT_SAVE_FAILED', status: 500, error });
  }
}