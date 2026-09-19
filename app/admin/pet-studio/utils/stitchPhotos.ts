'use client';

export interface StitchOptions {
  imageA: string;
  imageB?: string | null;
  mode: 'single' | 'versus';
  layout: 'horizontal' | 'vertical';
  aspectRatio: string;
}

/**
 * Calculates target canvas dimensions based on standard or custom aspect ratios.
 */
export function getCanvasDimensionsForRatio(aspectRatio: string): { width: number; height: number } {
  const trimmed = aspectRatio.trim();

  if (trimmed === '9:16') {
    return { width: 1080, height: 1920 };
  }
  if (trimmed === '16:9') {
    return { width: 1920, height: 1080 };
  }
  if (trimmed === '1:1') {
    return { width: 1080, height: 1080 };
  }
  if (trimmed === '4.5:16') {
    return { width: 540, height: 1920 };
  }

  // Parse arbitrary 'W:H' custom ratios
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const w = parseFloat(parts[0]);
    const h = parseFloat(parts[1]);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      if (w >= h) {
        return { width: 1920, height: Math.round(1920 * (h / w)) };
      } else {
        return { width: Math.round(1920 * (w / h)), height: 1920 };
      }
    }
  }

  // Default fallback: 9:16
  return { width: 1080, height: 1920 };
}

/**
 * Loads an image safely from a data URI or remote URL with CORS support.
 */
function loadImageSafe(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback: try fetching as blob and object URL if remote
      if (src.startsWith('http')) {
        fetch(src)
          .then(res => res.blob())
          .then(blob => {
            const objUrl = URL.createObjectURL(blob);
            const fallback = new window.Image();
            fallback.onload = () => resolve(fallback);
            fallback.onerror = () => reject(new Error('Failed to load image for stitching'));
            fallback.src = objUrl;
          })
          .catch(reject);
      } else {
        reject(new Error('Failed to load image for stitching'));
      }
    };
    img.src = src;
  });
}

/**
 * Draws an image into a bounding box with CSS 'object-fit: cover' behavior.
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  destX: number,
  destY: number,
  destW: number,
  destH: number
) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const destRatio = destW / destH;
  let srcX = 0;
  let srcY = 0;
  let srcW = img.naturalWidth;
  let srcH = img.naturalHeight;

  if (imgRatio > destRatio) {
    srcW = img.naturalHeight * destRatio;
    srcX = (img.naturalWidth - srcW) / 2;
  } else {
    srcH = img.naturalWidth / destRatio;
    srcY = (img.naturalHeight - srcH) / 2;
  }

  ctx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
}

/**
 * Stitches original uploaded photos together into an instant 50/50 comparison image.
 * This runs entirely client-side on an HTML5 canvas in milliseconds without API calls.
 */
export async function stitchPhotos(options: StitchOptions): Promise<string> {
  const { imageA, imageB, mode, layout, aspectRatio } = options;
  const { width, height } = getCanvasDimensionsForRatio(aspectRatio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not initialize canvas 2D context');

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  const imgA = await loadImageSafe(imageA);

  if (mode === 'versus' && imageB) {
    const imgB = await loadImageSafe(imageB);

    if (layout === 'vertical') {
      // Side by Side (Left & Right)
      const halfW = width / 2;
      drawImageCover(ctx, imgA, 0, 0, halfW, height);
      drawImageCover(ctx, imgB, halfW, 0, halfW, height);

      // Clean white divider line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = Math.max(3, Math.round(width * 0.004));
      ctx.beginPath();
      ctx.moveTo(halfW, 0);
      ctx.lineTo(halfW, height);
      ctx.stroke();
    } else {
      // Stacked (Top & Bottom)
      const halfH = height / 2;
      drawImageCover(ctx, imgA, 0, 0, width, halfH);
      drawImageCover(ctx, imgB, 0, halfH, width, halfH);

      // Clean white divider line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = Math.max(3, Math.round(height * 0.004));
      ctx.beginPath();
      ctx.moveTo(0, halfH);
      ctx.lineTo(width, halfH);
      ctx.stroke();
    }
  } else {
    // Single pet mode
    drawImageCover(ctx, imgA, 0, 0, width, height);
  }

  return canvas.toDataURL('image/jpeg', 0.95);
}
