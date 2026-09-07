export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { deleteOrderByOrderId } from '@/lib/admin-delete-order';
import { logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/api-error';


const CONFIRM_PHRASE = 'DELETE_ALL_ORDERS';

/**
 * Deletes every order (and items, related rows). Requires exact confirm phrase in JSON body.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.confirm !== CONFIRM_PHRASE) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid confirmation. Send JSON: { "confirm": "${CONFIRM_PHRASE}" }`,
        },
        { status: 400 }
      );
    }

    const { data: rows, error: listError } = await supabaseAdmin.from('orders').select('orderid');

    if (listError) {
      return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error: listError });
    }

    const ids = (rows || []).map((r: { orderid: string }) => r.orderid).filter(Boolean);
    let deleted = 0;
    const errors: string[] = [];

    for (const orderId of ids) {
      const res = await deleteOrderByOrderId(orderId);
      if (res.ok) deleted += 1;
      else errors.push(`${orderId}: ${res.error || 'unknown'}`);
    }

    return NextResponse.json({
      success: errors.length === 0,
      deleted,
      attempted: ids.length,
      errors: errors.length ? errors.slice(0, 20) : undefined,
    });
  } catch (e) {
    logger.error('clear-all orders:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
