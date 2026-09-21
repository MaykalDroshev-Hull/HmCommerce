import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/api-error';

// GET: Fetch reviews for a specific product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('all') === 'true';

    let query = supabaseAdmin
      .from('product_reviews')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false });

    if (!includeInactive) {
      // Exclude reviews if the product is retired (disabled) or soft-deleted
      const { data: prod } = await supabaseAdmin
        .from('products')
        .select('isdisabled, isdeleted')
        .eq('productid', id)
        .single();

      if (!prod || prod.isdisabled || prod.isdeleted) {
        return NextResponse.json({
          success: true,
          reviews: []
        });
      }

      query = query.eq('is_active', true);
    }

    const { data: reviews, error } = await query;

    if (error) {
      logger.error('Error fetching product reviews:', error);
      return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
    }

    return NextResponse.json({
      success: true,
      reviews: reviews || []
    });
  } catch (error) {
    logger.error('Failed to fetch product reviews:', error);
    return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
  }
}

// POST: Add a new review to this product
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      author_name,
      review_text,
      rating = 5,
      image_url,
      pet_name,
      is_verified = true,
      is_active = true,
      show_on_home = true
    } = body;

    if (!author_name || !author_name.trim()) {
      return NextResponse.json(
        { error: 'Author name is required' },
        { status: 400 }
      );
    }

    if (!review_text || !review_text.trim()) {
      return NextResponse.json(
        { error: 'Review text is required' },
        { status: 400 }
      );
    }

    const ratingNum = Math.min(5, Math.max(1, Number(rating) || 5));

    const { data, error } = await supabaseAdmin
      .from('product_reviews')
      .insert({
        product_id: id,
        author_name: author_name.trim(),
        rating: ratingNum,
        review_text: review_text.trim(),
        image_url: image_url?.trim() || null,
        pet_name: pet_name?.trim() || null,
        is_verified: is_verified !== false,
        is_active: is_active !== false,
        show_on_home: show_on_home !== false,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating product review:', error);
      return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
    }

    return NextResponse.json({
      success: true,
      review: data
    });
  } catch (error) {
    logger.error('Failed to create product review:', error);
    return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
  }
}

// PUT: Update an existing review for this product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { review_id, ...updates } = body;

    if (!review_id) {
      return NextResponse.json(
        { error: 'review_id is required' },
        { status: 400 }
      );
    }

    const payload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (updates.author_name !== undefined) payload.author_name = updates.author_name.trim();
    if (updates.review_text !== undefined) payload.review_text = updates.review_text.trim();
    if (updates.rating !== undefined) payload.rating = Math.min(5, Math.max(1, Number(updates.rating) || 5));
    if (updates.image_url !== undefined) payload.image_url = updates.image_url?.trim() || null;
    if (updates.pet_name !== undefined) payload.pet_name = updates.pet_name?.trim() || null;
    if (updates.is_verified !== undefined) payload.is_verified = Boolean(updates.is_verified);
    if (updates.is_active !== undefined) payload.is_active = Boolean(updates.is_active);
    if (updates.show_on_home !== undefined) payload.show_on_home = Boolean(updates.show_on_home);

    const { data, error } = await supabaseAdmin
      .from('product_reviews')
      .update(payload)
      .eq('review_id', review_id)
      .eq('product_id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating product review:', error);
      return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
    }

    return NextResponse.json({
      success: true,
      review: data
    });
  } catch (error) {
    logger.error('Failed to update product review:', error);
    return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
  }
}

// DELETE: Delete a review by review_id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('review_id');

    if (!reviewId) {
      return NextResponse.json(
        { error: 'review_id query parameter is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('product_reviews')
      .delete()
      .eq('review_id', reviewId)
      .eq('product_id', id);

    if (error) {
      logger.error('Error deleting product review:', error);
      return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
    }

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete product review:', error);
    return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
  }
}
