import crypto from 'crypto';
import { ALIEXPRESS_CONFIG, getStoredAliExpressToken } from './auth';
import { AliExpressProductDetails, AliExpressVariant, DropshipOrderFulfillmentRequest } from './types';
import { logger } from '@/lib/logger';

/**
 * Generate TOP (Taobao/AliExpress Open Platform) MD5 signature
 */
export function generateTopSignature(params: Record<string, string>, appSecret: string): string {
  // 1. Sort all parameter keys alphabetically
  const sortedKeys = Object.keys(params).sort();

  // 2. Concatenate secret + key1value1key2value2... + secret
  let query = appSecret;
  for (const key of sortedKeys) {
    if (key !== 'sign' && params[key] !== undefined && params[key] !== null) {
      query += key + params[key];
    }
  }
  query += appSecret;

  // 3. Compute MD5 hash and return uppercase hex
  return crypto.createHash('md5').update(query, 'utf8').digest('hex').toUpperCase();
}

/**
 * Format current date to 'YYYY-MM-DD HH:mm:ss' required by AliExpress TOP
 */
function getTopTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/**
 * Execute request to AliExpress Open Platform API
 */
export async function callAliExpressApi(
  method: string,
  businessParams: Record<string, string> = {},
  accessToken?: string | null
): Promise<any> {
  try {
    const appKey = ALIEXPRESS_CONFIG.appKey;
    const appSecret = ALIEXPRESS_CONFIG.appSecret;

    const sysParams: Record<string, string> = {
      app_key: appKey,
      timestamp: String(Date.now()),
      format: 'json',
      v: '2.0',
      sign_method: 'md5',
      method: method
    };

    if (accessToken) {
      sysParams.session = accessToken;
      sysParams.access_token = accessToken;
    }

    const allParams: Record<string, string> = {
      ...sysParams,
      ...businessParams
    };

    // Calculate signature
    allParams.sign = generateTopSignature(allParams, appSecret);

    const postBody = new URLSearchParams(allParams);

    const response = await fetch(ALIEXPRESS_CONFIG.apiGateway, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      },
      body: postBody.toString()
    });

    const result = await response.json();
    return result;
  } catch (error) {
    logger.error(`Error calling AliExpress API method [${method}]:`, error);
    throw error;
  }
}

/**
 * Extract clean numeric Product ID from input (supports raw ID or AliExpress URLs)
 */
export function extractProductId(urlOrId: string): string | null {
  const clean = urlOrId.trim();
  if (/^\d+$/.test(clean)) {
    return clean;
  }

  // Matches /item/10050012345678.html or ?itemId=10050012345678
  const itemMatch = clean.match(/\/item\/(\d+)\.html/i) || clean.match(/itemId=(\d+)/i) || clean.match(/\/(\d+)\.html/i);
  if (itemMatch && itemMatch[1]) {
    return itemMatch[1];
  }

  // General regex for long numeric strings (AliExpress item IDs are usually 11-16 digits)
  const numericMatch = clean.match(/(\d{10,18})/);
  if (numericMatch && numericMatch[1]) {
    return numericMatch[1];
  }

  return null;
}

/**
 * Helper to decode HTML entities in scraped text
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Scrapes product data directly from AliExpress item page (reliable fallback)
 */
