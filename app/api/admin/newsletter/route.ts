export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const status = searchParams.get('status')?.trim().toLowerCase() || 'all';

    let query = supabaseAdmin
      .from('newsletter_subscribers')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.ilike('email', `%${search}%`);
    }

    const { data: subscribers, error } = await query;

    if (error) {
      logger.error('Error fetching newsletter subscribers', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch subscribers' },
        { status: 500 }
      );
    }

    // Also get all subscribers to calculate aggregate statistics
    const { data: allSubscribers, error: statsError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .select('id, status, source');

    if (statsError) {
      logger.error('Error calculating subscriber stats', statsError);
    }

    const all = allSubscribers || [];
    const stats = {
      total: all.length,
      active: all.filter((s) => s.status === 'active').length,
      unsubscribed: all.filter((s) => s.status === 'unsubscribed').length,
      footerSource: all.filter((s) => (s.source || '').toLowerCase() === 'footer').length,
      checkoutSource: all.filter((s) => (s.source || '').toLowerCase() === 'checkout').length,
    };

    return NextResponse.json({
      success: true,
      subscribers: subscribers || [],
      stats,
    });
  } catch (error) {
    logger.error('Unexpected error in admin newsletter GET', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status || !['active', 'unsubscribed'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Valid id and status ("active" or "unsubscribed") required' },
        { status: 400 }
      );
    }

    const { data: updated, error } = await supabaseAdmin
      .from('newsletter_subscribers')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating newsletter subscriber', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update subscriber' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscriber: updated,
    });
  } catch (error) {
    logger.error('Unexpected error in admin newsletter PATCH', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id');

    let id = queryId;
    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch {
        // No body
      }
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Subscriber ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('newsletter_subscribers')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting newsletter subscriber', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete subscriber' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscriber successfully removed',
    });
  } catch (error) {
    logger.error('Unexpected error in admin newsletter DELETE', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
