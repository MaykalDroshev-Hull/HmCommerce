export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/api-error';


const TABLE_KEY = 'order_tracking';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('admin_order_tracking_views')
      .select('*')
      .eq('user_id', userId)
      .eq('table_key', TABLE_KEY)
      .order('updated_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, views: [] });
      }
      logger.error('order-tracking-views GET:', error);
      return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error: error });
    }

    return NextResponse.json({ success: true, views: data || [] });
  } catch (e) {
    logger.error('API error', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, visible_columns, filters, sorting, is_default } = body as {
      userId?: string;
      name?: string;
      visible_columns?: unknown;
      filters?: unknown;
      sorting?: unknown;
      is_default?: boolean;
    };

    if (!userId || !name) {
      return NextResponse.json({ success: false, error: 'userId and name are required' }, { status: 400 });
    }

    const nameTrim = name.trim();
    const { data: existing, error: findErr } = await supabaseAdmin
      .from('admin_order_tracking_views')
      .select('id')
      .eq('user_id', userId)
      .eq('name', nameTrim)
      .eq('table_key', TABLE_KEY)
      .maybeSingle();

    if (findErr && findErr.code !== 'PGRST116' && findErr.code !== '42P01') {
      logger.error('order-tracking-views POST find:', findErr);
      return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error: findErr });
    }

    const now = new Date().toISOString();
    const payload = {
      user_id: userId,
      name: nameTrim,
      table_key: TABLE_KEY,
      visible_columns: visible_columns ?? [],
      filters: filters ?? null,
      sorting: sorting ?? null,
      is_default: !!is_default,
      updated_at: now,
    };

    let data: Record<string, unknown> | null = null;
    let error = null as { code?: string; message?: string } | null;

    if (existing?.id) {
      const res = await supabaseAdmin
        .from('admin_order_tracking_views')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      data = res.data as Record<string, unknown> | null;
      error = res.error;
    } else {
      const res = await supabaseAdmin
        .from('admin_order_tracking_views')
        .insert({ ...payload, created_at: now })
        .select()
        .single();
      data = res.data as Record<string, unknown> | null;
      error = res.error;
    }

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          {
            success: false,
            error:
              'Tracking views table is missing. Run migration-admin-inventory-order-workflow.sql in Supabase.',
          },
          { status: 503 }
        );
      }
      logger.error('order-tracking-views POST:', error);
      return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error: error });
    }

    return NextResponse.json({ success: true, view: data });
  } catch (e) {
    logger.error('API error', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    const userId = request.nextUrl.searchParams.get('userId');
    if (!id || !userId) {
      return NextResponse.json({ success: false, error: 'id and userId required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('admin_order_tracking_views')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error: error });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    logger.error('API error', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
