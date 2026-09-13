import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { ProductVariantPropertyValue } from '@/lib/types/product-types';
import { isVerifiedAdminRequest } from '@/lib/api/is-verified-admin-request';
import { normalizePromoDiscountPercent } from '@/lib/product-promo';
import { logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/api-error';

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

// GET - Get single product with variants and images
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const { id } = await params;

    // Get product with product type (exclude soft-deleted)
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        *,
        ProductType:product_types(*)
      `)
      .eq('productid', id)
      .neq('isdeleted', true)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const hideFromShop = !!(product as { isdisabled?: boolean }).isdisabled;
    if (hideFromShop && !(await isVerifiedAdminRequest(request))) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get variants first
    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select('*')
      .eq('productid', product.productid);

    // Then get property values for all variants separately
    let variantsWithProps = variants || [];
    if (variants && variants.length > 0) {
      const variantIds = variants.map(v => v.productvariantid);
      
      // Try lowercase first (Supabase PostgREST typically uses lowercase)
      const { data: propertyValues, error: pvError } = await supabase
        .from('product_variant_property_values')
        .select(`
          *,
          Property:properties(*),
          properties(*)
        `)
        .in('productvariantid', variantIds);
      
      let finalPropertyValues = propertyValues;
      
      // If that fails or returns empty, try PascalCase
      if (pvError || !propertyValues || propertyValues.length === 0) {
        const { data: propertyValuesUpper, error: pvErrorUpper } = await supabase
          .from('product_variant_property_values')
          .select(`
            *,
            Property:properties(*),
            properties(*)
          `)
          .in('ProductVariantID', variantIds);
        
        if (!pvErrorUpper && propertyValuesUpper && propertyValuesUpper.length > 0) {
          finalPropertyValues = propertyValuesUpper;
        }
      }

      if (pvError && (!finalPropertyValues || finalPropertyValues.length === 0)) {
        logger.error('Error fetching property values', pvError);
      } else {
        // Group property values by variant
        const propsByVariant: Record<string, any[]> = {};
        finalPropertyValues?.forEach((pv: any) => {
          // Handle both PascalCase and lowercase column names
          const variantId = pv.ProductVariantID || pv.productvariantid;
          if (variantId) {
            if (!propsByVariant[variantId]) {
              propsByVariant[variantId] = [];
            }
            propsByVariant[variantId].push(pv);
          }
        });

        // Attach property values to variants
        variantsWithProps = variants.map(variant => {
          const variantId = variant.productvariantid || variant.ProductVariantID;
          const props = propsByVariant[variantId] || [];
          return {
            ...variant,
            ProductVariantPropertyvalues: props,
            // Also add lowercase version for compatibility
            product_variant_property_values: props
          };
        });
      }
    }

    if (variantsError) {
      logger.error('Error fetching variants', variantsError);
    }

    // Get all product images
    const { data: allImages } = await supabase
      .from('product_images')
      .select('*')
      .eq('productid', product.productid)
      .order('sortorder', { ascending: true });

    // Attach images to their variants (using variantsWithProps which has property values)
    const variantsWithImages = variantsWithProps?.map(variant => {
      // Get all images for this variant
      const variantImagesList = allImages?.filter(img => img.productvariantid === variant.productvariantid) || [];
      const variantImageUrls = variantImagesList.map(img => img.imageurl).filter(Boolean) as string[];
      
      // For backwards compatibility, also include single imageurl
      const firstVariantImage = variantImagesList[0];
      
      const variantData = {
        ...variant,
        images: variantImageUrls.length > 0 ? variantImageUrls : undefined,
        imageurl: firstVariantImage?.imageurl,
        IsPrimaryImage: firstVariantImage?.isprimary || false
      };
      
      return variantData;
    });

    // Get general product images (not variant-specific)
    const images = allImages?.filter(img => !img.productvariantid) || [];

    // Transform to new format with backwards compatibility
    const firstVariant = variants?.[0];
    
    // Extract all unique property values from all variants for easy access
    const variantProperties: Record<string, string[]> = {};
    // Collect all property values across all variants
    (variantsWithImages || []).forEach(variant => {
      const variantProps = variant.ProductVariantPropertyvalues || variant.ProductVariantPropertyValues || [];
      variantProps.forEach((pv: any) => {
        const propName = pv.Property?.name || pv.property?.name;
        const propValue = pv.value || pv.Value;
        if (propName && propValue) {
          const key = propName.toLowerCase();
          if (!variantProperties[key]) {
            variantProperties[key] = [];
          }
          // Only add if not already present
          if (!variantProperties[key].includes(propValue)) {
            variantProperties[key].push(propValue);
          }
        }
      });
    });

    // For backwards compatibility, also create a flattened version
    const flattenedProperties: Record<string, string> = {};
    Object.entries(variantProperties).forEach(([key, values]) => {
      if (values.length > 0) {
        // For single values, use the first one; for multiple values, join them
        flattenedProperties[key] = values.length === 1 ? values[0] : values.join(', ');
      }
    });
    
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
    const category = categoryMap[product.ProductType?.Code?.toLowerCase() || ''] || 'clothes';
    
    const promoRaw = (product as { promodiscountpercent?: number | null }).promodiscountpercent;
    const legacyProduct = {
      // New schema fields
      productid: product.productid,
      name: product.name,
      sku: product.sku,
      description: product.description,
      subtitle: product.subtitle || '', // Add subtitle field
      producttypeid: product.producttypeid,
      rfproducttypeid: (product as { rfproducttypeid?: number }).rfproducttypeid || 1,
      isfeatured: !!(product as { isfeatured?: boolean }).isfeatured,
      isdisabled: !!(product as { isdisabled?: boolean }).isdisabled,
      awaitingrestock: !!(product as { awaitingrestock?: boolean }).awaitingrestock,
      promodiscountpercent:
        promoRaw != null && Number(promoRaw) > 0 ? Number(promoRaw) : null,
      ProductType: product.ProductType,
      Variants: variantsWithImages || [],
      variants: variantsWithImages || [], // Add lowercase version for compatibility
      Images: images || [],
      
      // Legacy fields for backwards compatibility
      id: product.productid,
      brand: brand,
      model: model,
      category: category,
      type: product.ProductType?.name || '',
      color: variantProperties.color || variantProperties.colour || '',
      size: variantProperties.size || '',
      quantity: firstVariant?.quantity || 0,
      price: firstVariant?.price || 0,
      compare_at_price: firstVariant?.compare_at_price ?? null,
      promotional_price: firstVariant?.promotional_price ?? null,
      visible: firstVariant?.isvisible ?? true,
      images: images?.map(img => img.imageurl) || ['/image.png'],
      productTypeID: product.producttypeid,
      propertyvalues: flattenedProperties, // For backwards compatibility
      propertyValues: variantProperties // New format with all values
    };

    return NextResponse.json({
      success: true,
      product: legacyProduct
    });

  } catch (error) {
    return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
  }
}

// PUT - Update product with variants
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const { id } = await params;
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

    // Validate that producttypeid is a leaf category (has no children) if producttypeid is being updated
    if (producttypeid) {
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
    }

    // Update product
    const { data: product, error: productError } = await supabase
      .from('products')
      .update({
        name,
        sku: sku || null,
        description: description || null,
        subtitle: subtitle || null,
        producttypeid,
        rfproducttypeid: rfproducttypeid || 1, // Default to 1 (For Him) if not provided
        isfeatured: isfeatured || false,
        isdisabled: !!isdisabled,
        awaitingrestock: !!awaitingrestock,
        promodiscountpercent: normalizePromoDiscountPercent(promodiscountpercent),
        updatedat: new Date().toISOString()
      })
      .eq('productid', id)
      .select()
      .single();

    if (productError) {
      logger.error('Error updating product', productError);
      return apiErrorResponse({ code: 'PRODUCT_SAVE_FAILED', status: 500, error: productError });
    }

    const { error: deleteProductImagesError } = await supabase
      .from('product_images')
      .delete()
      .eq('productid', id)
      .is('productvariantid', null);

    if (deleteProductImagesError) {
      logger.error('Error deleting product images', deleteProductImagesError);
      return apiErrorResponse({ code: 'PRODUCT_SAVE_FAILED', status: 500, error: deleteProductImagesError });
    }

    if (productImages.length > 0) {
      const uniqueImages = Array.from(new Set(productImages)) as string[];
      const imageRows = uniqueImages.map((imageurl, index) => ({
        productid: id,
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
        return apiErrorResponse({ code: 'PRODUCT_SAVE_FAILED', status: 500, error: productImagesError });
      }
    }

    // Handle variants
    if (Variants.length > 0) {
      // Delete existing variant images first (cascade doesn't work on productvariantid FK)
      await supabase
        .from('product_images')
        .delete()
        .eq('productid', id)
        .not('productvariantid', 'is', null); // Only delete variant-specific images
      
      // Delete existing variants (cascade will delete property values)
      const { error: deleteError } = await supabase
        .from('product_variants')
        .delete()
        .eq('productid', id);
      
      if (deleteError) {
        logger.error('Error deleting existing variants', deleteError);
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
            productid: id,
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
                productid: id,
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
    }

    return NextResponse.json({
      success: true,
      product
    });

  } catch (error) {
    return apiErrorResponse({ code: 'PRODUCT_SAVE_FAILED', status: 500, error });
  }
}

// DELETE - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const { id } = await params;

    // Soft delete product by setting isdeleted = true
    const { error } = await supabase
      .from('products')
      .update({ isdeleted: true, updatedat: new Date().toISOString() })
      .eq('productid', id);

    if (error) {
      logger.error('Error deleting product', error);
      return apiErrorResponse({ code: 'PRODUCT_SAVE_FAILED', status: 500, error });
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
  }
}
