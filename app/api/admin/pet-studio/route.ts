import { NextRequest, NextResponse } from 'next/server';
import { getGeminiApiKey } from '@/lib/gemini/copywriter';
import { uploadGeneratedImageToStorage } from '@/lib/gemini/image-studio';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Pet Fashion Studio API — generates AI images of pets wearing selected products.
 * Supports single-pet and 50/50 "Who Wears It Better" dual-pet mode.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mode,
      petImages,
      productImageUrl,
      productName,
      productImageUrlB,
      productNameB,
      customInstructions,
      aspectRatio,
      versusLayout
    } = body as {
      mode: 'single' | 'versus' | 'dual_costume';
      petImages: string[];  // base64 data URIs or URLs
      productImageUrl: string;
      productName: string;
      productImageUrlB?: string;
      productNameB?: string;
      customInstructions?: string;
      aspectRatio?: string;
      versusLayout?: 'horizontal' | 'vertical';
    };

    const ratio = aspectRatio?.trim() || '9:16';
    const layout = versusLayout || 'vertical';

    if (!petImages || petImages.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one pet photo is required.' }, { status: 400 });
    }
    if ((mode === 'versus' || mode === 'dual_costume') && petImages.length < 2) {
      return NextResponse.json({ success: false, error: 'Two pet photos are required for comparison mode.' }, { status: 400 });
    }
    if (!productImageUrl) {
      return NextResponse.json({ success: false, error: 'A product image is required.' }, { status: 400 });
    }
    if (mode === 'dual_costume' && !productImageUrlB) {
      return NextResponse.json({ success: false, error: 'A second product image (Product B) is required for Dual Costume mode.' }, { status: 400 });
    }

    const apiKey = (await getGeminiApiKey()) || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key is not configured. Please add it in Settings & API or .env.local' },
        { status: 400 }
      );
    }

    // Build the multimodal parts array
    const parts: any[] = [];

    if (mode === 'dual_costume') {
      // 50/50 split — two pets, TWO DIFFERENT products (for final Call To Action slide)
      const prodA = productName || 'First Pet Outfit';
      const prodB = productNameB || productName || 'Second Pet Outfit';

      parts.push({
        text: `You are an elite commercial pet photographer for the premium British pet brand "Meow Bark".

TASK: Create a stunning high-converting final Call-To-Action comparison image for social media (TikTok / Instagram).
Both pets are modelling DIFFERENT products from the Meow Bark collection to showcase product variety!

I am providing you with:
1. Photo of PET A (first pet photo)
2. Photo of PET B (second pet photo)
3. Photo of PRODUCT A: "${prodA}"
4. Photo of PRODUCT B: "${prodB}"

REQUIREMENTS:
${layout === 'vertical' ? `- Create a single image split 50/50 LEFT and RIGHT with a clean vertical divider line down the middle.
- LEFT SIDE: Pet A wearing/modelling PRODUCT A: "${prodA}". Faithfully preserve all colours, pattern, fabric texture, and design details of Product A.
- RIGHT SIDE: Pet B wearing/modelling PRODUCT B: "${prodB}". Faithfully preserve all colours, pattern, fabric texture, and design details of Product B.` : `- Create a single image split 50/50 TOP and BOTTOM with a clean horizontal divider line across the middle.
- TOP HALF: Pet A wearing/modelling PRODUCT A: "${prodA}". Faithfully preserve all colours, pattern, fabric texture, and design details of Product A.
- BOTTOM HALF: Pet B wearing/modelling PRODUCT B: "${prodB}". Faithfully preserve all colours, pattern, fabric texture, and design details of Product B.`}
- Both pets should look joyful, confident, stylish, and happy modelling their respective outfits.
- Use a cohesive, clean, bright, professional luxury studio background on both sides (seamless white or soft neutral).
- Clean split layout. Keep the background clean. Do NOT add hardcoded watermarks, distorted text, or garbled letters, as clean call-to-action typography and branding overlays will be applied in post-production.
- Commercial 3-point lighting, Hasselblad-sharp focus, high resolution.
- Both pets should be roughly the same scale in the frame.
- KEEP the pet breeds/species faithful to the uploaded photos. Do NOT change the type of animal.
${customInstructions ? `\nADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}

IMAGE DIMENSIONS: The output image MUST be in ${ratio} aspect ratio.

Output a single finished image ready for the final TikTok call-to-action slide.`
      });
    } else if (mode === 'versus') {
      // 50/50 split — two pets, one product
      parts.push({
        text: `You are an elite commercial pet photographer for the premium British pet brand "Meow Bark".

TASK: Create a stunning "Who Wears It Better?" side-by-side comparison image for social media (TikTok / Instagram).

I am providing you with:
1. Photo of PET A (first pet photo)
2. Photo of PET B (second pet photo)
3. Photo of the product: "${productName}"

REQUIREMENTS:
${layout === 'vertical' ? `- Create a single image split 50/50 LEFT and RIGHT with a clean vertical divider line down the middle.
- LEFT SIDE: Pet A wearing/modelling the product "${productName}". The pet should look adorable, confident, and stylish.
- RIGHT SIDE: Pet B wearing/modelling the product "${productName}". The pet should also look adorable and stylish but in a slightly different pose.` : `- Create a single image split 50/50 TOP and BOTTOM with a clean horizontal divider line across the middle.
- TOP HALF: Pet A wearing/modelling the product "${productName}". The pet should look adorable, confident, and stylish.
- BOTTOM HALF: Pet B wearing/modelling the product "${productName}". The pet should also look adorable and stylish but in a slightly different pose.`}
- BOTH pets must be wearing the EXACT same product shown in the product image. Maintain the exact design, colour, pattern, and details of the product.
- Use the same clean, bright, professional studio background on both sides (seamless white or soft neutral).
- Clean split layout. Keep the background clean. Do NOT add hardcoded watermarks, distorted text, or garbled letters, as clean typography and branding overlays will be applied in post-production.
- Make it look like a high-quality social media post — vibrant, eye-catching, scroll-stopping.
- Professional commercial lighting, sharp focus, high resolution.
- Both pets should be roughly the same scale in the frame.
- KEEP the pet breeds/species faithful to the uploaded photos. Do NOT change the type of animal.
${customInstructions ? `\nADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}

IMAGE DIMENSIONS: The output image MUST be in ${ratio} aspect ratio.

Output a single finished image ready for TikTok posting.`
      });
    } else {
      // Single pet mode
      parts.push({
        text: `You are an elite commercial pet photographer for the premium British pet brand "Meow Bark".

TASK: Create a stunning, high-end commercial photograph of the pet wearing/modelling the product.

I am providing you with:
1. A photo of the pet
2. A photo of the product: "${productName}"

REQUIREMENTS:
- Dress the pet in the exact product shown in the product image. Maintain the exact design, colour, pattern, fabric texture, and all details of the product faithfully.
- KEEP the pet breed/species faithful to the uploaded photo. Do NOT change the type of animal.
- The pet should look adorable, happy, confident, and stylish wearing the product.
- Clean luxury commercial editorial studio photography setting.
- Seamless white or soft neutral studio background with soft contact shadows.
- Professional 3-point commercial lighting, Hasselblad-quality sharpness, 85mm portrait lens aesthetic.
- The image should be ready for e-commerce or social media use.
- ABSOLUTELY NO watermarks, text, logos, or typography of any kind.
${customInstructions ? `\nADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}

IMAGE DIMENSIONS: The output image MUST be in ${ratio} aspect ratio.

Output a single finished photograph.`
      });
    }

    // Attach pet images
    for (const petImage of petImages) {
      const imgData = await resolveImageToBase64(petImage);
      if (imgData) {
        parts.push({
          inline_data: {
            mime_type: imgData.mimeType,
            data: imgData.base64
          }
        });
      }
    }

    // Attach product image A
    const productImgData = await resolveImageToBase64(productImageUrl);
    if (productImgData) {
      parts.push({
        inline_data: {
          mime_type: productImgData.mimeType,
          data: productImgData.base64
        }
      });
    }

    // Attach product image B (if dual_costume mode)
    if (mode === 'dual_costume' && productImageUrlB) {
      const productImgDataB = await resolveImageToBase64(productImageUrlB);
      if (productImgDataB) {
        parts.push({
          inline_data: {
            mime_type: productImgDataB.mimeType,
            data: productImgDataB.base64
          }
        });
      }
    }

    // Try multiple Gemini models with image generation
    const models = ['gemini-2.0-flash-exp', 'gemini-3.1-flash-image', 'gemini-2.5-flash-image', 'gemini-3-pro-image'];

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                responseModalities: ['IMAGE', 'TEXT']
              }
            })
          }
        );

        const result = await response.json();

        if (!response.ok) {
          const errorMsg = result?.error?.message || response.statusText;
          const isQuotaOrBilling =
            response.status === 429 ||
            response.status === 403 ||
            errorMsg.includes('quota') ||
            errorMsg.includes('RESOURCE_EXHAUSTED') ||
            errorMsg.includes('billing');

          if (isQuotaOrBilling) {
            return NextResponse.json({
              success: false,
              error: `API quota/billing issue: ${errorMsg}`,
              requiresBilling: true
            });
          }
          logger.warn(`Pet Studio: model ${model} returned ${response.status}: ${errorMsg}`);
          continue;
        }

        // Extract generated image from response
        const resParts = result?.candidates?.[0]?.content?.parts || [];
        for (const part of resParts) {
          const imgObj = part.inlineData || part.inline_data;
          if (imgObj && imgObj.data) {
            const mimeType = imgObj.mimeType || imgObj.mime_type || 'image/jpeg';
            const dataUri = `data:${mimeType};base64,${imgObj.data}`;

            // Upload to Supabase Storage for persistence, fallback to data URI if storage upload fails
            let finalImageUrl = dataUri;
            try {
              finalImageUrl = await uploadGeneratedImageToStorage(
                imgObj.data,
                mimeType,
                'pet-studio'
              );
            } catch (storageErr) {
              logger.warn('Pet Studio: Supabase storage upload failed, falling back to data URI:', storageErr);
            }

            return NextResponse.json({
              success: true,
              imageUrl: finalImageUrl,
              dataUri,
              model
            });
          }
        }

        logger.warn(`Pet Studio: model ${model} returned no image in response parts.`);
      } catch (err: any) {
        logger.warn(`Pet Studio: error with model ${model}:`, err);
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Image generation failed across all models. Please check your Gemini API key and billing status.'
    });
  } catch (error: any) {
    logger.error('Error in /api/admin/pet-studio:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate pet fashion image' },
      { status: 500 }
    );
  }
}

/**
 * Resolves an image source (URL or base64 data URI) to raw base64 + MIME type.
 */
async function resolveImageToBase64(src: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    // Handle data URIs (from file uploads)
    if (src.startsWith('data:')) {
      const match = src.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], base64: match[2] };
      }
      return null;
    }

    // Handle remote URLs
    if (src.startsWith('http')) {
      const res = await fetch(src, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          Accept: 'image/webp,image/*,*/*'
        }
      });
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const mimeType = contentType.includes('png') ? 'image/png' : 'image/jpeg';
      return { base64: Buffer.from(buf).toString('base64'), mimeType };
    }

    return null;
  } catch (err) {
    logger.warn('Failed to resolve image to base64:', err);
    return null;
  }
}
