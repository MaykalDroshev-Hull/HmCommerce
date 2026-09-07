import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = supabaseAdmin;
    const { id } = await params;

    // Fetch order with items and customer details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customers (
          customerid,
          firstname,
          lastname,
          email,
          telephone,
          country,
          city
        ),
        order_items (
          orderitemid,
          quantity,
          price,
          createdat,
          productid,
          productvariantid
        )
      `)
      .eq('orderid', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Fetch product details for each order item
    const itemsWithDetails = await Promise.all(
      (order.order_items || []).map(async (item: any) => {
        let productInfo = {
          name: 'Unknown Product',
          brand: undefined as string | undefined,
          model: undefined as string | undefined,
          color: undefined as string | undefined,
          size: undefined as string | undefined,
          imageUrl: '/image.png' as string,
        };

        try {
          if (item.productvariantid) {
            // Get variant details with product info
            const { data: variant } = await supabase
              .from('product_variants')
              .select(`
                sku,
                productid,
                products (
                  name,
                  product_images (
                    imageurl,
                    sortorder
                  )
                ),
                product_variant_property_values (
                  value,
                  properties (
                    name
                  )
                )
              `)
              .eq('productvariantid', item.productvariantid)
              .single();

            if (variant) {
              const products = variant.products as any;
              const productName = Array.isArray(products)
                ? products[0]?.name
                : products?.name;
              productInfo.name = productName || variant.sku || 'Unknown Product';

              // Get first image
              const images = Array.isArray(products)
                ? products[0]?.product_images || []
                : products?.product_images || [];
              if (images && images.length > 0) {
                const sortedImages = images.sort((a: any, b: any) => 
                  (a.sortorder || 0) - (b.sortorder || 0)
                );
                productInfo.imageUrl = sortedImages[0]?.imageurl || '/image.png';
              }

              // Extract property values
              if (variant.product_variant_property_values) {
                variant.product_variant_property_values.forEach((pvv: any) => {
                  const propName = pvv.properties?.name?.toLowerCase();
                  const value = pvv.value;
                  if (propName?.includes('color')) {
                    productInfo.color = value;
                  } else if (propName?.includes('size')) {
                    productInfo.size = value;
                  } else if (propName?.includes('brand')) {
                    productInfo.brand = value;
                  } else if (propName?.includes('model')) {
                    productInfo.model = value;
                  }
                });
              }
            }
          } else if (item.productid) {
            // Get product details directly
            const { data: product } = await supabase
              .from('products')
              .select(`
                name,
                product_images (
                  imageurl,
                  sortorder
                )
              `)
              .eq('productid', item.productid)
              .single();

            if (product) {
              productInfo.name = product.name || 'Unknown Product';
              const images = product.product_images || [];
              if (images && images.length > 0) {
                const sortedImages = images.sort((a: any, b: any) => 
                  (a.sortorder || 0) - (b.sortorder || 0)
                );
                productInfo.imageUrl = sortedImages[0]?.imageurl || '/image.png';
              }
            }
          }
        } catch (error) {
          logger.error('Error fetching product details for item', error);
        }

        return {
          ...item,
          product: productInfo
        };
      })
    );

    // Extract customer data from nested customers object and flatten it
    const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
    const flattenedOrder = {
      ...order,
      // Flatten customer fields to match frontend expectations
      customerfirstname: customer?.firstname || '',
      customerlastname: customer?.lastname || '',
      customeremail: customer?.email || '',
      customertelephone: customer?.telephone || '',
      customercountry: customer?.country || '',
      customercity: customer?.city || '',
      items: itemsWithDetails
    };
    
    // Remove the nested customers object as it's now flattened
    delete flattenedOrder.customers;

    return NextResponse.json({
      success: true,
      order: flattenedOrder
    });

  } catch (error) {
    logger.error('Failed to fetch order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}








