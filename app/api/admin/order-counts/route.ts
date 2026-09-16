export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = supabaseAdmin;

    // Fetch all pending orders to calculate counts
    const { data: pendingOrders, error } = await supabase
      .from('orders')
      .select(`
        orderid,
        status,
        aliexpress_order_id,
        order_items(
          product:productid(
            aliexpress_product_id
          )
        )
      `)
      .eq('status', 'pending');

    if (error) {
      logger.error('Error fetching pending orders for counts:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    let unfulfilledNewOrders = 0;
    let unfulfilledDropshipping = 0;

    if (pendingOrders) {
      unfulfilledNewOrders = pendingOrders.length;

      unfulfilledDropshipping = pendingOrders.filter((order) => {
        // Must not be fulfilled on AliExpress yet
        if (order.aliexpress_order_id) return false;

        // Must have at least one dropship product
        const hasDropshipItem = order.order_items?.some(
          (item: any) => item.product?.aliexpress_product_id
        );

        return hasDropshipItem;
      }).length;
    }

    return NextResponse.json({
      success: true,
      counts: {
        newOrders: unfulfilledNewOrders,
        dropshipping: unfulfilledDropshipping,
      }
    });

  } catch (error: any) {
    logger.error('Error in order-counts GET:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
