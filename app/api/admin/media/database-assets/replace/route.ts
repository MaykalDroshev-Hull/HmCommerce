export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DEFAULT_BUCKET } from '@/lib/supabaseStorage';
import { toPlainUint8Array } from '@/lib/compress-image';
import { logger } from '@/lib/logger';
import { apiErrorResponse, apiSuccessResponse } from '@/lib/api-error';

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function extractStoragePath(url: string, bucket = DEFAULT_BUCKET): string | null {
  try {
    const marker = `/storage/v1/object/public/${bucket}/`;
    if (url.includes(marker)) {
      return decodeURIComponent(url.split(marker)[1] || '');
    }
    const altMarker = `/storage/v1/object/sign/${bucket}/`;
    if (url.includes(altMarker)) {
      return decodeURIComponent(url.split(altMarker)[1]?.split('?')[0] || '');
    }
  } catch {
    return null;
  }
  return null;
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const storagePath = extractStoragePath(url);
    if (storagePath) {
      const { data, error } = await supabaseAdmin.storage
        .from(DEFAULT_BUCKET)
        .download(storagePath);
      if (!error && data) {
        const ab = await data.arrayBuffer();
        return Buffer.from(ab);
      }
    }

    // Direct HTTP fetch (external CDN or fallback)
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HmCommerceOptimizer/1.0)',
      },
    });

    if (!res.ok) {
      logger.warn(`Failed to fetch image ${url}: ${res.status} ${res.statusText}`);
      return null;
    }

    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch (err) {
    logger.warn(`Error fetching image buffer from ${url}:`, err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      assetId,
      assetType = 'product_image',
      targetField,
      currentUrl,
      quality = 70,
      deleteOldFromStorage = true,
      customBaseName,
    } = body;

    if (!assetId || !currentUrl) {
      return apiErrorResponse({
        code: 'VALIDATION_FAILED',
        status: 400,
        publicMessage: 'Missing assetId or currentUrl.',
      });
    }

    // 1. Download source image
    const inputBuffer = await fetchImageBuffer(currentUrl);
    if (!inputBuffer || inputBuffer.length === 0) {
      return apiErrorResponse({
        code: 'INTERNAL_ERROR',
        status: 400,
        publicMessage: `Unable to retrieve source image from: ${currentUrl}`,
      });
    }

    const originalSize = inputBuffer.length;
    const sourcePlain = toPlainUint8Array(inputBuffer);
    const validQuality = Math.min(95, Math.max(20, parseInt(String(quality), 10)));

    // 2. Convert to AVIF format
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
    const percentSaved = originalSize > 0
      ? Number(((bytesSaved / originalSize) * 100).toFixed(1))
      : 0;

    // 3. Prepare target filename and storage path
    let baseName = 'optimized';
    if (customBaseName) {
      baseName = customBaseName;
    } else {
      try {
        const urlObj = new URL(currentUrl);
        const fileName = urlObj.pathname.split('/').pop() || 'image';
        baseName = fileName.replace(/\.[^/.]+$/, '');
      } catch {
        baseName = 'image';
      }
    }
    const sanitizedBase = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    const timestamp = Date.now();
    const newStoragePath = `images/avif-${timestamp}-${sanitizedBase}.avif`;

    // 4. Upload AVIF to Supabase Storage
    const uploadBytes = toPlainUint8Array(avifBuffer);
    const { error: uploadError } = await supabaseAdmin.storage
      .from(DEFAULT_BUCKET)
      .upload(newStoragePath, uploadBytes, {
        contentType: 'image/avif',
        upsert: true,
      });

    if (uploadError) {
      logger.error('Failed to upload converted AVIF to storage', uploadError);
      return apiErrorResponse({
        code: 'INTERNAL_ERROR',
        status: 500,
        error: uploadError,
        publicMessage: 'Failed to upload converted AVIF to storage.',
      });
    }

    // 5. Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(DEFAULT_BUCKET)
      .getPublicUrl(newStoragePath);

    const newPublicUrl = urlData.publicUrl;

    // 6. Update Database Record
    let dbUpdateSuccess = false;
    let dbErrorMessage = '';

    if (assetType === 'product_image') {
      const { error: dbError } = await supabaseAdmin
        .from('product_images')
        .update({ imageurl: newPublicUrl })
        .eq('productimageid', assetId);

      if (dbError) {
        dbErrorMessage = dbError.message;
      } else {
        dbUpdateSuccess = true;
      }
    } else if (assetType === 'store_settings' && targetField) {
      const cleanId = assetId.split('_')[0];
      const { error: dbError } = await supabaseAdmin
        .from('store_settings')
        .update({ [targetField]: newPublicUrl })
        .eq('storesettingsid', cleanId);

      if (dbError) {
        dbErrorMessage = dbError.message;
      } else {
        dbUpdateSuccess = true;
      }
    } else if (assetType === 'testimonial') {
      const { error: dbError } = await supabaseAdmin
        .from('testimonials')
        .update({ imageurl: newPublicUrl })
        .eq('testimonialid', assetId);

      if (dbError) {
        dbErrorMessage = dbError.message;
      } else {
        dbUpdateSuccess = true;
      }
    } else {
      return apiErrorResponse({
        code: 'VALIDATION_FAILED',
        status: 400,
        publicMessage: `Unsupported assetType: ${assetType}`,
      });
    }

    if (!dbUpdateSuccess) {
      logger.error('Database update failed when replacing image URL', dbErrorMessage);
      return apiErrorResponse({
        code: 'INTERNAL_ERROR',
        status: 500,
        publicMessage: `Failed to update database record: ${dbErrorMessage}`,
      });
    }

    // 7. Optionally delete old file from storage
    let oldFileDeleted = false;
    const oldStoragePath = extractStoragePath(currentUrl);

    if (deleteOldFromStorage && oldStoragePath && oldStoragePath !== newStoragePath) {
      try {
        const { error: removeError } = await supabaseAdmin.storage
          .from(DEFAULT_BUCKET)
          .remove([oldStoragePath]);

        if (!removeError) {
          oldFileDeleted = true;
        } else {
          logger.warn('Could not remove old file from storage:', removeError);
        }
      } catch (err) {
        logger.warn('Error deleting old storage file:', err);
      }
    }

    return apiSuccessResponse({
      assetId,
      assetType,
      targetField,
      oldUrl: currentUrl,
      newUrl: newPublicUrl,
      newStoragePath,
      originalSize,
      originalSizeFormatted: formatBytes(originalSize),
      newSize: avifSize,
      newSizeFormatted: formatBytes(avifSize),
      bytesSaved,
      savedFormatted: formatBytes(Math.abs(bytesSaved)),
      percentSaved,
      quality: validQuality,
      oldFileDeleted,
    });
  } catch (error) {
    logger.error('Unexpected error in replace route:', error);
    return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
  }
}
