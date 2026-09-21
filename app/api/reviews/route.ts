import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/api-error';

// GET: Fetch reviews for the homepage ("Verified Pet Parent Feedback")
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const homeOnly = searchParams.get('homeOnly') !== 'false';

    let query = supabaseAdmin
      .from('product_reviews')
      .select(`
        *,
        product:products!inner(
          productid,
          name,
          sku,
          isdisabled,
          isdeleted
        )
      `)
      .eq('is_active', true)
      .eq('product.isdisabled', false)
      .eq('product.isdeleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (homeOnly) {
      query = query.eq('show_on_home', true);
    }

    const { data: reviews, error } = await query;

    if (error) {
      logger.error('Error fetching homepage reviews:', error);
      return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
    }

    // Filter out reviews for deleted or disabled (retired) products
    const formattedReviews = (reviews || []).filter(
      (r: any) =>
        r.product &&
        r.product.isdisabled !== true &&
        r.product.isdeleted !== true
    );

    return NextResponse.json({
      success: true,
      reviews: formattedReviews
    });
  } catch (error) {
    logger.error('Failed to fetch reviews for homepage:', error);
    return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
  }
}
