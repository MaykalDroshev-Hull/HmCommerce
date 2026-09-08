export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { enrichSuperPromoItems } from '@/lib/super-promo';
import { apiErrorResponse } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const variantId = new URL(request.url).searchParams.get('variantId');

    if (variantId) {
      const { data, error } = await supabaseAdmin
        .from('super_promo_items')
        .select('*')
        .eq('productvariantid', variantId)
        .eq('isactive', true)
        .single();

      if (error || !data) {
        return NextResponse.json({ success: true, item: null });
      }

      const [item] = await enrichSuperPromoItems(supabaseAdmin, [data]);
      return NextResponse.json({ success: true, item: item || null });
    }

    const { data, error } = await supabaseAdmin
      .from('super_promo_items')
      .select('*')
      .eq('isactive', true)
      .order('sortorder', { ascending: true })
      .order('createdat', { ascending: false });

    if (error) {
      return NextResponse.json({
        success: true,
        items: [],
      });
    }

    const items = await enrichSuperPromoItems(supabaseAdmin, data || []);

    return NextResponse.json({
      success: true,
      items,
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      items: [],
    });
  }
}
