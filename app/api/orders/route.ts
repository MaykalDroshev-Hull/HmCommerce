export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getVariantCheckoutPrice } from '@/lib/product-promo';
import { getActiveSuperPromoPriceMap } from '@/lib/super-promo';
import { sendCustomerOrderEmail, sendAdminOrderEmail } from '@/lib/email';
import { buildOrderEmailItems } from '@/lib/order-email-items';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateUniqueOrderId } from '@/lib/order-id';
import { logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/api-error';
import { trackServerEvent } from '@/lib/vercel-analytics';

interface OrderData {
  customer: {
    firstName: string;
    lastName: string;
    email?: string;
    telephone: string;
    country: string;
    city: string;
  };
  delivery: {
    type: string;
    notes: string;
    missingEcontOffice?: string;
    econtOfficeId?: string;
    street?: string;
    streetNumber?: string;
    entrance?: string;
    floor?: string;
    apartment?: string;
  };
  items: Array<{
    id: string | number;
    quantity: number;
    size?: string;
    price?: number;
  }>;
  totals: {
    subtotal: number;
    discount?: number;
    delivery: number;
    total: number;
  };
  discount?: {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    amount: number;
  } | null;
}

// Validate stock availability
async function validateStock(items: OrderData['items']): Promise<{ valid: boolean; insufficientStock: any[] }> {
  const supabase = supabaseAdmin;
  const insufficientStock: any[] = [];

  for (const item of items) {
    try {
      // Check if item.id is a variant ID (UUID string with length > 10)
      // This matches the logic in createOrder function
      const isVariantId = item.id && typeof item.id === 'string' && item.id.length > 10;
      
      if (isVariantId) {
        // This is a variant - use item.id directly as the variant ID
        const variantId = item.id;

        // Get variant data including trackquantity and quantity
        const { data: variant, error } = await supabase
          .from('product_variants')
          .select('quantity, trackquantity, isvisible')
          .eq('productvariantid', variantId)
          .single();

        if (error || !variant) {
          logger.error('Error checking variant stock', error);
          // If variant not found, assume insufficient stock
          insufficientStock.push({ 
            id: item.id, 
            variantId: variantId,
            requested: item.quantity, 
            available: 0,
            reason: 'Variant not found'
          });
          continue;
        }

        // Only check stock if trackquantity is enabled and variant is visible
        if ((variant as any).trackquantity !== false && (variant as any).isvisible !== false) {
          const availableQuantity = (variant as any).quantity || 0;
          
          if (availableQuantity < item.quantity) {
            insufficientStock.push({
              id: item.id,
              variantId: variantId,
              requested: item.quantity,
              available: availableQuantity,
              reason: 'Insufficient stock'
            });
          }
        }
      }
    } catch (error) {
      logger.error('Stock validation error', error);
      insufficientStock.push({ 
        id: item.id, 
        requested: item.quantity, 
        available: 0,
        reason: 'Validation error'
      });
    }
  }

  return {
    valid: insufficientStock.length === 0,
    insufficientStock
  };
}

// Reduce stock quantities
async function reduceStock(items: OrderData['items']): Promise<void> {
  const supabase = supabaseAdmin;
  for (const item of items) {
    try {
      // Check if item.id is a variant ID (UUID string with length > 10)
      // This matches the logic in createOrder function
      const isVariantId = item.id && typeof item.id === 'string' && item.id.length > 10;
      
      if (isVariantId) {
        // This is a variant - use item.id directly as the variant ID
        const variantId = item.id;

        // Get current variant data including trackquantity flag
        const { data: variant, error: fetchError } = await supabase
          .from('product_variants')
          .select('quantity, trackquantity, productvariantid')
          .eq('productvariantid', variantId)
          .single();

        if (fetchError) {
          logger.error('Error fetching variant for stock reduction', fetchError);
          throw new Error('Failed to fetch variant for stock reduction');
        }

        if (!variant) {
          logger.error('Variant not found for stock reduction');
          throw new Error('Variant not found for stock reduction');
        }

        // Only reduce stock if trackquantity is enabled (default is true, so check for explicit false)
        const trackQuantity = variant.trackquantity !== false && variant.trackquantity !== null;
        
        if (trackQuantity) {
          const currentQuantity = Number(variant.quantity) || 0;
          const newQuantity = Math.max(0, currentQuantity - item.quantity); // Prevent negative quantities

          // Reduce variant stock - ensure we use the correct column name from schema
          const { error: updateError } = await supabase
            .from('product_variants')
            .update({ 
              quantity: newQuantity,
              updatedat: new Date().toISOString()
            })
            .eq('productvariantid', variantId);

          if (updateError) {
            logger.error('Error reducing variant stock', updateError);
            throw new Error('Failed to reduce stock');
          }
        }
      }
    } catch (error) {
      logger.error('Stock reduction error', error);
      throw error;
    }
  }
}

// Get or create customer
async function getOrCreateCustomer(customerData: OrderData['customer']): Promise<string> {
  const supabase = supabaseAdmin;
  const email = customerData.email?.trim() || '';

  const updateExistingCustomer = async (customerId: string) => {
    await supabase
      .from('customers')
      .update({
        firstname: customerData.firstName,
        lastname: customerData.lastName,
        telephone: customerData.telephone,
        country: customerData.country,
        city: customerData.city,
        updatedat: new Date().toISOString()
      })
      .eq('customerid', customerId);
  };

  if (email) {
    const { data: existingCustomer, error: fetchError } = await supabase
      .from('customers')
      .select('customerid')
      .eq('email', email)
      .single();

    if (existingCustomer && !fetchError) {
      await updateExistingCustomer(existingCustomer.customerid);
      return existingCustomer.customerid;
    }
  } else {
    const { data: existingByPhone, error: phoneFetchError } = await supabase
      .from('customers')
      .select('customerid')
      .eq('telephone', customerData.telephone)
      .maybeSingle();

    if (existingByPhone && !phoneFetchError) {
      await updateExistingCustomer(existingByPhone.customerid);
      return existingByPhone.customerid;
    }
  }

  const customerEmail =
    email || `guest.${Date.now()}.${Math.random().toString(36).slice(2, 9)}@checkout.local`;

  const { data: newCustomer, error: createError } = await supabase
    .from('customers')
    .insert({
      firstname: customerData.firstName,
      lastname: customerData.lastName,
      email: customerEmail,
      telephone: customerData.telephone,
      country: customerData.country,
      city: customerData.city
    })
    .select('customerid')
    .single();

  if (createError || !newCustomer) {
    logger.error('Failed to create customer', createError);
    throw new Error('Failed to create customer');
  }

  return newCustomer.customerid;
}

// Create order record
async function createOrder(orderData: OrderData): Promise<string> {
  const supabase = supabaseAdmin;
  const orderId = await generateUniqueOrderId(supabase);

  // Get or create customer first
  const customerId = await getOrCreateCustomer(orderData.customer);

  const baseNotes = orderData.delivery.notes?.trim();
  const missingOffice = orderData.delivery.missingEcontOffice?.trim();
  const missingOfficeNote = missingOffice ? `NEW DELIVERY LOCATION: ${missingOffice}` : '';
  const deliveryNotes = [baseNotes, missingOfficeNote].filter(Boolean).join('\n');

  const orderRecord = {
    orderid: orderId,
    customerid: customerId,
    deliverytype: orderData.delivery.type,
    deliverynotes: deliveryNotes || null,
    econtoffice: orderData.delivery.econtOfficeId || null,
    deliverystreet: orderData.delivery.street || null,
    deliverystreetnumber: orderData.delivery.streetNumber || null,
    deliveryentrance: orderData.delivery.entrance || null,
    deliveryfloor: orderData.delivery.floor || null,
    deliveryapartment: orderData.delivery.apartment || null,
    subtotal: orderData.totals.subtotal,
    deliverycost: orderData.totals.delivery,
    total: orderData.totals.total,
    discountcode: orderData.discount?.code || null,
    discounttype: orderData.discount?.type || null,
    discountvalue: orderData.discount?.value || null,
    discountamount: orderData.discount?.amount || 0,
    status: 'pending',
    createdat: new Date().toISOString(),
    updatedat: new Date().toISOString()
  };

  const { data: order, error } = await (supabase as any)
    .from('orders')
    .insert(orderRecord)
    .select()
    .single();

  if (error) {
    logger.error('Failed to create order record', error);
    throw new Error('Failed to create order record');
  }

  // Create order items
  const variantCartIds = orderData.items
    .filter((item) => item.id && typeof item.id === 'string' && item.id.length > 10)
    .map((item) => String(item.id));
  const superPromoPriceMap = await getActiveSuperPromoPriceMap(supabase, variantCartIds);

  const orderItemsPromises = orderData.items.map(async (item) => {
    let productId = null;
    let productVariantId = null;
    let price = 0;

    // Check if item.id is a variant ID (UUID string) or product ID (number/string)
    if (item.id && typeof item.id === 'string' && item.id.length > 10) {
      // Looks like a UUID variant ID (from cart when size is selected)
      const { data: variant } = await supabase
        .from('product_variants')
        .select('productid, price, promotional_price, products(promodiscountpercent)')
        .eq('productvariantid', item.id)
        .single();

      if (variant) {
        productId = variant.productid;
        productVariantId = item.id;
        const product = Array.isArray(variant.products) ? variant.products[0] : variant.products;
        const superPromoPrice = superPromoPriceMap.get(String(item.id));
        price =
          superPromoPrice ??
          getVariantCheckoutPrice(variant, product || undefined);
      }
    } else if (item.id) {
      // Assume it's a product ID (for products without variants)
      productId = item.id;
      // For products without variants, price comes from cart item
      price = item.price || 0;
    }

    return {
      orderid: orderId,
      productid: productId,
      productvariantid: productVariantId, // Use lowercase column name to match schema
      quantity: item.quantity,
      price: price,
      createdat: new Date().toISOString()
    };
  });

  const orderItems = await Promise.all(orderItemsPromises);

  const { error: itemsError } = await (supabase as any)
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    logger.error('Error creating order items', itemsError);
    throw new Error('Failed to create order items');
  }

  return orderId;
}

