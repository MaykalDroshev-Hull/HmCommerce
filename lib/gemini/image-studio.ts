import fs from 'fs';
import path from 'path';
import { createServerClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface SceneOptions {
  sourceImageUrl?: string;
  productTitle?: string;
  breed?: string;
  scenePreset?: 'clean_studio' | 'dynamic_action' | 'british_home' | 'outdoor_park' | 'custom';
  customInstructions?: string;
}

export interface DirectGenerationOptions {
  sourceImageUrl: string;
  imageType: 'product' | 'size_guide';
  productTitle?: string;
  breed?: string;
  scenePreset?: 'clean_studio' | 'dynamic_action' | 'british_home' | 'outdoor_park' | 'custom';
  customInstructions?: string;
  logoVariant?: 'black' | 'white';
  aspectRatio?: '1:1' | '3:4' | '4:3' | '16:9';
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
  // Strategy 1: Google Imagen 3 Dedicated predict endpoint
  const imagenModels = ['imagen-3.0-generate-002', 'imagen-3.0-generate-001'];
  for (const model of imagenModels) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio
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

      if (result.predictions && result.predictions[0]) {
        const pred = result.predictions[0];
        const base64Data = pred.bytesBase64Encoded || pred.data;
        if (base64Data) {
          return {
            success: true,
            base64Data,
            mimeType: pred.mimeType || 'image/jpeg'
          };
        }
      }
    } catch (err: any) {
      logger.warn(`Error generating with Imagen model ${model}:`, err);
    }
  }

  // Strategy 2: Gemini multimodal models with image output modality
  const geminiModels = ['gemini-2.0-flash-exp', 'gemini-3.1-flash-image', 'gemini-2.5-flash-image'];
  for (const model of geminiModels) {
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
            ],
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
      logger.warn(`Error generating with Gemini image model ${model}:`, err);
    }
  }

  return {
    success: false,
    error: 'Image generation requires a Google Cloud project with Imagen 3 or Gemini image capabilities enabled.'
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

/**
 * Loads the official Meow Bark brand logo as base64 for size guide chart generation
 */
export async function getBrandLogoBase64(variant: 'black' | 'white' = 'black'): Promise<{ data: string; mimeType: string } | null> {
  try {
    const filename = variant === 'white' ? 'White-logo.png' : 'Black Logo.png';
    const filePath = path.join(process.cwd(), 'public', filename);
    const fileBuffer = await fs.promises.readFile(filePath);
    return {
      data: fileBuffer.toString('base64'),
      mimeType: 'image/png'
    };
  } catch (err) {
    logger.warn(`Could not load brand logo from disk (${variant}):`, err);
    return null;
  }
}

/**
 * Generates or transforms an image directly via Gemini Multimodal Image Generation
 * by feeding the source image bytes directly into the model along with editorial guidance.
 */
export async function generateDirectMultimodalImage(
  options: DirectGenerationOptions,
  apiKey: string
): Promise<{ success: boolean; imageUrl?: string; base64Data?: string; mimeType?: string; promptUsed?: string; error?: string; requiresBilling?: boolean }> {
  try {
    // 1. Fetch source image and encode to Base64
    const imgRes = await fetch(options.sourceImageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'image/webp,image/*,*/*'
      }
    });

    if (!imgRes.ok) {
      return { success: false, error: `Failed to download source image (HTTP ${imgRes.status})` };
    }

    const arrayBuf = await imgRes.arrayBuffer();
    const sourceBase64 = Buffer.from(arrayBuf).toString('base64');
    const sourceMime = (imgRes.headers.get('content-type') || 'image/jpeg').includes('png') ? 'image/png' : 'image/jpeg';

    const parts: any[] = [];
    let promptText = '';

    if (options.imageType === 'size_guide') {
      promptText = `You are an elite commercial graphic designer for the British pet brand "Meow Bark".
You are provided with two images:
1. An original supplier pet sizing chart image.
2. The official "Meow Bark" brand logo.

TASK:
Re-create and transform this sizing chart directly into a clean, minimalist, high-end British editorial sizing guide image:
- BRANDING: Feature the provided "Meow Bark" logo prominently at the top center or top left of the graphic.
- ACCURACY: Meticulously preserve every single measurement number, size letter (XS, S, M, L, XL, XXL, etc.), chest girth (cm/in), back length (cm/in), and weight range from the source chart.
- CLEAN EDITORIAL DESIGN: Clean monochrome/neutral palette, crisp modern typography (Inter/Helvetica style), generous whitespace, refined thin borders, and an intuitive layout.
- ZERO CLUTTER: Remove all foreign watermark characters, Asian script, seller logos, and low-res artifacts.
${options.customInstructions ? `Additional guidance: ${options.customInstructions}` : ''}
Produce a finished, ultra-sharp, high-resolution commercial sizing graphic ready for a premium UK e-commerce store.`;

      parts.push({ text: promptText });
      parts.push({
        inline_data: {
          mime_type: sourceMime,
          data: sourceBase64
        }
      });

      // Attach logo
      const logo = await getBrandLogoBase64(options.logoVariant || 'black');
      if (logo) {
        parts.push({
          inline_data: {
            mime_type: logo.mimeType,
            data: logo.data
          }
        });
      }
    } else {
      let presetGuidance = '';
      switch (options.scenePreset) {
        case 'dynamic_action':
          presetGuidance = 'Dramatic high-energy action pose: the pet is in an energetic, playful motion, showing off the apparel.';
          break;
        case 'british_home':
          presetGuidance = 'Warm, cozy British country home living room, natural morning sunlight streaming through windows, herringbone oak flooring, tasteful minimalist English decor.';
          break;
        case 'outdoor_park':
          presetGuidance = 'Lush British countryside autumn park, crisp morning golden hour sunlight, scattered colorful fall leaves, soft background bokeh.';
          break;
        case 'clean_studio':
        case 'custom':
        default:
          presetGuidance = options.customInstructions || 'Clean luxury commercial editorial studio photography, seamless neutral/white studio backdrop, soft floor contact shadows, high-end 85mm commercial portrait lighting.';
          break;
      }

      const breed = options.breed && options.breed !== 'Original Breed' ? options.breed : 'purebred model dog or cat matching the costume';

      promptText = `You are an elite commercial product photographer for luxury British pet brand "Meow Bark".
You are provided with a source product image showing a pet apparel/costume/accessory item.

TASK:
Re-imagine this product directly into a high-end commercial editorial photograph:
1. PRODUCT FIDELITY: Retain the EXACT costume/apparel design, plush fabric texture, colors, stripes/patterns, hood elements, and construction shown in the input image. Do NOT alter the product itself.
2. PET MODEL: Model the apparel on a clean, healthy, adorable ${breed}.
3. SETTING & LIGHTING: ${presetGuidance}
4. COMMERCIAL AESTHETIC: Hasselblad 100MP clarity, 85mm portrait lens, f/8 sharpness, soft natural commercial lighting, elegant British pet lifestyle magazine quality.
5. ZERO ARTIFACTS: Absolutely zero text, watermarks, stamps, or logos. Looks like a genuine studio photoshoot.
${options.customInstructions ? `Additional guidance: ${options.customInstructions}` : ''}`;

      parts.push({ text: promptText });
      parts.push({
        inline_data: {
          mime_type: sourceMime,
          data: sourceBase64
        }
      });
    }

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
            errorMsg.includes('free_tier_requests') ||
            errorMsg.includes('billing');

          if (isQuotaOrBilling) {
            return {
              success: false,
              error: errorMsg,
              requiresBilling: true,
              promptUsed: promptText
            };
          }
          continue;
        }

        const resParts = result?.candidates?.[0]?.content?.parts || [];
        for (const part of resParts) {
          const imgObj = part.inlineData || part.inline_data;
          if (imgObj && imgObj.data) {
            const mimeType = imgObj.mimeType || imgObj.mime_type || 'image/jpeg';
            const permanentUrl = await uploadGeneratedImageToStorage(
              imgObj.data,
              mimeType,
              options.imageType === 'size_guide' ? 'size-guide' : 'ai-studio'
            );

            return {
              success: true,
              imageUrl: permanentUrl,
              base64Data: imgObj.data,
              mimeType,
              promptUsed: promptText
            };
          }
        }
      } catch (err: any) {
        logger.warn(`Error generating direct multimodal with model ${model}:`, err);
      }
    }

    return {
      success: false,
      error: 'Direct multimodal generation requires a Google Cloud project with image generation permissions enabled.',
      promptUsed: promptText
    };
  } catch (err: any) {
    logger.error('Error in generateDirectMultimodalImage:', err);
    return {
      success: false,
      error: err.message || 'Failed to generate direct multimodal image'
    };
  }
}
