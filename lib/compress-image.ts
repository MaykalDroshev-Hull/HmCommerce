import sharp from 'sharp';
import { logger } from '@/lib/logger';

/** Longest side after resize — enough for retina product cards / zoom. */
const MAX_DIMENSION = 1600;
/** AVIF quality balance: industry-leading compression, crisp detail, significantly smaller than WebP & JPEG. */
const AVIF_QUALITY = 75;

export type CompressedImage = {
  /** Plain transferable bytes (never SharedArrayBuffer-backed). */
  bytes: Uint8Array;
  contentType: string;
  extension: string;
  originalBytes: number;
  compressedBytes: number;
};

/** Copy into a standalone Uint8Array so uploads never use SharedArrayBuffer. */
export function toPlainUint8Array(data: ArrayBuffer | Uint8Array): Uint8Array {
  const source = data instanceof ArrayBuffer ? new Uint8Array(data) : data;

  // Fresh allocation — never share the underlying buffer with Node/native pools
  const copy = new Uint8Array(source.byteLength);
  copy.set(source);
  return copy;
}

/**
 * Compress and normalize an uploaded image for storage.
 * - Auto-orients from EXIF
 * - Resizes so the longest side is ≤ 1600px
 * - Converts to AVIF format (mandated for all DB storage)
 * Returns null to keep vector formats (SVG) or if decoding completely fails.
 */
export async function compressImageForUpload(
  input: Uint8Array,
  mimeType: string
): Promise<CompressedImage | null> {
  const type = (mimeType || '').toLowerCase();

  // Leave vector formats alone
  if (type.includes('svg')) {
    return null;
  }

  try {
    // sharp accepts Uint8Array; keep a plain copy for safety across Node/Next runtimes
    const source = toPlainUint8Array(input);
    const meta = await sharp(source, { failOn: 'none', animated: false })
      .rotate()
      .metadata();

    let pipeline = sharp(source, { failOn: 'none', animated: false }).rotate();

    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    const compressedBuffer = await pipeline
      .avif({
        quality: AVIF_QUALITY,
        effort: 4,
        chromaSubsampling: '4:2:0',
      })
      .toBuffer();

    const compressed = toPlainUint8Array(compressedBuffer);

    return {
      bytes: compressed,
      contentType: 'image/avif',
      extension: 'avif',
      originalBytes: source.byteLength,
      compressedBytes: compressed.byteLength,
    };
  } catch (error) {
    logger.warn('AVIF compression error, attempting basic AVIF fallback', error);
    try {
      const fallbackBuffer = await sharp(toPlainUint8Array(input), { failOn: 'none' })
        .rotate()
        .avif({ quality: AVIF_QUALITY })
        .toBuffer();
      const compressed = toPlainUint8Array(fallbackBuffer);
      return {
        bytes: compressed,
        contentType: 'image/avif',
        extension: 'avif',
        originalBytes: input.byteLength,
        compressedBytes: compressed.byteLength,
      };
    } catch (fallbackError) {
      logger.error('Failed to convert image to AVIF', fallbackError);
      return null;
    }
  }
}
