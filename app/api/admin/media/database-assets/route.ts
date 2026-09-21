export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DEFAULT_BUCKET } from '@/lib/supabaseStorage';
import { logger } from '@/lib/logger';
import { apiErrorResponse, apiSuccessResponse } from '@/lib/api-error';

export interface DatabaseImageAsset {
  id: string;
  assetType: 'product_image' | 'store_settings' | 'testimonial';
  targetField?: string | null;
  productId?: string | null;
  productName: string;
  sku: string | null;
  isPrimary: boolean;
  sortOrder: number;
  url: string;
  format: string;
  isAvif: boolean;
  isExternal: boolean;
  storagePath: string | null;
  createdAt: string;
}

function detectFormat(url: string): string {
  try {
    const cleanUrl = url.split('?')[0];
    const ext = cleanUrl.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'svg', 'bmp'].includes(ext)) {
      return ext === 'jpeg' ? 'jpg' : ext;
    }
  } catch {
    // fallback
  }
  return 'unknown';
}

function extractStoragePath(url: string, bucket = DEFAULT_BUCKET): string | null {
  try {
    const marker = `/storage/v1/object/public/${bucket}/`;
    if (url.includes(marker)) {
      return decodeURIComponent(url.split(marker)[1] || '');
    }
    // Also handle authenticated or alternate storage URLs
    const altMarker = `/storage/v1/object/sign/${bucket}/`;
    if (url.includes(altMarker)) {
      return decodeURIComponent(url.split(altMarker)[1]?.split('?')[0] || '');
    }
  } catch {
    return null;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all, needs_optimisation, avif, external
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    // 1. Fetch all product images with joined product details
    const { data: productImages, error: pError } = await supabaseAdmin
      .from('product_images')
      .select(`
        productimageid,
        productid,
        productvariantid,
        imageurl,
        alttext,
        sortorder,
        isprimary,
        createdat,
        products (
          productid,
          name,
          sku
        ),
        product_variants (
          productvariantid,
          sku
        )
      `)
      .order('createdat', { ascending: false });

    if (pError) {
      logger.error('Failed to fetch product images from database', pError);
      return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error: pError });
    }

    const assets: DatabaseImageAsset[] = [];

    // Map product images
    for (const row of productImages || []) {
      if (!row.imageurl) continue;

      const product = Array.isArray(row.products) ? row.products[0] : row.products;
      const variant = Array.isArray(row.product_variants) ? row.product_variants[0] : row.product_variants;
      const productName = product?.name || 'Untitled Product';
      const sku = variant?.sku || product?.sku || null;
      const format = detectFormat(row.imageurl);
      const isAvif = format === 'avif';
      const storagePath = extractStoragePath(row.imageurl);
      const isExternal = storagePath === null;

      assets.push({
        id: row.productimageid,
        assetType: 'product_image',
        targetField: null,
        productId: row.productid,
        productName,
        sku,
        isPrimary: Boolean(row.isprimary),
        sortOrder: row.sortorder || 0,
        url: row.imageurl,
        format,
        isAvif,
        isExternal,
        storagePath,
        createdAt: row.createdat || new Date().toISOString(),
      });
    }

    // 2. Also fetch store_settings images
    try {
      const { data: settings } = await supabaseAdmin
        .from('store_settings')
        .select('storesettingsid, logourl, heroimageurl, aboutusphoto')
        .limit(1)
        .maybeSingle();

      if (settings) {
        const id = settings.storesettingsid || 'store-settings';
        if (settings.logourl) {
          const format = detectFormat(settings.logourl);
          assets.push({
            id: `${id}_logourl`,
            assetType: 'store_settings',
            targetField: 'logourl',
            productId: null,
            productName: 'Store Logo',
            sku: 'SETTINGS',
            isPrimary: true,
            sortOrder: 0,
            url: settings.logourl,
            format,
            isAvif: format === 'avif',
            isExternal: extractStoragePath(settings.logourl) === null,
            storagePath: extractStoragePath(settings.logourl),
            createdAt: new Date().toISOString(),
          });
        }
        if (settings.heroimageurl) {
          const format = detectFormat(settings.heroimageurl);
          assets.push({
            id: `${id}_heroimageurl`,
            assetType: 'store_settings',
            targetField: 'heroimageurl',
            productId: null,
            productName: 'Store Hero Banner',
            sku: 'SETTINGS',
            isPrimary: true,
            sortOrder: 1,
            url: settings.heroimageurl,
            format,
            isAvif: format === 'avif',
            isExternal: extractStoragePath(settings.heroimageurl) === null,
            storagePath: extractStoragePath(settings.heroimageurl),
            createdAt: new Date().toISOString(),
          });
        }
        if (settings.aboutusphoto) {
          const format = detectFormat(settings.aboutusphoto);
          assets.push({
            id: `${id}_aboutusphoto`,
            assetType: 'store_settings',
            targetField: 'aboutusphoto',
            productId: null,
            productName: 'About Us Photo',
            sku: 'SETTINGS',
            isPrimary: true,
            sortOrder: 2,
            url: settings.aboutusphoto,
            format,
            isAvif: format === 'avif',
            isExternal: extractStoragePath(settings.aboutusphoto) === null,
            storagePath: extractStoragePath(settings.aboutusphoto),
            createdAt: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      logger.warn('Could not fetch store_settings images:', err);
    }

    // 3. Compute overall stats before filtering
    const total = assets.length;
    const needsOptimisation = assets.filter(a => !a.isAvif).length;
    const alreadyAvif = assets.filter(a => a.isAvif).length;
    const externalCount = assets.filter(a => a.isExternal).length;

    // 4. Apply Filters
    let filteredAssets = assets;

    if (filter === 'needs_optimisation') {
      filteredAssets = filteredAssets.filter(a => !a.isAvif);
    } else if (filter === 'avif') {
      filteredAssets = filteredAssets.filter(a => a.isAvif);
    } else if (filter === 'external') {
      filteredAssets = filteredAssets.filter(a => a.isExternal);
    }

    // 5. Apply Search
    if (search) {
      filteredAssets = filteredAssets.filter(a => {
        const nameMatch = a.productName.toLowerCase().includes(search);
        const skuMatch = a.sku?.toLowerCase().includes(search) || false;
        const urlMatch = a.url.toLowerCase().includes(search);
        return nameMatch || skuMatch || urlMatch;
      });
    }

    return apiSuccessResponse({
      assets: filteredAssets,
      stats: {
        total,
        needsOptimisation,
        alreadyAvif,
        externalCount,
      },
    });
  } catch (error) {
    logger.error('Unexpected error in database-assets route:', error);
    return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
  }
}
