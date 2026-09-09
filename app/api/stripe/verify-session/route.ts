import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { sendCustomerOrderEmail, sendAdminOrderEmail } from '@/lib/email';
import { buildOrderEmailItems } from '@/lib/order-email-items';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const orderId = searchParams.get('orderId');

    if (!sessionId || !orderId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId or orderId' },
        { status: 400 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { success: false, error: 'Stripe not initialized' },
        { status: 500 }
      );
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        success: false,
        paymentStatus: session.payment_status,
      });
    }

    const detectedMethod =
      session.metadata?.paymentMethod ||
      (session.payment_method_types?.includes('klarna') ? 'klarna' : 'card');

    const supabase = supabaseAdmin;

    // Check current order status
    const { data: currentOrder } = await (supabase as any)
      .from('orders')
      .select('status')
      .eq('orderid', orderId)
      .single();

    const wasAlreadyPaid = currentOrder?.status === 'paid';

    // Update order status & shipping details in database from Apple Pay / Stripe
    const shippingDetails = (session as any).shipping_details;
    const customerDetails = (session as any).customer_details;

    const orderUpdates: any = {
      status: 'paid',
      paymentmethod: detectedMethod,
      stripe_checkout_session_id: session.id,
      updatedat: new Date().toISOString(),
    };

    if (shippingDetails?.address) {
      if (shippingDetails.address.line1) {
        orderUpdates.deliverystreet = shippingDetails.address.line1;
      }
      if (shippingDetails.address.postal_code) {
        orderUpdates.deliverystreetnumber = shippingDetails.address.postal_code;
      }
      if (shippingDetails.address.line2) {
        orderUpdates.deliveryentrance = shippingDetails.address.line2;
      }
      if (shippingDetails.address.city) {
        orderUpdates.deliverycity = shippingDetails.address.city;
      }
    }

    await (supabase as any)
      .from('orders')
      .update(orderUpdates)
      .eq('orderid', orderId);

    // Also update customer info if available from Apple Pay / Stripe
    if (shippingDetails?.name || customerDetails?.email) {
      const { data: currentOrd } = await (supabase as any)
        .from('orders')
        .select('customerid')
        .eq('orderid', orderId)
        .single();

      if (currentOrd?.customerid) {
        const custUpdates: any = { updatedat: new Date().toISOString() };
        if (shippingDetails?.name) {
          const parts = shippingDetails.name.trim().split(/\s+/);
          custUpdates.firstname = parts[0] || 'Valued';
          custUpdates.lastname = parts.slice(1).join(' ') || 'Customer';
        }
        if (customerDetails?.email) {
          custUpdates.email = customerDetails.email;
        }
        if (customerDetails?.phone) {
          custUpdates.telephone = customerDetails.phone;
        }
        await (supabase as any)
          .from('customers')
          .update(custUpdates)
          .eq('customerid', currentOrd.customerid);
      }
    }

    // Send emails only if wasn't already marked paid (prevents duplicate emails)
    if (!wasAlreadyPaid) {
      try {
        const { data: fullOrder } = await (supabase as any)
          .from('orders')
          .select('*, customers(*), order_items(*, product_variants(*, products(*)), products(*))')
          .eq('orderid', orderId)
          .single();

        if (fullOrder) {
          const emailItems = await buildOrderEmailItems(
            supabase,
            fullOrder.order_items || []
          );
          const orderDetails = {
            orderId: fullOrder.orderid,
            customer: {
              firstName: fullOrder.customers?.firstname || '',
              lastName: fullOrder.customers?.lastname || '',
              email: fullOrder.customers?.email || undefined,
              telephone: fullOrder.customers?.telephone || '',
              country: fullOrder.customers?.country || 'United Kingdom',
              city: fullOrder.customers?.city || '',
            },
            delivery: {
              type: fullOrder.deliverytype || 'address',
              notes: fullOrder.deliverynotes || '',
              street: fullOrder.deliverystreet || '',
              streetNumber: fullOrder.deliverystreetnumber || '',
              entrance: fullOrder.deliveryentrance || '',
              floor: fullOrder.deliveryfloor || '',
              apartment: fullOrder.deliveryapartment || '',
            },
            items: emailItems,
            totals: {
              subtotal: fullOrder.subtotal || 0,
              delivery: fullOrder.deliverycost || 0,
              total: fullOrder.total || 0,
            },
            orderDate: fullOrder.createdat || new Date().toISOString(),
          };

          await Promise.allSettled([
            sendCustomerOrderEmail(orderDetails, 'en'),
            sendAdminOrderEmail(orderDetails, 'en'),
          ]);
        }
      } catch (emailErr) {
        logger.error('[Stripe Verify] Error sending emails', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      paymentStatus: 'paid',
      paymentMethod: detectedMethod,
    });
  } catch (error: any) {
    logger.error('[Stripe Verify] Error verifying session', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}
