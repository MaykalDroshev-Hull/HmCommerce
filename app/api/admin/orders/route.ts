export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';


interface OrderWithItems {
  orderid: string;
  customerid: string;
  customers?: {
    customerid: string;
    firstname: string;
    lastname: string;
    email: string;
    telephone: string;
    country: string;
    city: string;
  };
  // Legacy fields for backward compatibility
  customerfirstname?: string;
  customerlastname?: string;
  customeremail?: string;
  customertelephone?: string;
  customercountry?: string;
  customercity?: string;
  deliverytype: string;
  deliverynotes: string | null;
  subtotal: number;
  deliverycost: number;
  total: number;
  status: string;
  createdat: string;
  updatedat: string;
  order_items: Array<{
    OrderItemID: string;
    quantity: number;
    price: number;
    createdat: string;
    product?: {
      name: string;
      brand: string | undefined;
      model: string | undefined;
      color: string | undefined;
      size: string | undefined;
      images?: string[];
      allProperties?: Record<string, string>;
    };
  }>;
}

export async function GET(request: NextRequest) {
  try {
    // Fetch all orders with their items and customer info (simplified)
    const { data: orders, error: ordersError } = await supabaseAdmin
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
      .order('createdat', { ascending: false });

    if (ordersError) {
      logger.error('Error fetching orders:', ordersError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch orders'
      }, { status: 500 });
    }

    const variantIds = new Set<string>();
    const productIds = new Set<string>();
    for (const order of orders || []) {
      for (const item of (order as any).order_items || []) {
        if (item.productvariantid) variantIds.add(String(item.productvariantid));
        if (item.productid) productIds.add(String(item.productid));
      }
    }

    const firstImageByVariant: Record<string, string> = {};
    const firstImageByProduct: Record<string, string> = {};

    const vids = [...variantIds];
    if (vids.length > 0) {
      const { data: variantImages } = await supabaseAdmin
        .from('product_images')
        .select('productvariantid, imageurl')
        .in('productvariantid', vids);
      (variantImages || []).forEach((row: { productvariantid?: string; imageurl?: string }) => {
        const vid = row.productvariantid;
        if (vid && row.imageurl && !firstImageByVariant[vid]) {
          firstImageByVariant[vid] = row.imageurl;
        }
      });
    }

    const pids = [...productIds];
    if (pids.length > 0) {
      const { data: prodImages } = await supabaseAdmin
        .from('product_images')
        .select('productid, imageurl')
        .in('productid', pids)
        .is('productvariantid', null);
      (prodImages || []).forEach((row: { productid?: string; imageurl?: string }) => {
        const pid = row.productid;
        if (pid && row.imageurl && !firstImageByProduct[pid]) {
          firstImageByProduct[pid] = row.imageurl;
        }
      });
    }

    // Process the orders data to format it nicely
    const processedOrdersPromises = orders.map(async (order) => {
      const orderItems = await Promise.all(order.order_items.map(async (item: any) => {
        const imgFromVariant = item.productvariantid
          ? firstImageByVariant[String(item.productvariantid)]
          : undefined;
        const imgFromProduct = item.productid ? firstImageByProduct[String(item.productid)] : undefined;
        const primaryImage = imgFromVariant || imgFromProduct || '/placeholder-image.jpg';

        let productInfo = {
          name: 'Unknown Product',
          brand: undefined as string | undefined,
          model: undefined as string | undefined,
          color: undefined as string | undefined,
          size: undefined as string | undefined,
          images: [primaryImage],
          allProperties: {} as Record<string, string>
        };

        // Fetch product and variant details separately
        try {
          if (item.productvariantid) {
            // Get variant details with product info
            const { data: variant, error: variantError } = await supabaseAdmin
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
              .eq('productvariantid', item.productvariantid)
              .single();

            if (variant && !variantError) {
              // Set product name - handle different possible structures
              const productData = variant.products;
              let productName = 'Unknown Product';

              if (productData) {
                if (Array.isArray(productData)) {
                  productName = productData[0]?.name || variant.sku || 'Unknown Product';
                } else {
                  productName = (productData as any).name || variant.sku || 'Unknown Product';
                }
              }

              productInfo.name = productName;

              // Extract ALL property values
              if (variant.product_variant_property_values && Array.isArray(variant.product_variant_property_values)) {
                const allProperties: Record<string, string> = {};
                variant.product_variant_property_values.forEach((pvv: any) => {
                  const propName = pvv.properties?.name;
                  const value = pvv.value;
                  
                  if (propName && value) {
                    // Store all properties with their original names
                    allProperties[propName] = value;
                    
                    // Also set legacy fields for backward compatibility
                    const propNameLower = propName.toLowerCase();
                    if (propNameLower?.includes('color')) {
                      productInfo.color = value;
                    } else if (propNameLower?.includes('size')) {
                      productInfo.size = value;
                    } else if (propNameLower?.includes('brand')) {
                      productInfo.brand = value;
                    } else if (propNameLower?.includes('model')) {
                      productInfo.model = value;
                    }
                  }
                });
                // Add all properties to productInfo
                (productInfo as any).allProperties = allProperties;
              }
            }
          } else if (item.productid) {
            // Get product details directly
            const { data: product, error: productError } = await supabaseAdmin
              .from('products')
              .select('name')
              .eq('productid', item.productid)
              .single();

            if (product && !productError) {
              productInfo.name = product.name || 'Unknown Product';
            }
          }
        } catch (error) {
          logger.error('Error fetching product details for item', error);
          // Keep default productInfo
        }

        return {
          OrderItemID: item.orderitemid,
          quantity: item.quantity,
          price: item.price,
          createdat: item.createdat,
          productvariantid: item.productvariantid, // Debug: include variant ID
          product: productInfo
        };
      }));

      // Map customer data for backward compatibility
      const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
      
      return {
        ...order,
        // Add legacy fields for backward compatibility
        customerfirstname: customer?.firstname || order.customerfirstname,
        customerlastname: customer?.lastname || order.customerlastname,
        customeremail: customer?.email || order.customeremail,
        customertelephone: customer?.telephone || order.customertelephone,
        customercountry: customer?.country || order.customercountry,
        customercity: customer?.city || order.customercity,
        order_items: orderItems
      };
    });

    const processedOrders: OrderWithItems[] = await Promise.all(processedOrdersPromises);

    return NextResponse.json({
      success: true,
      orders: processedOrders
    });

  } catch (error) {
    logger.error('API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
