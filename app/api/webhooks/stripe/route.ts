export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { sendCustomerOrderEmail, sendAdminOrderEmail } from '@/lib/email';
import { buildOrderEmailItems } from '@/lib/order-email-items';

export async function POST(request: NextRequest) {
  if (!stripe) {
    logger.warn('[Stripe Webhook] Stripe instance not initialized');
    return NextResponse.json({ error: 'Stripe not initialized' }, { status: 500 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');

  if (!webhookSecret || !signature) {
    logger.warn('[Stripe Webhook] Missing STRIPE_WEBHOOK_SECRET or stripe-signature header');
    return NextResponse.json({ error: 'Missing webhook configuration' }, { status: 400 });
  }

  let event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    logger.error('[Stripe Webhook] Signature verification failed', err);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle Checkout Session completion (e.g. Klarna, Card, Apple Pay)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const orderId = session.metadata?.orderId || session.client_reference_id;

    if (orderId) {
      try {
        const supabase = supabaseAdmin;

        // Mark the order as paid in the database
        await (supabase as any)
          .from('orders')
          .update({
            status: 'paid',
            paymentmethod: session.metadata?.paymentMethod || 'klarna',
            paymentid: session.payment_intent || session.id,
            updatedat: new Date().toISOString(),
          })
          .eq('orderid', orderId);

        logger.info(`[Stripe Webhook] Order ${orderId} marked as paid via Klarna/Stripe`);

        // Fetch full order to trigger customer and admin email notifications
        const { data: order } = await (supabase as any)
          .from('orders')
          .select('*, customers(*), order_items(*, product_variants(*, products(*)), products(*))')
          .eq('orderid', orderId)
          .single();

        if (order) {
          const emailItems = await buildOrderEmailItems(
            supabase,
            order.order_items || []
          );
          const orderDetails = {
            orderId: order.orderid,
            customer: {
              firstName: order.customers?.firstname || '',
              lastName: order.customers?.lastname || '',
              email: order.customers?.email || undefined,
              telephone: order.customers?.telephone || '',
              country: order.customers?.country || 'United Kingdom',
              city: order.customers?.city || '',
            },
            delivery: {
              type: order.deliverytype || 'address',
              notes: order.deliverynotes || '',
              street: order.deliverystreet || '',
              streetNumber: order.deliverystreetnumber || '',
              entrance: order.deliveryentrance || '',
              floor: order.deliveryfloor || '',
              apartment: order.deliveryapartment || '',
            },
            items: emailItems,
            totals: {
              subtotal: order.subtotal || 0,
              delivery: order.deliverycost || 0,
              total: order.total || 0,
            },
            orderDate: order.createdat || new Date().toISOString(),
          };

          await Promise.allSettled([
            sendCustomerOrderEmail(orderDetails, 'en'),
            sendAdminOrderEmail(orderDetails, 'en'),
          ]);
        }
      } catch (dbError) {
        logger.error(`[Stripe Webhook] Error updating order ${orderId}`, dbError);
      }
    }
  }

  return NextResponse.json({ received: true });
}
