export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { capturePaypalOrder } from '@/lib/paypal';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateUniqueOrderId } from '@/lib/order-id';
import { sendCustomerOrderEmail, sendAdminOrderEmail } from '@/lib/email';
import { buildOrderEmailItems } from '@/lib/order-email-items';
import { logger } from '@/lib/logger';
import { trackServerEvent } from '@/lib/vercel-analytics';

async function getOrCreateCustomer(customerData: {
  firstName: string;
  lastName: string;
  email?: string;
  telephone?: string;
  country: string;
  city: string;
}): Promise<string> {
  const supabase = supabaseAdmin;
  const email = customerData.email?.trim() || '';

  if (email) {
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('customerid')
      .eq('email', email)
      .maybeSingle();

    if (existingCustomer) {
      await supabase
        .from('customers')
        .update({
          firstname: customerData.firstName,
          lastname: customerData.lastName,
          telephone: customerData.telephone || '',
          country: customerData.country,
          city: customerData.city,
          updatedat: new Date().toISOString(),
        })
        .eq('customerid', existingCustomer.customerid);

      return existingCustomer.customerid;
    }
  }

  const customerEmail =
    email || `paypal.${Date.now()}.${Math.random().toString(36).slice(2, 9)}@checkout.local`;

  const { data: newCustomer, error: createError } = await supabase
    .from('customers')
    .insert({
      firstname: customerData.firstName,
      lastname: customerData.lastName,
      email: customerEmail,
      telephone: customerData.telephone || '',
      country: customerData.country,
      city: customerData.city,
    })
    .select('customerid')
    .single();

  if (createError || !newCustomer) {
    logger.error('Failed to create customer in PayPal capture', createError);
    throw new Error('Failed to create customer');
  }

  return newCustomer.customerid;
}