export async function POST(request: NextRequest) {
  try {
    const orderData: OrderData = await request.json();

    // Validate stock availability before creating order
    const stockValidation = await validateStock(orderData.items);
    if (!stockValidation.valid) {
      logger.error('Stock validation failed', { count: stockValidation.insufficientStock.length });
      return NextResponse.json({
        success: false,
        error: 'Insufficient stock',
        insufficientStock: stockValidation.insufficientStock
      }, { status: 400 });
    }

    // Create order record
    const orderId = await createOrder(orderData);

    // Reduce stock quantities after order is successfully created
    await reduceStock(orderData.items);

    // Fetch order details with products for emails
    const supabase = supabaseAdmin;
    const { data: orderWithItems } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          orderitemid,
          quantity,
          price,
          productid,
          productvariantid
        )
      `)
      .eq('orderid', orderId)
      .single();

    const itemsWithDetails = await buildOrderEmailItems(
      supabase,
      orderWithItems?.order_items || []
    );

    // Fetch store settings to get language
    const { data: storeSettings } = await supabase
      .from('store_settings')
      .select('language')
      .limit(1)
      .single();

    const language = 'en';

    // Prepare order details for emails
    const orderDetails = {
      orderId,
      customer: orderData.customer,
      delivery: {
        ...orderData.delivery,
        street: orderData.delivery.street,
        streetNumber: orderData.delivery.streetNumber,
        entrance: orderData.delivery.entrance,
        floor: orderData.delivery.floor,
        apartment: orderData.delivery.apartment,
        econtOfficeId: orderData.delivery.econtOfficeId
      },
      items: itemsWithDetails,
      totals: orderData.totals,
      orderDate: new Date().toISOString()
    };

    // Send emails (run in parallel)
    const [customerEmailResult, adminEmailResult] = await Promise.allSettled([
      sendCustomerOrderEmail(orderDetails, language),
      sendAdminOrderEmail(orderDetails, language)
    ]);

    // Log email results
    if (customerEmailResult.status === 'rejected') {
      logger.error('Customer order email failed', customerEmailResult.reason);
    }
    if (adminEmailResult.status === 'rejected') {
      logger.error('Admin order email failed', adminEmailResult.reason);
    }

    void trackServerEvent('Purchase', {
      orderId,
      itemCount: orderData.items.length,
      value: Math.round((orderData.totals.total || 0) * 100) / 100,
      currency: 'EUR',
      deliveryType: orderData.delivery.type,
      hasDiscount: Boolean(orderData.discount?.code),
      language,
    });

    return NextResponse.json({
      success: true,
      orderId,
      message: 'Order placed successfully'
    });

  } catch (error) {
    return apiErrorResponse({ code: 'ORDER_FAILED', status: 500, error });
  }
}
