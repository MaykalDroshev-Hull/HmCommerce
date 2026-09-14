import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mb-paws.co.uk';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  try {
    const supabase = createServerClient();

    // Fetch active products with their primary images and variants
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        productid,
        name,
        description,
        sku,
        updatedat,
        product_variants (
          productvariantid,
          sku,
          price,
          compare_at_price,
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
      .eq('isdisabled', false)
      .order('updatedat', { ascending: false });

    if (error) {
      return new NextResponse(`Error fetching products: ${error.message}`, { status: 500 });
    }

    const itemsXml: string[] = [];

    (products || []).forEach((product: any) => {
      const variants = (product.product_variants || []).filter((v: any) => v.isvisible !== false);
      const images = (product.product_images || []).sort(
        (a: any, b: any) => (b.isprimary ? 1 : 0) - (a.isprimary ? 1 : 0) || a.sortorder - b.sortorder
      );

      const mainImage = images[0]?.imageurl || `${SITE_URL}/og-image.jpg`;
      const additionalImages = images.slice(1, 10).map((img: any) => img.imageurl);

      const nameParts = product.name?.split(' ') || [];
      const brand = nameParts[0] || 'MB-Paws';
      const cleanDesc = (product.description || product.name || '')
        .replace(/<[^>]*>?/gm, '') // Strip any HTML tags
        .trim();

      // If variants exist, output each variant item or the primary product item
      if (variants.length > 0) {
        variants.forEach((variant: any) => {
          const priceNum = Number(variant.price);
          if (isNaN(priceNum) || priceNum <= 0) return;

          const inStock = variant.trackquantity === false || Number(variant.quantity) > 0;
          const availability = inStock ? 'in_stock' : 'out_of_stock';
          const link = `${SITE_URL}/products/${product.productid}`;
          const itemId = variant.sku || variant.productvariantid || product.productid;

          itemsXml.push(`
    <item>
      <g:id>${escapeXml(String(itemId))}</g:id>
      <g:item_group_id>${escapeXml(String(product.productid))}</g:item_group_id>
      <g:title>${escapeXml(product.name)}</g:title>
      <g:description>${escapeXml(cleanDesc || product.name)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(mainImage)}</g:image_link>
      ${additionalImages.map((img: string) => `<g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`).join('\n      ')}
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${priceNum.toFixed(2)} GBP</g:price>
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:identifier_exists>no</g:identifier_exists>
      <g:shipping>
        <g:country>GB</g:country>
        <g:service>Standard UK Tracked Delivery</g:service>
        <g:price>0.00 GBP</g:price>
      </g:shipping>
    </item>`);
        });
      } else {
        const link = `${SITE_URL}/products/${product.productid}`;
        itemsXml.push(`
    <item>
      <g:id>${escapeXml(String(product.sku || product.productid))}</g:id>
      <g:title>${escapeXml(product.name)}</g:title>
      <g:description>${escapeXml(cleanDesc || product.name)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(mainImage)}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>in_stock</g:availability>
      <g:price>19.99 GBP</g:price>
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:identifier_exists>no</g:identifier_exists>
      <g:shipping>
        <g:country>GB</g:country>
        <g:service>Standard UK Tracked Delivery</g:service>
        <g:price>0.00 GBP</g:price>
      </g:shipping>
    </item>`);
      }
    });

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>MB-Paws Google Shopping Feed</title>
    <link>${SITE_URL}</link>
    <description>Premium Pet Gear and Dog Accessories</description>
${itemsXml.join('\n')}
  </channel>
</rss>`;

    return new NextResponse(rssXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    return new NextResponse(`Internal Error: ${error?.message || error}`, { status: 500 });
  }
}