async function reduceStock(items: Array<{ id: string | number; quantity: number }>): Promise<void> {
  const supabase = supabaseAdmin;
  for (const item of items) {
    try {
      const isVariantId = item.id && typeof item.id === 'string' && item.id.length > 10;
      if (isVariantId) {
        const variantId = item.id;
        const { data: variant } = await supabase
          .from('product_variants')
          .select('quantity, trackquantity, productvariantid')
          .eq('productvariantid', variantId)
          .single();

        if (variant && variant.trackquantity !== false) {
          const currentQuantity = Number(variant.quantity) || 0;
          const newQuantity = Math.max(0, currentQuantity - item.quantity);
          await supabase
            .from('product_variants')
            .update({
              quantity: newQuantity,
              updatedat: new Date().toISOString(),
            })
            .eq('productvariantid', variantId);
        }
      }
    } catch (error) {
      logger.error('PayPal capture stock reduction error', error);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderID, type = 'cart', productData, cartItems, discount } = body;

    if (!orderID) {
      return NextResponse.json({ error: 'Missing PayPal orderID' }, { status: 400 });
    }

    // 1. Capture order with PayPal
    const captureData = await capturePaypalOrder(orderID);

    if (captureData.status !== 'COMPLETED') {
      logger.error('PayPal order capture incomplete', { status: captureData.status, orderID });
      return NextResponse.json(
        { error: `Payment not completed. Status: ${captureData.status}` },
        { status: 400 }
      );
    }

    const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];
    const captureId = capture?.id || '';
    const payer = captureData.payer || {};
    const shipping = captureData.purchase_units?.[0]?.shipping || {};
    const address = shipping.address || {};

    // 2. Parse customer & shipping details
    const shippingFullName = shipping.name?.full_name || '';
    const nameParts = shippingFullName.trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || payer.name?.given_name || 'Valued';
    const lastName = nameParts.slice(1).join(' ') || payer.name?.surname || 'Customer';

    const email = payer.email_address || '';
    const telephone = payer.phone?.phone_number?.national_number || '';

    const street = address.address_line_1 || '';
    const streetNumber = address.address_line_2 || '';
    const city = address.admin_area_2 || address.admin_area_1 || 'United Kingdom';
    const postalCode = address.postal_code || '';
    const country = address.country_code === 'GB' ? 'United Kingdom' : (address.country_code || 'United Kingdom');

    // 3. Resolve Items and Totals
    let orderItems: Array<{ id: string | number; quantity: number; price: number; name?: string }> = [];
    let subtotal = 0;
    let deliveryCost = 0;
    let total = Number(capture?.amount?.value) || 0;

    if (type === 'product' && productData) {
      const pPrice = Number(productData.price) || 0;
      const pQty = Number(productData.quantity) || 1;
      subtotal = pPrice * pQty;
      deliveryCost = subtotal >= 50 ? 0.0 : 3.99;
      if (!total) total = subtotal + deliveryCost;

      orderItems = [
        {
          id: productData.variantId || productData.productId,
          quantity: pQty,
          price: pPrice,
          name: [productData.title, productData.colour, productData.size].filter(Boolean).join(' - '),
        },
      ];
    } else if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
      orderItems = cartItems.map((ci: any) => ({
        id: ci.id,
        quantity: Number(ci.quantity) || 1,
        price: Number(ci.price) || 0,
        name: (ci.name || `${ci.brand || ''} ${ci.model || ''}`).trim(),
      }));
      subtotal = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
      deliveryCost = subtotal >= 50 ? 0.0 : 3.99;
      if (!total) total = subtotal + deliveryCost;
    } else {
      total = Number(capture?.amount?.value) || 0;
      subtotal = total;
    }

    // 4. Save to Database
    const supabase = supabaseAdmin;
    const customerId = await getOrCreateCustomer({
      firstName,
      lastName,
      email,
      telephone,
      country,
      city,
    });

    const uniqueOrderId = await generateUniqueOrderId(supabase);

    const fullStreetAddress = [street, streetNumber].filter(Boolean).join(', ');

    const orderRecord = {
      orderid: uniqueOrderId,
      customerid: customerId,
      deliverytype: 'address',
      deliverynotes: postalCode ? `Postcode: ${postalCode}` : null,
      deliverystreet: fullStreetAddress || null,
      deliverystreetnumber: postalCode || null,
      subtotal,
      deliverycost: deliveryCost,
      total,
      discountcode: discount?.code || null,
      discounttype: discount?.type || null,
      discountvalue: discount?.value || null,
      discountamount: discount?.amount || 0,
      paymentmethod: 'paypal',
      paypal_order_id: orderID,
      paypal_capture_id: captureId,
      status: 'paid',
      createdat: new Date().toISOString(),
      updatedat: new Date().toISOString(),
    };

    const { error: orderError } = await (supabase as any)
      .from('orders')
      .insert(orderRecord);

    if (orderError) {
      logger.error('Failed to create order record in PayPal capture', orderError);
      throw new Error('Failed to create order record');
    }

    // Insert order items
    if (orderItems.length > 0) {
      const itemsToInsert = orderItems.map((item) => {
        const isVariantId = item.id && typeof item.id === 'string' && item.id.length > 10;
        return {
          orderid: uniqueOrderId,
          productid: isVariantId ? null : item.id,
          productvariantid: isVariantId ? item.id : null,
          quantity: item.quantity,
          price: item.price,
          createdat: new Date().toISOString(),
        };
      });

      const { error: itemsError } = await (supabase as any)
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) {
        logger.error('Error inserting order items in PayPal capture', itemsError);
      }
    }

    // 5. Reduce stock
    await reduceStock(orderItems);

    // 6. Send transactional emails
    try {
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
        .eq('orderid', uniqueOrderId)
        .single();

      const itemsWithDetails = await buildOrderEmailItems(
        supabase,
        orderWithItems?.order_items || []
      );

      const orderDetails = {
        orderId: uniqueOrderId,
        customer: {
          firstName,
          lastName,
          email,
          telephone,
          country,
          city,
        },
        delivery: {
          type: 'address',
          notes: postalCode ? `Postcode: ${postalCode}` : '',
          street: fullStreetAddress,
          streetNumber: postalCode,
        },
        items: itemsWithDetails,
        totals: {
          subtotal,
          delivery: deliveryCost,
          total,
          discount: discount?.amount || 0,
        },
        orderDate: new Date().toISOString(),
      };

      await Promise.allSettled([
        sendCustomerOrderEmail(orderDetails, 'en'),
        sendAdminOrderEmail(orderDetails, 'en'),
      ]);
    } catch (emailErr) {
      logger.error('Failed to send PayPal order confirmation email', emailErr);
    }

    // 7. Track analytics
    void trackServerEvent('Purchase', {
      orderId: uniqueOrderId,
      itemCount: orderItems.length,
      value: Math.round(total * 100) / 100,
      currency: 'GBP',
      deliveryType: 'address',
      hasDiscount: Boolean(discount?.code),
      language: 'en',
    });

    return NextResponse.json({
      success: true,
      orderId: uniqueOrderId,
      paypalOrderId: orderID,
      captureId,
    });
  } catch (error: any) {
    logger.error('PayPal capture route error', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to capture PayPal order' },
      { status: 500 }
    );
  }
}
