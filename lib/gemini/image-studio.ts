import { createServerClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface SceneOptions {
  sourceImageUrl?: string;
  productTitle?: string;
  breed?: string;
  scenePreset?: 'clean_studio' | 'dynamic_action' | 'british_home' | 'outdoor_park' | 'custom';
  customInstructions?: string;
}

export interface StudioPromptResult {
  analysis: string;
  imagenPrompt: string;
}

export interface ImagenGenerationResult {
  success: boolean;
  imageUrl?: string;
  base64Data?: string;
  mimeType?: string;
  promptUsed?: string;
  analysis?: string;
  error?: string;
  requiresBilling?: boolean;
}

/**
 * Synthesizes an elite commercial photography prompt using Gemini 3.6 Flash Vision
 */
export async function synthesizeStudioPrompt(
  options: SceneOptions,
  apiKey: string
): Promise<StudioPromptResult> {
  const breed = options.breed || 'Labrador Retriever';
  const preset = options.scenePreset || 'clean_studio';
  const custom = options.customInstructions || '';
  const title = options.productTitle || 'Pet Accessory';

  let presetGuidance = '';
  switch (preset) {
    case 'dynamic_action':
      presetGuidance = 'Dramatic high-energy action pose: the dog is rearing back on hind legs like a wild stallion, powerful athletic motion, playful energetic interaction, plush rider holding on tight.';
      break;
    case 'clean_studio':
      presetGuidance = 'Clean luxury commercial editorial studio photography, seamless infinite white background, soft floor contact shadows, high-end commercial 3-point studio lighting, crisp 85mm lens portrait.';
      break;
    case 'british_home':
      presetGuidance = 'Warm, cozy British country home living room, natural morning sunlight streaming through mullioned windows, herringbone oak flooring, tasteful minimalist modern English decor.';
      break;
    case 'outdoor_park':
      presetGuidance = 'Lush British countryside autumn park, crisp morning golden hour sunlight, scattered colorful fall leaves, soft background bokeh.';
      break;
    case 'custom':
    default:
      presetGuidance = custom || 'Commercial studio catalog photography, seamless neutral studio background, 85mm lens, sharp focus.';
      break;
  }

  const systemInstruction = `You are a world-class commercial product photographer and creative art director for a luxury British pet brand (MB-Paws).
Your job is to analyze the provided product image and synthesize a photorealistic, high-converting commercial photograph prompt for Google Imagen 3.

MANDATORY DIRECTIVES:
1. TARGET PET BREED: The animal in the photograph MUST BE A ${breed.toUpperCase()} (a purebred ${breed}). If the original product image features a different breed (e.g. Dalmatian, Poodle, Golden Retriever, etc.), you MUST completely replace the animal with a ${breed}. Do NOT include the original breed.
2. SCENE & ENVIRONMENT: The setting MUST BE: ${presetGuidance}. If the preset is British Home, it MUST be inside an English country home with warm oak flooring. If the preset is Clean Studio, it MUST be a seamless white studio. Do NOT mix settings.
3. PRODUCT FIDELITY: Maintain the exact product/bed/costume design, plush faux-fur texture, color, and construction shown in the source image.
4. ABSOLUTELY ZERO TEXT: No typography, no words, no banners, no signs, no letters, no logos, no watermarks. Must look like a real genuine photograph.
5. USER INSTRUCTIONS: ${custom ? custom : 'None provided. Focus on premium British commercial aesthetic.'}
6. CAMERA SPECIFICATIONS: Hasselblad 100MP, 85mm portrait lens, f/8 aperture for edge-to-edge sharpness, professional 3-point commercial studio lighting.

Output JSON format ONLY:
{
  "analysis": "2-3 sentences breaking down key product components and the visual transformation plan",
  "imagenPrompt": "The complete, rich descriptive prompt for Google Imagen 3"
}`;

  const parts: any[] = [{ text: systemInstruction }];

  // If source image URL is available, fetch and pass to vision model
  if (options.sourceImageUrl && options.sourceImageUrl.startsWith('http')) {
    try {
      const imgRes = await fetch(options.sourceImageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'image/webp,image/*,*/*'
        }
      });
      if (imgRes.ok) {
        const arrayBuf = await imgRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuf).toString('base64');
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        parts.push({
          inline_data: {
            mime_type: contentType.includes('png') ? 'image/png' : 'image/jpeg',
            data: base64
          }
        });
      }
    } catch (fetchErr) {
      logger.warn('Could not fetch source image for vision prompt synthesis:', fetchErr);
    }
  } else {
    parts.push({ text: `Target Product: ${title}` });
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.7
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Error from Gemini 3.6 prompt synthesis:', errorText);
    throw new Error(`Gemini synthesis failed: ${response.statusText}`);
  }

  const data = await response.json();
  const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawJson) {
    throw new Error('No prompt generated by Gemini');
  }

  try {
    const parsed = JSON.parse(rawJson);
    return {
      analysis: parsed.analysis || 'Product components successfully analyzed and synthesized for studio photography.',
      imagenPrompt: parsed.imagenPrompt || rawJson
    };
  } catch (e) {
    return {
      analysis: 'Product components analyzed.',
      imagenPrompt: rawJson
    };
  }
}

/**
 * Generates an image using Google Gemini Image Generation model via the Gemini API
 */
export async function generateWithImagen3(
  prompt: string,
  apiKey: string,
  aspectRatio: '1:1' | '3:4' | '4:3' | '16:9' = '1:1'
): Promise<{ success: boolean; base64Data?: string; mimeType?: string; error?: string; requiresBilling?: boolean }> {
  const models = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image', 'gemini-3-pro-image'];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ]
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
          errorMsg.includes('free_tier_requests') ||
          errorMsg.includes('billing');

        if (isQuotaOrBilling) {
          return {
            success: false,
            error: errorMsg,
            requiresBilling: true
          };
        }
        continue;
      }

      const parts = result?.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        const imgObj = part.inlineData || part.inline_data;
        if (imgObj && imgObj.data) {
          return {
            success: true,
            base64Data: imgObj.data,
            mimeType: imgObj.mimeType || imgObj.mime_type || 'image/jpeg'
          };
        }
      }
    } catch (err: any) {
      logger.warn(`Error generating with model ${model}:`, err);
    }
  }

  return {
    success: false,
    error: 'Image generation requires a Google Cloud project with billing or trial credits enabled.'
  };
}

/**
 * Uploads a base64 image to Supabase Storage in the products bucket
 */
export async function uploadGeneratedImageToStorage(
  base64Data: string,
  mimeType: string = 'image/jpeg',
  prefix: string = 'ai-studio'
): Promise<string> {
  const supabase = createServerClient();
  const buffer = Buffer.from(base64Data, 'base64');
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const filePath = `ai-generated/${fileName}`;

  const { data, error } = await supabase.storage.from('products').upload(filePath, buffer, {
    contentType: mimeType,
    cacheControl: '31536000',
    upsert: true
  });

  if (error) {
    logger.error('Error uploading AI image to Supabase storage:', error);
    throw new Error(`Failed to upload to storage: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from('products').getPublicUrl(data.path);
  return urlData.publicUrl;
}
