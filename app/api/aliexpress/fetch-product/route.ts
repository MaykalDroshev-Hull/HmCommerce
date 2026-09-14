import { NextRequest, NextResponse } from 'next/server';
import { fetchAliExpressProduct } from '@/lib/aliexpress/client';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urlOrId } = body;

    if (!urlOrId || typeof urlOrId !== 'string' || !urlOrId.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid AliExpress Product URL or Product ID' },
        { status: 400 }
      );
    }

    const product = await fetchAliExpressProduct(urlOrId.trim());

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not find product on AliExpress. Please check the URL/ID or try again.'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product
    });
  } catch (error: any) {
    logger.error('Error fetching AliExpress product:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch product from AliExpress'
      },
      { status: 400 }
    );
  }
}