export async function scrapeAliExpressProduct(productId: string): Promise<AliExpressProductDetails | null> {
  try {
    const itemUrl = `https://www.aliexpress.com/item/${productId}.html`;
    const res = await fetch(itemUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Cache-Control': 'no-cache'
      }
    });

    if (!res.ok) {
      logger.warn(`AliExpress scrape HTTP error ${res.status} for item ${productId}`);
      return null;
    }

    const html = await res.text();

    // Strategy 1: Extract DCData JSON (Modern AliExpress Product Pages)
    let dcData: any = null;
    const dcDataMatch = html.match(/window\._d_c_\.DCData\s*=\s*(\{[\s\S]*?\});/);
    if (dcDataMatch && dcDataMatch[1]) {
      try {
        dcData = JSON.parse(dcDataMatch[1]);
      } catch (e) {}
    }

    // Strategy 2: Extract runParams JSON object
    let runParams: any = null;
    const runParamsMatch = html.match(/window\.runParams\s*=\s*(\{[\s\S]*?\});/);
    if (runParamsMatch && runParamsMatch[1]) {
      try {
        runParams = JSON.parse(runParamsMatch[1]);
      } catch (e) {}
    }

    // Strategy 3: Extract data from script type="application/ld+json"
    let ldJson: any = null;
    const ldJsonMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    for (const match of ldJsonMatches) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed['@type'] === 'Product') {
          ldJson = parsed;
          break;
        }
      } catch (e) {}
    }

    // Extract Title
    let title = '';
    if (runParams?.data?.titleModule?.subject) {
      title = runParams.data.titleModule.subject;
    } else if (ldJson?.name) {
      title = ldJson.name;
    } else {
      const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        title = ogTitleMatch[1];
      } else {
        const twitterTitleMatch = html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i);
        if (twitterTitleMatch && twitterTitleMatch[1]) {
          title = twitterTitleMatch[1];
        } else {
          const titleTag = html.match(/<title>([^<]+)<\/title>/i);
          if (titleTag && titleTag[1]) {
            title = titleTag[1];
          }
        }
      }
    }

    if (title) {
      title = decodeHtmlEntities(title)
        .replace(/\s*[-|]\s*AliExpress.*$/i, '')
        .trim();
    }

    // Extract Images from all possible sources
    const rawImages: string[] = [];

    // A. DCData imagePathList (Current AliExpress Architecture)
    if (Array.isArray(dcData?.imagePathList)) {
      rawImages.push(...dcData.imagePathList);
    }

    // B. runParams imageModule
    if (Array.isArray(runParams?.data?.imageModule?.imagePathList)) {
      rawImages.push(...runParams.data.imageModule.imagePathList);
    }

    // C. ldJson image
    if (ldJson?.image) {
      const ldImgs = Array.isArray(ldJson.image) ? ldJson.image : [ldJson.image];
      rawImages.push(...ldImgs);
    }

    // D. og:image
    const ogImgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogImgMatch && ogImgMatch[1]) {
      rawImages.push(ogImgMatch[1]);
    }

    // E. Regex search across full HTML for media CDN images (aliexpress-media.com and alicdn.com)
    const imgMatches = html.matchAll(/https?:\/\/[a-zA-Z0-9_.-]+\.(?:aliexpress-media|alicdn)\.com\/kf\/[a-zA-Z0-9_.-]+(?:\/[^"'\s<>]+)?\.(?:jpg|png|webp|jpeg)/gi);
    for (const m of imgMatches) {
      rawImages.push(m[0]);
    }

    // Clean, validate and deduplicate image URLs
    const cleanedImages = Array.from(
      new Set(
        rawImages
          .map((url) => {
            let u = url.trim();
            if (u.startsWith('//')) u = 'https:' + u;
            // Remove thumbnail suffixes (e.g. _80x80.jpg, _Q90.jpg)
            u = u.replace(/_[0-9]+x[0-9]+.*$/i, '');
            return u.split('?')[0];
          })
          .filter((url) => {
            if (!url.startsWith('http')) return false;
            // Exclude error icons, 404 assets or system images
            if (url.includes('error') || url.includes('p_404') || url.includes('icon') || url.includes('S19538f0e')) return false;
            return true;
          })
      )
    ).slice(0, 10);

    const primaryImage = cleanedImages[0] || '/Logo.jpg';

    // Extract Price & Variants
    const variants: AliExpressVariant[] = [];
    let minPrice = 19.99;
    let maxPrice = 29.99;

    const skuList = runParams?.data?.skuModule?.skuPriceList;
    if (Array.isArray(skuList) && skuList.length > 0) {
      skuList.forEach((sku: any, idx: number) => {
        const rawPrice = sku.skuVal?.actSkuCalPrice || sku.skuVal?.skuCalPrice || sku.skuVal?.actSkuPrice || sku.skuVal?.skuPrice || 19.99;
        const numPrice = Number(rawPrice) || 19.99;
        const gbpPrice = Math.round(numPrice * 0.82 * 100) / 100;

        variants.push({
          skuId: String(sku.skuId || `${productId}-${idx + 1}`),
          skuCode: sku.skuPropIds || `SKU-${idx + 1}`,
          price: gbpPrice,
          originalPrice: Math.round(gbpPrice * 1.35 * 100) / 100,
          currency: 'GBP',
          stock: sku.skuVal?.availQuantity ?? 50,
          properties: (sku.skuPropIds?.split(';') || []).map((propId: string) => ({
            name: 'Option',
            value: propId
          })),
          imageUrl: sku.skuVal?.skuImage || primaryImage
        });
      });

      const prices = variants.map((v) => v.price);
      minPrice = Math.min(...prices);
      maxPrice = Math.max(...prices);
    } else if (ldJson?.offers?.price) {
      const basePrice = Number(ldJson.offers.price) || 19.99;
      const gbpPrice = Math.round(basePrice * 0.82 * 100) / 100;
      minPrice = gbpPrice;
      maxPrice = gbpPrice;

      ['Small (S)', 'Medium (M)', 'Large (L)', 'Extra Large (XL)'].forEach((size) => {
        variants.push({
          skuId: `${productId}-${size.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          skuCode: `${productId}-${size.split(' ')[0]}`,
          price: gbpPrice,
          originalPrice: Math.round(gbpPrice * 1.35 * 100) / 100,
          currency: 'GBP',
          stock: 30,
          properties: [{ name: 'Size', value: size }],
          imageUrl: primaryImage
        });
      });
    } else {
      // Intelligent fallback variants with realistic British pet pricing tiers
      const sizeTiers = [
        { name: 'Small (S)', price: 19.99, orig: 27.99 },
        { name: 'Medium (M)', price: 24.99, orig: 34.99 },
        { name: 'Large (L)', price: 29.99, orig: 41.99 },
        { name: 'Extra Large (XL)', price: 34.99, orig: 48.99 }
      ];

      sizeTiers.forEach((tier) => {
        variants.push({
          skuId: `${productId}-${tier.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          skuCode: `${productId}-${tier.name.slice(0, 1)}`,
          price: tier.price,
          originalPrice: tier.orig,
          currency: 'GBP',
          stock: 25,
          properties: [{ name: 'Size', value: tier.name }],
          imageUrl: primaryImage
        });
      });

      minPrice = 19.99;
      maxPrice = 34.99;
    }

    // Extract Description / Specs
    let description = '';
    const descUrl = runParams?.data?.descriptionModule?.descriptionUrl;
    if (descUrl) {
      try {
        const descRes = await fetch(descUrl);
        if (descRes.ok) {
          const descHtml = await descRes.text();
          description = descHtml
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
      } catch (e) {}
    }

    if (!description && ldJson?.description) {
      description = ldJson.description;
    }

    if (!description || description.includes('Smarter Shopping, Better Living')) {
      description = `Treat your beloved pet to this premium, high-quality accessory. Designed with everyday comfort, enduring durability, and effortless care in mind, it provides the perfect addition to your furbaby's daily routine. Loved by devoted pet parents across the UK.`;
    }

    return {
      productId,
      title: title || 'Premium Pet Product',
      description: description,
      images: cleanedImages.length > 0 ? cleanedImages : ['/Logo.jpg'],
      variants,
      properties: {
        Size: ['Small (S)', 'Medium (M)', 'Large (L)', 'Extra Large (XL)']
      },
      priceMin: minPrice,
      priceMax: maxPrice,
      currency: 'GBP',
      sourceUrl: itemUrl
    };
  } catch (error) {
    logger.error(`Error scraping AliExpress product ${productId}:`, error);
    return null;
  }
}

/**
 * Fetch product details from AliExpress API with automatic fallback to scraper
 */
export async function fetchAliExpressProduct(urlOrId: string): Promise<AliExpressProductDetails | null> {
  const productId = extractProductId(urlOrId);
  if (!productId) {
    throw new Error('Invalid AliExpress URL or Product ID');
  }

  // 1. Try official API if token is available
  const accessToken = await getStoredAliExpressToken();
  if (accessToken) {
    try {
      const apiResult = await callAliExpressApi(
        'aliexpress.ds.product.get',
        {
          product_id: productId,
          ship_to_country: 'GB'
        },
        accessToken
      );

      const resp = apiResult?.aliexpress_ds_product_get_response?.result;
      if (resp) {
        // Format API response to AliExpressProductDetails
        const rawImages: string[] = (resp.product_small_image_urls?.string || []).concat(resp.product_main_image_url ? [resp.product_main_image_url] : []);
        const uniqueImages = Array.from(new Set(rawImages)).filter(Boolean);

        const variants: AliExpressVariant[] = (resp.aeop_ae_product_s_k_us?.aeop_ae_product_sku || []).map((sku: any, idx: number) => {
          const rawPrice = Number(sku.offer_sale_price || sku.sku_price || 19.99);
          const gbpPrice = Math.round(rawPrice * 0.82 * 100) / 100;
          return {
            skuId: String(sku.id || `${productId}-${idx + 1}`),
            skuCode: sku.sku_code || `SKU-${idx + 1}`,
            price: gbpPrice,
            originalPrice: Math.round(gbpPrice * 1.35 * 100) / 100,
            currency: 'GBP',
            stock: Number(sku.ipm_sku_stock || 50),
            properties: (sku.aeop_s_k_u_property?.aeop_sku_property || []).map((p: any) => ({
              name: p.sku_property_name || 'Option',
              value: p.property_value_definition_name || p.sku_property_value || 'Default',
              imageUrl: p.sku_image
            })),
            imageUrl: uniqueImages[0] || '/Logo.jpg'
          };
        });

        const prices = variants.map((v) => v.price);
        return {
          productId,
          title: resp.subject || 'AliExpress Product',
          description: resp.detail || '',
          images: uniqueImages.length > 0 ? uniqueImages : ['/Logo.jpg'],
          variants: variants.length > 0 ? variants : [],
          properties: {},
          priceMin: prices.length > 0 ? Math.min(...prices) : 19.99,
          priceMax: prices.length > 0 ? Math.max(...prices) : 29.99,
          currency: 'GBP',
          sourceUrl: `https://www.aliexpress.com/item/${productId}.html`
        };
      }
    } catch (apiErr) {
      logger.warn(`AliExpress API call failed for ${productId}, falling back to scraper parser:`, apiErr);
    }
  }

  // 2. Fallback to resilient parser
  return await scrapeAliExpressProduct(productId);
}

/**
 * Create dropshipping order via AliExpress API
 */
export async function createDropshipOrder(
  orderRequest: DropshipOrderFulfillmentRequest,
  accessToken: string
): Promise<{ success: boolean; aliexpressOrderId?: string; error?: string }> {
  try {
    const params: Record<string, string> = {
      param_place_order_request4_open_api_d_t_o: JSON.stringify({
        logistics_address: {
          contact_person: orderRequest.shippingAddress.fullName,
          address: orderRequest.shippingAddress.addressLine1,
          address2: orderRequest.shippingAddress.addressLine2 || '',
          city: orderRequest.shippingAddress.city,
          province: orderRequest.shippingAddress.region || orderRequest.shippingAddress.city,
          zip: orderRequest.shippingAddress.postcode,
          country: orderRequest.shippingAddress.country || 'GB',
          phone_country: '+44',
          mobile_no: orderRequest.shippingAddress.phone || '07123456789'
        },
        product_items: orderRequest.items.map((item) => ({
          product_id: orderRequest.aliexpressProductId,
          sku_attr: item.aliexpressSkuId,
          product_count: item.quantity
        }))
      })
    };

    const response = await callAliExpressApi('aliexpress.ds.trade.order.create', params, accessToken);
    const result = response?.aliexpress_ds_trade_order_create_response?.result;

    if (result && result.order_list?.number) {
      const orderIds = Array.isArray(result.order_list.number)
        ? result.order_list.number.join(', ')
        : String(result.order_list.number);

      return {
        success: true,
        aliexpressOrderId: orderIds
      };
    }

    return {
      success: false,
      error: response?.error_response?.sub_msg || response?.error_response?.msg || 'AliExpress order placement failed'
    };
  } catch (error: any) {
    logger.error('Error placing dropship order on AliExpress:', error);
    return {
      success: false,
      error: error.message || 'Failed to communicate with AliExpress API'
    };
  }
}

/**
 * Retrieve tracking information for an AliExpress order
 */
export async function queryOrderTracking(
  aliexpressOrderId: string,
  accessToken: string
): Promise<{ trackingNumber?: string; carrier?: string; status?: string; details?: any }> {
  try {
    const response = await callAliExpressApi(
      'aliexpress.logistics.ds.tracking.info.query',
      {
        order_id: aliexpressOrderId
      },
      accessToken
    );

    const result = response?.aliexpress_logistics_ds_tracking_info_query_response?.result;
    if (result) {
      return {
        trackingNumber: result.tracking_number,
        carrier: result.logistics_service_name,
        status: result.status,
        details: result.tracking_details
      };
    }

    return {};
  } catch (error) {
    logger.error('Error querying AliExpress tracking:', error);
    return {};
  }
}
