export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawEmail = body.email;
    const source = (body.source || 'footer').trim().toLowerCase();

    if (!rawEmail || typeof rawEmail !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const email = rawEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // Check if subscriber already exists
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) {
      logger.error('Error querying newsletter_subscribers', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to process subscription. Please try again.' },
        { status: 500 }
      );
    }

    const DISCOUNT_CODE = 'WELCOME10';

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json({
          success: true,
          message: "You're already subscribed! Use code WELCOME10 for 10% off.",
          code: DISCOUNT_CODE,
          alreadySubscribed: true,
        });
      }

      // Reactivate subscription if previously unsubscribed
      const { error: updateError } = await supabaseAdmin
        .from('newsletter_subscribers')
        .update({
          status: 'active',
          source: source || existing.source,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        logger.error('Error reactivating newsletter subscription', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to reactivate subscription.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Welcome back! Your subscription is now active.',
        code: DISCOUNT_CODE,
      });
    }

    // Insert new subscriber
    const { error: insertError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .insert({
        email,
        source: source || 'footer',
        status: 'active',
        discount_code_sent: DISCOUNT_CODE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      logger.error('Error creating newsletter subscription', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to subscribe. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for joining our community! Enjoy 10% off your order.',
      code: DISCOUNT_CODE,
    });
  } catch (error) {
    logger.error('Unexpected newsletter subscription error', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
