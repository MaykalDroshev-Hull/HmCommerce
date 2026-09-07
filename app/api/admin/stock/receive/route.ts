export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adjustVariantQuantityByDelta } from '@/lib/admin-order-stock';
import { logger } from '@/lib/logger';


/**
 * Register incoming stock  for an existing variant.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productVariantId, quantity, note } = body as {
      productVariantId?: string;
      quantity?: number;
      note?: string;
    };

    if (!productVariantId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid data: variant and a positive quantity are required.' },
        { status: 400 }
      );
    }

    const res = await adjustVariantQuantityByDelta({
      productvariantid: productVariantId,
      delta: quantity,
      movement_type: 'stock_in',
      note: note?.trim() || null,
      allowNegative: true,
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: res.error || 'Error registering incoming stock' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, newQuantity: res.newQuantity });
  } catch (e) {
    logger.error('stock receive:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
