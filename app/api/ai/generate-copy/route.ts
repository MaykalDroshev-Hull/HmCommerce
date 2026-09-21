import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiPetCopy, rewritePetReview } from '@/lib/gemini/copywriter';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      rawDescription,
      category,
      specifications,
      target = 'both',
      reviewText,
      petName,
      productName,
      rating
    } = body;

    // Review Re-writing Handler
    if (target === 'review') {
      if (!reviewText || typeof reviewText !== 'string' || !reviewText.trim()) {
        return NextResponse.json(
          { success: false, error: 'Review text is required to re-write' },
          { status: 400 }
        );
      }

      const result = await rewritePetReview({
        reviewText: reviewText.trim(),
        productName: productName || title,
        petName,
        rating: Number(rating) || 5
      });

      return NextResponse.json({
        success: true,
        reviewText: result.reviewText,
        isAi: result.isAi,
        modelUsed: result.modelUsed
      });
    }

    // Product Title & Description Copywriting
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Product title is required' },
        { status: 400 }
      );
    }

    const result = await generateGeminiPetCopy({
      title: title.trim(),
      rawDescription,
      category,
      specifications,
      target
    });

    return NextResponse.json({
      success: true,
      title: result.title,
      description: result.description,
      isAi: result.isAi,
      modelUsed: result.modelUsed
    });
  } catch (error: any) {
    logger.error('Error in AI generate-copy API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate copy' },
      { status: 500 }
    );
  }
}
