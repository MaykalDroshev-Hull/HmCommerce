import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { DEFAULT_BUCKET } from '@/lib/supabaseStorage';
import { compressImageForUpload, toPlainUint8Array } from '@/lib/compress-image';
import { logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/api-error';
import sharp from 'sharp';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'images';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const supportedImageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif',
      'image/heic',
      'image/heif',
      'image/svg+xml',
      'image/bmp',
      'image/tiff',
      'image/x-icon',
    ];

    const isValidImage =
      supportedImageTypes.includes(file.type.toLowerCase()) ||
      file.type.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|webp|avif|heic|heif|svg|bmp|tiff?|ico)$/i.test(file.name);

    if (!isValidImage) {
      return NextResponse.json(
        { error: 'File must be an image (JPG, PNG, GIF, WebP, AVIF, HEIC, etc.)' },
        { status: 400 }
      );
    }

    // Copy into a plain Uint8Array — avoids SharedArrayBuffer errors with Supabase/fetch
    const originalBytes = toPlainUint8Array(await file.arrayBuffer());

    const compressed = await compressImageForUpload(originalBytes, file.type);

    let uploadBytes = compressed?.bytes;
    let contentType = compressed?.contentType;
    let fileExt = compressed?.extension;

    if (!uploadBytes) {
      if (!file.type.toLowerCase().includes('svg')) {
        try {
          const fallbackAvif = await sharp(originalBytes, { failOn: 'none' })
            .rotate()
            .avif({ quality: 75, effort: 4, chromaSubsampling: '4:2:0' })
            .toBuffer();
          uploadBytes = toPlainUint8Array(fallbackAvif);
          contentType = 'image/avif';
          fileExt = 'avif';
        } catch {
          uploadBytes = originalBytes;
          contentType = file.type || 'application/octet-stream';
          fileExt = file.name.split('.').pop() || 'avif';
        }
      } else {
        uploadBytes = originalBytes;
        contentType = file.type || 'image/svg+xml';
        fileExt = 'svg';
      }
    }

    const timestamp = Date.now();
    const fileName = `${folder}/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const supabase = createServerClient();

    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      logger.error('Error listing buckets', listError);
      return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error: listError });
    }

    const bucketExists = buckets?.some((b) => b.name === DEFAULT_BUCKET);

    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(
        DEFAULT_BUCKET,
        {
          public: true,
          fileSizeLimit: 10485760,
        }
      );

      if (createError) {
        logger.error('Error creating bucket', createError);
        return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error: createError });
      }
    }

    const { data, error } = await supabase.storage
      .from(DEFAULT_BUCKET)
      .upload(fileName, uploadBytes, {
        contentType,
        upsert: false,
      });

    if (error) {
      logger.error('Upload error', error);
      return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
    }

    const { data: urlData } = supabase.storage
      .from(DEFAULT_BUCKET)
      .getPublicUrl(data.path);

    const publicUrl = urlData.publicUrl;

    return NextResponse.json({
      success: true,
      path: data.path,
      url: publicUrl,
      fileName: file.name,
      bucket: DEFAULT_BUCKET,
      compressed: !!compressed,
      ...(compressed
        ? {
            originalBytes: compressed.originalBytes,
            compressedBytes: compressed.compressedBytes,
          }
        : {}),
    });
  } catch (error) {
    return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
  }
}
