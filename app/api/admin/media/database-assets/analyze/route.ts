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
    const quality = Math.min(95, Math.max(20, parseInt(String(body.quality || 70), 10)));
    const includePreview = Boolean(body.includePreview);

    // Support single or multiple items
    const items: Array<{ id: string; url: string }> = Array.isArray(body.items)
      ? body.items
      : body.url
      ? [{ id: body.id || 'single', url: body.url }]
      : [];

    if (items.length === 0) {
      return apiErrorResponse({
        code: 'VALIDATION_FAILED',
        status: 400,
        publicMessage: 'No image URL or items provided to analyze.',
      });
    }

    // Limit batch size to prevent server timeout
    const targetItems = items.slice(0, 50);

    const results = await Promise.all(
      targetItems.map(async (item) => {
        try {
          const buffer = await fetchImageBuffer(item.url);
          if (!buffer || buffer.length === 0) {
            return {
              id: item.id,
              url: item.url,
              error: 'Failed to download image buffer',
            };
          }

          const sourcePlain = toPlainUint8Array(buffer);
          const sharpInstance = sharp(sourcePlain, { failOn: 'none' }).rotate();
          const metadata = await sharpInstance.metadata();

          const originalSize = buffer.length;
          const originalFormat = (metadata.format || 'unknown').toLowerCase();
          const width = metadata.width || 0;
          const height = metadata.height || 0;

          // Convert in-memory to AVIF
          const avifBuffer = await sharp(sourcePlain, { failOn: 'none' })
            .rotate()
            .avif({
              quality,
              effort: 4,
              chromaSubsampling: '4:2:0',
            })
            .toBuffer();

          const avifSize = avifBuffer.length;
          const bytesSaved = originalSize - avifSize;
          const percentSaved = originalSize > 0
            ? Number(((bytesSaved / originalSize) * 100).toFixed(1))
            : 0;

          let previewUrl: string | undefined = undefined;
          if (includePreview || targetItems.length === 1) {
            previewUrl = `data:image/avif;base64,${avifBuffer.toString('base64')}`;
          }

          return {
            id: item.id,
            url: item.url,
            originalSize,
            originalSizeFormatted: formatBytes(originalSize),
            originalFormat,
            width,
            height,
            avifSize,
            avifSizeFormatted: formatBytes(avifSize),
            bytesSaved,
            savedFormatted: formatBytes(Math.abs(bytesSaved)),
            percentSaved,
            quality,
            isSmaller: bytesSaved > 0,
            previewUrl,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Conversion error';
          logger.warn(`Error analyzing image ${item.url}:`, msg);
          return {
            id: item.id,
            url: item.url,
            error: msg,
          };
        }
      })
    );

    // Calculate aggregated gains
    const validResults = results.filter((r) => !('error' in r && r.error));
    const totalOriginalBytes = validResults.reduce((acc, r: any) => acc + (r.originalSize || 0), 0);
    const totalAvifBytes = validResults.reduce((acc, r: any) => acc + (r.avifSize || 0), 0);
    const totalBytesSaved = totalOriginalBytes - totalAvifBytes;
    const overallPercentSaved = totalOriginalBytes > 0
      ? Number(((totalBytesSaved / totalOriginalBytes) * 100).toFixed(1))
      : 0;

    return apiSuccessResponse({
      results,
      summary: {
        analyzedCount: validResults.length,
        totalOriginalBytes,
        totalOriginalFormatted: formatBytes(totalOriginalBytes),
        totalAvifBytes,
        totalAvifFormatted: formatBytes(totalAvifBytes),
        totalBytesSaved,
        totalSavedFormatted: formatBytes(Math.abs(totalBytesSaved)),
        overallPercentSaved,
        quality,
      },
    });
  } catch (error) {
    logger.error('Error in analyze route:', error);
    return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
  }
}
