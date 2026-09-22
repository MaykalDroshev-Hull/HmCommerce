export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getVariantEffectivePrice } from '@/lib/product-promo';
import { logger } from '@/lib/logger';
import SftpClient from 'ssh2-sftp-client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mb-paws.co.uk';

// The filename must exactly match what you configure in Google Merchant Center
const FEED_FILENAME = 'mb-paws-feed.txt';

function stripHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\n/g, ' ')           // escaped newlines from DB
    .replace(/<[^>]*>?/gm, '')      // strip HTML tags
    .replace(/&amp;/gi, '&')        // decode common HTML entities
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')           // collapse whitespace
    .trim();
}

function escapeTab(value: string): string {
  // TSV values must not contain tabs or newlines
  return (value || '').replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '');
}

export async function POST() {
  try {
    const host = process.env.GOOGLE_MERCHANT_SFTP_HOST;
    const port = Number(process.env.GOOGLE_MERCHANT_SFTP_PORT);
    const username = process.env.GOOGLE_MERCHANT_SFTP_USERNAME;
    const password = process.env.GOOGLE_MERCHANT_SFTP_PASSWORD;

    if (!host || !port || !username || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing SFTP credentials in environment variables.' },
        { status: 500 }
      );
    }

    // 1. Generate the feed data
    const supabase = createServerClient();

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        productid,
        name,
        description,
        sku,
        isdisabled,
        promodiscountpercent,
        updatedat,
        product_variants (
          productvariantid,
          sku,
          price,
          compare_at_price,
          promotional_price,
          quantity,
          trackquantity,
          isvisible
        ),
        product_images (
          imageurl,
          isprimary,
          sortorder
        )
      `)
      .neq('isdeleted', true)
      .order('updatedat', { ascending: false });

    if (productsError) {
      logger.error('Google Merchant SFTP: DB error', productsError);
      return NextResponse.json(
        { success: false, error: `Database error: ${productsError.message}` },
        { status: 500 }
      );
    }

    // 2. Fetch variant property values (colour, size, material)
    const allVariantIds: string[] = [];
    (products || []).forEach((p: any) => {
      (p.product_variants || []).forEach((v: any) => {
        if (v.productvariantid) allVariantIds.push(v.productvariantid);
      });
    });

    const variantPropsMap: Record<string, { color?: string; size?: string; material?: string }> = {};

    if (allVariantIds.length > 0) {
      const { data: propValues } = await supabase
        .from('product_variant_property_values')
        .select(`
          productvariantid,
          value,
          properties (
            name
          )
        `)
        .in('productvariantid', allVariantIds);

      (propValues || []).forEach((pv: any) => {
        const vId = pv.productvariantid;
        const propName = (pv.properties?.name || '').toLowerCase();
        if (!variantPropsMap[vId]) variantPropsMap[vId] = {};

        if (propName.includes('colou') || propName.includes('color')) {
          variantPropsMap[vId].color = pv.value;
        } else if (propName.includes('size') || propName.includes('razmer')) {
          variantPropsMap[vId].size = pv.value;
        } else if (propName.includes('material') || propName.includes('fabric')) {
          variantPropsMap[vId].material = pv.value;
        }
      });
    }

    // 3. Build TSV rows
    const headers = [
      'id', 'title', 'description', 'availability', 'availability_date',
      'expiration_date', 'link', 'mobile_link', 'image_link', 'price',
      'sale_price', 'sale_price_effective_date', 'identifier_exists', 'gtin',
      'mpn', 'brand', 'product_highlight', 'product_detail',
      'additional_image_link', 'condition', 'adult', 'color', 'size',
      'size_type', 'size_system', 'gender', 'material', 'pattern',
      'age_group', 'multipack', 'is_bundle', 'unit_pricing_measure',
      'unit_pricing_base_measure', 'energy_efficiency_class',
      'min_energy_efficiency_class', 'max_energy_efficiency_class',
      'item_group_id', 'video_link', 'virtual_model_link', 'cost_of_goods_sold'
    ];

    const dataRows: string[][] = [];
    let totalVariants = 0;
    let inStockCount = 0;

    (products || []).forEach((product: any) => {
      const variants = (product.product_variants || []).filter((v: any) => v.isvisible !== false);
      const images = (product.product_images || []).sort(
        (a: any, b: any) => (b.isprimary ? 1 : 0) - (a.isprimary ? 1 : 0) || a.sortorder - b.sortorder
      );

      const mainImage = images[0]?.imageurl || `${SITE_URL}/og-image.jpg`;
      const additionalImages = images.slice(1, 10).map((img: any) => img.imageurl).join(',');

      const brand = 'MB-Paws';
      const cleanDesc = stripHtml(product.description || product.name);
      const productLink = `${SITE_URL}/products/${product.productid}`;
      const baseGroupId = product.sku || product.productid;

      if (variants.length > 0) {
        variants.forEach((v: any) => {
          const pricing = getVariantEffectivePrice(v, product);
          const inStock = v.trackquantity === false || Number(v.quantity) > 0;
          const availability = inStock ? 'in_stock' : 'out_of_stock';
          const variantProps = variantPropsMap[v.productvariantid] || {};
          const originalPriceStr = `${pricing.original.toFixed(2)} GBP`;
          const salePriceStr = pricing.promoActive && pricing.sale < pricing.original
            ? `${pricing.sale.toFixed(2)} GBP`
            : '';

          totalVariants++;
          if (inStock) inStockCount++;

          const row = [
            v.sku || v.productvariantid,
            product.name,
            cleanDesc || product.name,
            availability,
            '', // availability_date
            '', // expiration_date
            productLink,
            '', // mobile_link
            mainImage,
            originalPriceStr,
            salePriceStr,
            '', // sale_price_effective_date
            'no', // identifier_exists
            '', // gtin
            v.sku || '', // mpn
            brand,
            '', // product_highlight
            '', // product_detail
            additionalImages,
            'new', // condition
            'no', // adult
            variantProps.color || '',
            variantProps.size || '',
            'regular', // size_type
            'UK', // size_system
            'unisex', // gender
            variantProps.material || '',
            '', // pattern
            'adult', // age_group
            '', // multipack
            'no', // is_bundle
            '', // unit_pricing_measure
            '', // unit_pricing_base_measure
            '', // energy_efficiency_class
            '', // min_energy_efficiency_class
            '', // max_energy_efficiency_class
            baseGroupId, // item_group_id
            '', // video_link
            '', // virtual_model_link
            ''  // cost_of_goods_sold
          ];
          dataRows.push(row);
        });
      } else {
        totalVariants++;
        inStockCount++;
        const row = [
          product.sku || product.productid,
          product.name,
          cleanDesc || product.name,
          'in_stock',
          '', '', productLink, '', mainImage,
          '19.99 GBP', '', '', 'no', '', product.sku || '', brand,
          '', '', additionalImages, 'new', 'no',
          '', '', 'regular', 'UK', 'unisex', '', '', 'adult',
          '', 'no', '', '', '', '', '', baseGroupId, '', '', ''
        ];
        dataRows.push(row);
      }
    });

    // 4. Construct TSV content
    const tsvLines = [
      headers.map(escapeTab).join('\t'),
      ...dataRows.map(row => row.map(escapeTab).join('\t'))
    ];
    const tsvContent = tsvLines.join('\n');
    const tsvBuffer = Buffer.from(tsvContent, 'utf-8');

    logger.info(`Google Merchant SFTP: Generated feed with ${dataRows.length} rows (${tsvBuffer.length} bytes)`);

    // 5. Upload via SFTP
    const sftp = new SftpClient();

    try {
      await sftp.connect({
        host,
        port,
        username,
        password,
        // Google's SFTP server fingerprint
        // SHA256: +0f4WhxwRkG/WX0UJV9o1GunRcTzFA9en76QzIVVOPY
        algorithms: {
          kex: [
            'ecdh-sha2-nistp256',
            'ecdh-sha2-nistp384',
            'ecdh-sha2-nistp521',
            'diffie-hellman-group14-sha256',
            'diffie-hellman-group-exchange-sha256',
            'diffie-hellman-group14-sha1',
            'diffie-hellman-group-exchange-sha1',
          ],
        },
        readyTimeout: 30000,
        retries: 2,
        retry_factor: 2,
        retry_minTimeout: 2000,
      });

      logger.info('Google Merchant SFTP: Connected to partnerupload.google.com');

      // Upload the feed file to the root directory
      await sftp.put(tsvBuffer, `/${FEED_FILENAME}`);

      logger.info(`Google Merchant SFTP: Successfully uploaded ${FEED_FILENAME}`);

      return NextResponse.json({
        success: true,
        message: `Feed uploaded successfully as "${FEED_FILENAME}"`,
        stats: {
          filename: FEED_FILENAME,
          totalProducts: (products || []).length,
          totalVariants,
          inStockVariants: inStockCount,
          outOfStockVariants: totalVariants - inStockCount,
          fileSizeBytes: tsvBuffer.length,
          uploadedAt: new Date().toISOString(),
        }
      });
    } catch (sftpError: any) {
      logger.error('Google Merchant SFTP: Upload failed', sftpError);
      return NextResponse.json(
        {
          success: false,
          error: `SFTP upload failed: ${sftpError.message || sftpError}`,
        },
        { status: 502 }
      );
    } finally {
      await sftp.end();
    }
  } catch (error: any) {
    logger.error('Google Merchant SFTP: Internal error', error);
    return NextResponse.json(
      { success: false, error: `Internal error: ${error.message || error}` },
      { status: 500 }
    );
  }
}
