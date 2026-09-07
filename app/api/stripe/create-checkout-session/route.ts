import { NextRequest, NextResponse } from 'next/server';
import { createKlarnaCheckoutSession, stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Stripe is not configured. Please add STRIPE_SECRET_KEY to your .env.local file.',
          isConfigError: true,
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { orderId, customer, delivery, items, totals, discount } = body;

    if (!orderId || !customer || !items || !totals) {
      return NextResponse.json(
        { success: false, error: 'Missing required order details' },
        { status: 400 }
      );
    }

    const originUrl = request.headers.get('origin') || undefined;

    const session = await createKlarnaCheckoutSession({
      orderId,
      customer,
      delivery,
      items,
      deliveryCost: totals.delivery || 0,
      discountAmount: discount?.amount || 0,
      total: totals.total,
      originUrl,
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('[Stripe] Error creating Klarna checkout session:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to initialize Klarna checkout session',
      },
      { status: 500 }
    );
  }
}
