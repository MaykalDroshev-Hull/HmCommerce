import { NextRequest, NextResponse } from 'next/server';
import {
  synthesizeStudioPrompt,
  generateWithImagen3,
  generateDirectMultimodalImage,
  uploadGeneratedImageToStorage,
  SceneOptions,
  DirectGenerationOptions
} from '@/lib/gemini/image-studio';
import { getGeminiApiKey } from '@/lib/gemini/copywriter';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'generate'; // 'synthesize-prompt' | 'generate' | 'upload-manual' | 'generate-direct'

    const apiKey = (await getGeminiApiKey()) || process.env.GEMINI_API_KEY;
    if (!apiKey && action !== 'upload-manual') {
      return NextResponse.json(
        {
          success: false,
          error: 'Gemini API key is not configured. Please add it in Settings & API or .env.local'
        },
        { status: 400 }
      );
    }

    // MODE 1: Synthesize Prompt only (Fast preview & clipboard copy)
    if (action === 'synthesize-prompt') {
      const options: SceneOptions = {
        sourceImageUrl: body.sourceImageUrl,
        productTitle: body.productTitle,
        breed: body.breed,
        scenePreset: body.scenePreset,
        customInstructions: body.customInstructions
      };

      const result = await synthesizeStudioPrompt(options, apiKey!);
      return NextResponse.json({
        success: true,
        analysis: result.analysis,
        imagenPrompt: result.imagenPrompt
      });
    }

    // MODE 2: Full Generation with Google Imagen 3
    if (action === 'generate') {
      let promptToUse = body.prompt;
      let analysis = body.analysis || '';

      // If prompt was not provided, synthesize first
      if (!promptToUse) {
        const options: SceneOptions = {
          sourceImageUrl: body.sourceImageUrl,
          productTitle: body.productTitle,
          breed: body.breed,
          scenePreset: body.scenePreset,
          customInstructions: body.customInstructions
        };

        const synthResult = await synthesizeStudioPrompt(options, apiKey!);
        promptToUse = synthResult.imagenPrompt;
        analysis = synthResult.analysis;
      }

      // Call Google Imagen 3
      const imgResult = await generateWithImagen3(promptToUse, apiKey!, body.aspectRatio || '1:1');

      if (!imgResult.success) {
        return NextResponse.json({
          success: false,
          error: imgResult.error,
          requiresBilling: imgResult.requiresBilling,
          promptUsed: promptToUse,
          analysis: analysis
        });
      }

      // Upload generated image to Supabase Storage
      const permanentUrl = await uploadGeneratedImageToStorage(
        imgResult.base64Data!,
        imgResult.mimeType || 'image/jpeg',
        'ai-studio'
      );

      return NextResponse.json({
        success: true,
        imageUrl: permanentUrl,
        promptUsed: promptToUse,
        analysis: analysis
      });
    }

    // MODE 3: Upload an image directly (e.g. if user generated in Gemini chat and pasted/uploaded)
    if (action === 'upload-manual') {
      const { base64Data, mimeType } = body;
      if (!base64Data) {
        return NextResponse.json({ success: false, error: 'No image data provided' }, { status: 400 });
      }

      const permanentUrl = await uploadGeneratedImageToStorage(
        base64Data.replace(/^data:image\/\w+;base64,/, ''),
        mimeType || 'image/jpeg',
        'manual-studio'
      );

      return NextResponse.json({
        success: true,
        imageUrl: permanentUrl
      });
    }

    // MODE 4: Direct Multimodal Image Generation (Feeds image directly into Gemini)
    if (action === 'generate-direct') {
      const {
        sourceImageUrl,
        imageType = 'product', // 'product' | 'size_guide'
        productTitle,
        breed,
        scenePreset,
        customInstructions,
        logoVariant = 'black',
        aspectRatio = '1:1'
      } = body;

      if (!sourceImageUrl) {
        return NextResponse.json({ success: false, error: 'Source image URL is required' }, { status: 400 });
      }

      const options: DirectGenerationOptions = {
        sourceImageUrl,
        imageType,
        productTitle,
        breed,
        scenePreset,
        customInstructions,
        logoVariant,
        aspectRatio
      };

      const result = await generateDirectMultimodalImage(options, apiKey!);

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error,
          requiresBilling: result.requiresBilling,
          promptUsed: result.promptUsed
        });
      }

      return NextResponse.json({
        success: true,
        imageUrl: result.imageUrl,
        promptUsed: result.promptUsed
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    logger.error('Error in /api/ai/generate-image:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process AI image studio request'
      },
      { status: 500 }
    );
  }
}
