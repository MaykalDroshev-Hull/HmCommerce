import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createServerClient } from '@/lib/supabase';
import { DEFAULT_BUCKET } from '@/lib/supabaseStorage';
import { toPlainUint8Array } from '@/lib/compress-image';
import { logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/api-error';

export const runtime = 'nodejs';

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let inputBuffer: Buffer | null = null;
    let originalName = 'image';
    let quality = 70;
    let saveToStorage = false;
    let targetFolder = 'images';
    let storagePath: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const q = formData.get('quality');
      const save = formData.get('saveToStorage');
      const folder = formData.get('folder');

      if (!file) {
        return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
      }

      originalName = file.name;
      quality = q ? parseInt(String(q), 10) : 70;
      saveToStorage = save === 'true' || save === '1';
      targetFolder = (folder as string) || 'images';

      const arrayBuffer = await file.arrayBuffer();
      inputBuffer = Buffer.from(arrayBuffer);
    } else {
      const body = await request.json().catch(() => ({}));
      const { path, url, quality: q, saveToStorage: save, folder, name } = body;

      quality = q ? parseInt(String(q), 10) : 70;
      saveToStorage = Boolean(save);
      targetFolder = folder || 'images';

      if (name) {
        originalName = name;
      }

      if (path) {
        storagePath = path;
        const supabase = createServerClient();
        const { data, error } = await supabase.storage.from(DEFAULT_BUCKET).download(path);

        if (error || !data) {
          logger.error('Failed to download image from storage path', error);
          return NextResponse.json(
            { error: `Could not retrieve file from storage: ${error?.message || 'Unknown error'}` },
            { status: 404 }
          );
        }

        const arrayBuffer = await data.arrayBuffer();
        inputBuffer = Buffer.from(arrayBuffer);
        if (!name) {
          originalName = path.split('/').pop() || 'image';
        }
        if (!folder && path.includes('/')) {
          targetFolder = path.split('/')[0];
        }
      } else if (url) {
        const fetchRes = await fetch(url);
        if (!fetchRes.ok) {
          return NextResponse.json(
            { error: `Could not fetch image from URL: ${fetchRes.statusText}` },
            { status: 400 }
          );
        }
        const arrayBuffer = await fetchRes.arrayBuffer();
        inputBuffer = Buffer.from(arrayBuffer);
        if (!name) {
          try {
            const urlObj = new URL(url);
            originalName = urlObj.pathname.split('/').pop() || 'image';
          } catch {
            originalName = 'image';
          }
        }
      } else {
        return NextResponse.json(
          { error: 'Please provide an image file, storage path, or URL' },
          { status: 400 }
        );
      }
    }

    if (!inputBuffer || inputBuffer.length === 0) {
      return NextResponse.json({ error: 'Empty image buffer received' }, { status: 400 });
    }

    // Inspect original image
    const sourcePlain = toPlainUint8Array(inputBuffer);
    const sharpInstance = sharp(sourcePlain, { failOn: 'none' }).rotate();
    const metadata = await sharpInstance.metadata();

    const originalSize = inputBuffer.length;
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;
    const originalFormat = (metadata.format || 'unknown').toLowerCase();

    // Sanitize quality parameter (clamped 20 - 95)
    const validQuality = Math.min(95, Math.max(20, isNaN(quality) ? 70 : quality));

    // Convert to AVIF format
    const avifBuffer = await sharp(sourcePlain, { failOn: 'none' })
      .rotate()
      .avif({
        quality: validQuality,
        effort: 4,
        chromaSubsampling: '4:2:0',
      })
      .toBuffer();

    const avifSize = avifBuffer.length;
    const bytesSaved = originalSize - avifSize;
    const percentSaved = originalSize > 0 ? Number((((bytesSaved) / originalSize) * 100).toFixed(1)) : 0;
    const isSmaller = bytesSaved > 0;

    const baseName = originalName.replace(/\.[^/.]+$/, '');
    const avifFileName = `${baseName}.avif`;

    // Generate base64 data URI for instant client preview
    const dataUrl = `data:image/avif;base64,${avifBuffer.toString('base64')}`;

    let savedPath: string | null = null;
    let savedUrl: string | null = null;

    if (saveToStorage) {
      const supabase = createServerClient();
      const timestamp = Date.now();
      const sanitizedBase = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
      savedPath = `${targetFolder}/${timestamp}-${sanitizedBase}.avif`;

      const uploadBytes = toPlainUint8Array(avifBuffer);
      const { error: uploadError } = await supabase.storage
        .from(DEFAULT_BUCKET)
        .upload(savedPath, uploadBytes, {
          contentType: 'image/avif',
          upsert: true,
        });

      if (uploadError) {
        logger.error('Failed to save converted AVIF to storage', uploadError);
        return apiErrorResponse({
          code: 'INTERNAL_ERROR',
          status: 500,
          error: uploadError,
        });
      }

      const { data: urlData } = supabase.storage
        .from(DEFAULT_BUCKET)
        .getPublicUrl(savedPath);

      savedUrl = urlData.publicUrl;
    }

    return NextResponse.json({
      success: true,
      original: {
        name: originalName,
        size: originalSize,
        sizeFormatted: formatBytes(originalSize),
        format: originalFormat,
        width: originalWidth,
        height: originalHeight,
      },
      avif: {
        name: avifFileName,
        size: avifSize,
        sizeFormatted: formatBytes(avifSize),
        format: 'avif',
        quality: validQuality,
        width: originalWidth,
        height: originalHeight,
        dataUrl,
        savedPath,
        savedUrl,
      },
      comparison: {
        bytesSaved: Math.abs(bytesSaved),
        savedFormatted: formatBytes(Math.abs(bytesSaved)),
        percentSaved: Math.abs(percentSaved),
        isSmaller,
        savingsText: isSmaller
          ? `${percentSaved}% smaller (${formatBytes(bytesSaved)} saved)`
          : `${Math.abs(percentSaved)}% larger (already optimal format)`,
      },
    });
  } catch (error) {
    logger.error('Error during AVIF conversion', error);
    return apiErrorResponse({
      code: 'INTERNAL_ERROR',
      status: 500,
      error,
    });
  }
}
