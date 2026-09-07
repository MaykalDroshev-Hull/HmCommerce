export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createPaypalOrder, type PaypalItem } from '@/lib/paypal';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Single Product Express Checkout flow
    if (body.type === 'product') {
      const { variantId, productId, quantity = 1, price, title = 'MB-Paws Product', colour, size } = body;

      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        return NextResponse.json({ error: 'Invalid product price' }, { status: 400 });
      }

      const numQuantity = Math.max(1, Number(quantity) || 1);
      const subtotal = numPrice * numQuantity;

      // UK Standard delivery: Free over £50, else £3.99
      const shipping = subtotal >= 50 ? 0.0 : 3.99;
      const total = subtotal + shipping;

      const itemName = [title, colour, size].filter(Boolean).join(' - ');
      const items: PaypalItem[] = [
        {
          name: itemName,
          quantity: numQuantity,
          unitPrice: numPrice,
          sku: variantId || productId || undefined,
        },
      ];

      const paypalOrder = await createPaypalOrder({
        subtotal,
        shipping,
        total,
        currency: 'GBP',
        items,
        shippingPreference: 'GET_FROM_FILE',
      });

      return NextResponse.json({ id: paypalOrder.id });
    }

    // 2. Full Checkout Page Flow
    const { items, totals, discount, providedShippingAddress } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    const subtotal = Number(totals?.subtotal) || 0;
    const shipping = Number(totals?.delivery) || 0;
    const discountAmount = Number(totals?.discount || discount?.amount) || 0;
    const total = Number(totals?.total) || subtotal + shipping - discountAmount;

    if (total <= 0) {
      return NextResponse.json({ error: 'Invalid order total' }, { status: 400 });
    }

    const paypalItems: PaypalItem[] = items.map((item: any) => ({
      name: (item.name || `${item.brand || ''} ${item.model || ''}`).trim() || 'Product',
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.price) || 0,
      sku: String(item.id || ''),
    }));

    const paypalOrder = await createPaypalOrder({
      subtotal,
      shipping,
      discount: discountAmount,
      total,
      currency: 'GBP',
      items: paypalItems,
      shippingPreference: 'GET_FROM_FILE',
      providedShippingAddress,
    });

    return NextResponse.json({ id: paypalOrder.id });
  } catch (error: any) {
    logger.error('Failed to create PayPal order in route', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create PayPal order' },
      { status: 500 }
    );
  }
}
