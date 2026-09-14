import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import * as xlsx from 'xlsx';
import templateJson from '@/lib/google-merchant-template.json';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mb-paws.co.uk';

function stripHtml(text: string): string {
  if (!text) return '';
  return text.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
}

export async function GET() {
  try {
    const supabase = createServerClient();

    // 1. Fetch all active products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        productid,
        name,
        description,
        sku,
        isdisabled,
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
      return new NextResponse(`Database error: ${productsError.message}`, { status: 500 });
    }

    // 2. Fetch property values for variant colours and sizes
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

    // 3. Transform products into Google Merchant Center rows
    const dataRows: any[][] = [];

    (products || []).forEach((product: any) => {
      const variants = (product.product_variants || []).filter((v: any) => v.isvisible !== false);
      const images = (product.product_images || []).sort(
        (a: any, b: any) => (b.isprimary ? 1 : 0) - (a.isprimary ? 1 : 0) || a.sortorder - b.sortorder
      );

      const mainImage = images[0]?.imageurl || `${SITE_URL}/og-image.jpg`;
      const additionalImages = images.slice(1, 10).map((img: any) => img.imageurl).join(',');

      const nameParts = product.name?.split(' ') || [];
      const brand = nameParts[0] || 'MB-Paws';
      const cleanDesc = stripHtml(product.description || product.name);
      const productLink = `${SITE_URL}/products/${product.productid}`;
      const baseGroupId = product.sku || product.productid;

      if (variants.length > 0) {
        variants.forEach((v: any) => {
          const priceNum = Number(v.price) || 19.99;
          const promoNum = v.promotional_price ? Number(v.promotional_price) : null;
          const inStock = v.trackquantity === false || Number(v.quantity) > 0;
          const availability = inStock ? 'in_stock' : 'out_of_stock';
          const variantProps = variantPropsMap[v.productvariantid] || {};

          // 40 columns matching templateJson.headers
          const row = [
            v.sku || v.productvariantid,                                // id
            product.name,                                               // title
            cleanDesc || product.name,                                  // description
            availability,                                               // availability
            '',                                                         // availability_date
            '',                                                         // expiration_date
            productLink,                                                // link
            '',                                                         // mobile_link
            mainImage,                                                  // image_link
            `${priceNum.toFixed(2)} GBP`,                               // price
            promoNum ? `${promoNum.toFixed(2)} GBP` : '',               // sale_price
            '',                                                         // sale_price_effective_date
            'no',                                                       // identifier_exists
            '',                                                         // gtin
            v.sku || '',                                                // mpn
            brand,                                                      // brand
            '',                                                         // product_highlight
            '',                                                         // product_detail
            additionalImages,                                           // additional_image_link
            'new',                                                      // condition
            'no',                                                       // adult
            variantProps.color || '',                                   // color
            variantProps.size || '',                                    // size
            'regular',                                                  // size_type
            'UK',                                                       // size_system
            'unisex',                                                   // gender
            variantProps.material || '',                                // material
            '',                                                         // pattern
            'adult',                                                    // age_group
            '',                                                         // multipack
            'no',                                                       // is bundle
            '',                                                         // unit_pricing_measure
            '',                                                         // unit_pricing_base_measure
            '',                                                         // energy_efficiency_class
            '',                                                         // min_energy_efficiency_class
            '',                                                         // max_energy_efficiency
            baseGroupId,                                                // item_group_id
            '',                                                         // video_link
            '',                                                         // virtual_model_link
            ''                                                          // cost_of_goods_sold
          ];
          dataRows.push(row);
        });
      } else {
        // Fallback for product without variants
        const row = [
          product.sku || product.productid,
          product.name,
          cleanDesc || product.name,
          'in_stock',
          '',
          '',
          productLink,
          '',
          mainImage,
          '19.99 GBP',
          '',
          '',
          'no',
          '',
          product.sku || '',
          brand,
          '',
          '',
          additionalImages,
          'new',
          'no',
          '',
          '',
          'regular',
          'UK',
          'unisex',
          '',
          '',
          'adult',
          '',
          'no',
          '',
          '',
          '',
          '',
          '',
          baseGroupId,
          '',
          '',
          ''
        ];
        dataRows.push(row);
      }
    });

    // 4. Construct Excel workbook matching Google Merchant template
    const wb = xlsx.utils.book_new();
    const sheetData = [
      templateJson.headers,
      templateJson.descriptions,
      ...dataRows
    ];

    const ws = xlsx.utils.aoa_to_sheet(sheetData);

    // Set reasonable column widths
    const colWidths = templateJson.headers.map((h) => {
      if (h === 'description' || h === 'title') return { wch: 40 };
      if (h === 'link' || h === 'image_link' || h === 'additional_image_link') return { wch: 35 };
      return { wch: 18 };
    });
    ws['!cols'] = colWidths;

    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');

    const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `Google_Merchant_Center_Feed_MB_Paws_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    return new NextResponse(`Internal Server Error: ${error?.message || error}`, { status: 500 });
  }
}
