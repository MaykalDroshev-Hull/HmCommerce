import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createDropshipOrder, queryOrderTracking } from '@/lib/aliexpress/client';
import { getStoredAliExpressToken } from '@/lib/aliexpress/auth';
import { logger } from '@/lib/logger';

// GET - List orders with dropship-eligible products
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          product:productid(
            productid,
            name,
            aliexpress_product_id,
            aliexpress_product_url
          ),
          variant:productvariantid(
            productvariantid,
            sku,
            price,
            aliexpress_sku_id
          )
        )
      `)
      .order('createdat', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('Error fetching dropship orders:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orders: orders || []
    });
  } catch (error: any) {
    logger.error('Error in dropship orders GET:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Fulfill order or sync tracking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, orderId, aliexpressOrderId, trackingNumber } = body;
    const supabase = createServerClient();

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 });
    }

    // 1. Manual update action
    if (action === 'manual_update') {
      const updateData: Record<string, any> = {};
      if (aliexpressOrderId !== undefined) updateData.aliexpress_order_id = aliexpressOrderId;
      if (trackingNumber !== undefined) updateData.aliexpress_tracking_number = trackingNumber;
      if (body.status !== undefined) updateData.aliexpress_status = body.status;

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('orderid', orderId);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Order fulfillment status updated' });
    }

    // 2. Sync tracking action
    if (action === 'sync_tracking') {
      const token = await getStoredAliExpressToken();
      if (!token) {
        return NextResponse.json(
          { success: false, error: 'AliExpress account is not connected. Connect account in Settings.' },
          { status: 400 }
        );
      }

      const { data: order } = await supabase
        .from('orders')
        .select('aliexpress_order_id')
        .eq('orderid', orderId)
        .single();

      if (!order?.aliexpress_order_id) {
        return NextResponse.json({ success: false, error: 'Order has no AliExpress Order ID' }, { status: 400 });
      }

      const tracking = await queryOrderTracking(order.aliexpress_order_id, token);
      if (tracking.trackingNumber) {
        await supabase
          .from('orders')
          .update({
            aliexpress_tracking_number: tracking.trackingNumber,
            aliexpress_status: tracking.status || 'shipped'
          })
          .eq('orderid', orderId);

        return NextResponse.json({
          success: true,
          trackingNumber: tracking.trackingNumber,
          carrier: tracking.carrier,
          status: tracking.status
        });
      }

      return NextResponse.json({
        success: true,
        message: 'No new tracking information available yet'
      });
    }

    // 3. Fulfill order on AliExpress action
    if (action === 'fulfill') {
      const token = await getStoredAliExpressToken();
      if (!token) {
        return NextResponse.json(
          { success: false, error: 'AliExpress account is not connected. Please connect in Settings tab.' },
          { status: 400 }
        );
      }

      // Fetch order details
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            product:productid(aliexpress_product_id),
            variant:productvariantid(aliexpress_sku_id)
          )
        `)
        .eq('orderid', orderId)
        .single();

      if (orderErr || !order) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }

      const dropshipItem = order.order_items?.find(
        (item: any) => item.product?.aliexpress_product_id
      );

      if (!dropshipItem) {
        return NextResponse.json(
          { success: false, error: 'No AliExpress dropship items found in this order' },
          { status: 400 }
        );
      }

      const fulfillmentResult = await createDropshipOrder(
        {
          orderId: order.orderid,
          aliexpressProductId: dropshipItem.product.aliexpress_product_id,
          items: order.order_items
            .filter((item: any) => item.product?.aliexpress_product_id)
            .map((item: any) => ({
              aliexpressSkuId: item.variant?.aliexpress_sku_id || '',
              quantity: item.quantity,
              price: item.price
            })),
          shippingAddress: {
            fullName: `${order.customer_order_note || 'Customer'}`,
            addressLine1: order.deliverystreet || 'High Street',
            addressLine2: order.deliveryapartment || '',
            city: order.delivery_region || 'London',
            postcode: order.econtoffice || 'SW1A 1AA',
            country: 'GB'
          }
        },
        token
      );

      if (fulfillmentResult.success && fulfillmentResult.aliexpressOrderId) {
        await supabase
          .from('orders')
          .update({
            aliexpress_order_id: fulfillmentResult.aliexpressOrderId,
            aliexpress_status: 'placed'
          })
          .eq('orderid', orderId);

        return NextResponse.json({
          success: true,
          aliexpressOrderId: fulfillmentResult.aliexpressOrderId,
          message: 'Order placed successfully on AliExpress'
        });
      }

      return NextResponse.json(
        { success: false, error: fulfillmentResult.error || 'Failed to place order on AliExpress' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    logger.error('Error handling dropship order action:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
