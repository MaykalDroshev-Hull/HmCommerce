import crypto from 'crypto';
import { ALIEXPRESS_CONFIG, getStoredAliExpressToken } from './auth';
import { AliExpressProductDetails, AliExpressVariant, DropshipOrderFulfillmentRequest } from './types';
import { logger } from '@/lib/logger';
import { getGeminiApiKey } from '@/lib/gemini/copywriter';

/**
 * Generate TOP (Taobao/AliExpress Open Platform) HMAC-SHA256 signature
 */
export function generateTopSignature(params: Record<string, any>, appSecret: string): string {
  const p = { ...params };
  let basestring = '';
  if (typeof p.method === 'string' && p.method.includes('/')) {
    basestring = p.method;
    delete p.method;
  }
  basestring += Object.entries(p)
    .filter(([k, v]) => v != null && k !== 'sign')
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((acc, [k, v]) => acc + k + String(v), '');

  return crypto.createHmac('sha256', appSecret).update(basestring).digest('hex').toUpperCase();
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
      sign_method: 'sha256',
      method: method
    };

    if (accessToken) {
      sysParams.session = accessToken;
    }

    const allParams: Record<string, string> = {
      ...sysParams,
      ...businessParams
    };

    // Calculate signature
    allParams.sign = generateTopSignature(allParams, appSecret);

    const baseUrl = method.includes('/')
      ? 'https://api-sg.aliexpress.com/rest'
      : 'https://api-sg.aliexpress.com/sync';

    const url = `${baseUrl}?${new URLSearchParams(allParams).toString()}`;

    const response = await fetch(url, {
      method: 'POST'
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
  if (/^\d{8,18}$/.test(clean)) {
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
 * Asynchronously resolves AliExpress inputs (numeric IDs, desktop URLs, or mobile/short links like a.aliexpress.com/_...)
 * to a canonical numeric Product ID and resolved product URL.
 */
export async function resolveAliExpressProductId(urlOrId: string): Promise<{ productId: string; resolvedUrl: string }> {
  const clean = urlOrId.trim();
  if (!clean) {
    throw new Error('Please enter a valid AliExpress Product URL or Product ID');
  }

  // 1. Synchronous check: if numeric ID or standard desktop link
  const directId = extractProductId(clean);
  if (directId) {
    return {
      productId: directId,
      resolvedUrl: /^\d+$/.test(clean) ? `https://www.aliexpress.com/item/${directId}.html` : clean
    };
  }

  // 2. Extract URL from potential pasted mobile share text (e.g. "Look what I found on AliExpress: £6.40 https://a.aliexpress.com/_...")
  const urlMatch = clean.match(/https?:\/\/[^\s]+|(?:[a-zA-Z0-9-]+\.)?aliexpress\.com\/[^\s]+/i);
  let currentUrl = urlMatch ? urlMatch[0] : clean;
  if (!/^https?:\/\//i.test(currentUrl)) {
    currentUrl = 'https://' + currentUrl;
  }

  // Follow redirect chain for mobile/shortened links (up to 5 hops)
  for (let hop = 0; hop < 5; hop++) {
    // Check if query params contain redirectUrl, dl_target_url, or itemId
    try {
      const parsed = new URL(currentUrl);
      const redirectParam = parsed.searchParams.get('redirectUrl') || parsed.searchParams.get('dl_target_url');
      if (redirectParam) {
        const nestedId = extractProductId(redirectParam);
        if (nestedId) {
          return { productId: nestedId, resolvedUrl: redirectParam };
        }
      }
      const itemIdParam = parsed.searchParams.get('itemId');
      if (itemIdParam && /^\d+$/.test(itemIdParam)) {
        return { productId: itemIdParam, resolvedUrl: currentUrl };
      }
    } catch {}

    const directHopId = extractProductId(currentUrl);
    if (directHopId) {
      return { productId: directHopId, resolvedUrl: currentUrl };
    }

    try {
      const res = await fetch(currentUrl, {
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9'
        }
      });

      const location = res.headers.get('location');
      if (location) {
        // Detect expired or dead link redirect
        if (location.includes('best.aliexpress.com') || location.includes('/p/error/404.html')) {
          throw new Error('This AliExpress mobile link appears to have expired or the item is no longer available on AliExpress.');
        }

        const locId = extractProductId(location);
        if (locId) {
          return { productId: locId, resolvedUrl: location };
        }

        const locUrl = new URL(location, currentUrl);
        const redirectParam = locUrl.searchParams.get('redirectUrl') || locUrl.searchParams.get('dl_target_url');
        if (redirectParam) {
          const nestedId = extractProductId(redirectParam);
          if (nestedId) {
            return { productId: nestedId, resolvedUrl: redirectParam };
          }
        }
        currentUrl = locUrl.href;
      } else {
        // Reached terminal 200 response
        if (currentUrl.includes('best.aliexpress.com') || currentUrl.includes('/p/error/404.html')) {
          throw new Error('This AliExpress mobile link appears to have expired or the item is no longer available on AliExpress.');
        }

        const html = await res.text();
        const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
        if (canonicalMatch && canonicalMatch[1]) {
          const canId = extractProductId(canonicalMatch[1]);
          if (canId) {
            return { productId: canId, resolvedUrl: canonicalMatch[1] };
          }
        }
        break;
      }
    } catch (fetchErr: any) {
      if (fetchErr.message && fetchErr.message.includes('expired')) {
        throw fetchErr;
      }
      logger.warn(`Error resolving AliExpress redirect for ${currentUrl}:`, fetchErr);
      break;
    }
  }

  throw new Error('Could not identify a valid AliExpress Product ID from this link. Please verify the URL or try using the desktop link.');
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
 * Cleanly extracts standard size codes (e.g. "XS", "S", "M", "L", "XL", "XXL") from descriptive option strings
 */
export function extractCleanSizeCode(val: string): string {
  if (!val) return '';
  const sizeMatch = val.match(/\b(XXS|XS|S|M|L|XL|XXL|2XL|3XL|4XL|5XL)\b/i);
  if (sizeMatch) return sizeMatch[1].toUpperCase();

  const parenMatch = val.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const inside = parenMatch[1].trim();
    const insideMatch = inside.match(/\b(XXS|XS|S|M|L|XL|XXL|2XL|3XL|4XL|5XL)\b/i);
    if (insideMatch) return insideMatch[1].toUpperCase();
    return inside.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
  }

  const clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return clean.slice(0, 6);
}

/**
 * Generate a clean, descriptive, and unique SKU code incorporating product ID, colour, and size
 */
export function generateVariantSku(productId: string, variantName: string, index?: number): string {
  if (!variantName || typeof variantName !== 'string') {
    return `${productId}-VAR-${(index || 0) + 1}`;
  }

  // Split on '/', '|', ',', or spaced dash ' - ' to separate attributes like "Color / Size"
  const parts = variantName
    .split(/\s*[\/|,]\s*|\s+-\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const formattedParts: string[] = [];

  for (const part of parts) {
    const sizeMatch = part.match(/\b(XXS|XS|S|M|L|XL|XXL|2XL|3XL|4XL|5XL)\b/i);
    let token = '';

    if (sizeMatch) {
      token = sizeMatch[1].toUpperCase();
    } else {
      const parenMatch = part.match(/\(([^)]+)\)/);
      const beforeParen = part.replace(/\([^)]+\)/, '').trim();
      const cleanBefore = beforeParen.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

      if (cleanBefore.length > 0 && cleanBefore.length <= 10) {
        token = cleanBefore;
      } else if (parenMatch) {
        token = parenMatch[1].replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
      } else {
        token = cleanBefore.slice(0, 6);
      }
    }

    if (token) {
      formattedParts.push(token);
    }
  }

  const suffix = formattedParts.join('-');
  const fallback = index !== undefined ? `VAR-${index + 1}` : 'VAR';
  return `${productId}-${suffix || fallback}`.toUpperCase();
}

/**
 * Ensures all variants in a list have unique SKU codes, appending a differentiator if collisions exist
 */
export function ensureUniqueVariantSkus(variants: AliExpressVariant[]): AliExpressVariant[] {
  const seen = new Set<string>();
  return variants.map((v, idx) => {
    let sku = (v.skuCode || `${v.skuId || 'SKU'}-${idx + 1}`).trim().toUpperCase();
    if (seen.has(sku)) {
      let counter = 2;
      while (seen.has(`${sku}-${counter}`)) {
        counter++;
      }
      sku = `${sku}-${counter}`;
    }
    seen.add(sku);
    return {
      ...v,
      skuCode: sku
    };
  });
}

/**
 * Fetch live real-time pricing, compare-at discounts, and available variant sizes for an AliExpress item using Gemini Search Grounding
 */
export async function fetchLiveAliExpressPricingWithGemini(
  productId: string,
  title?: string
): Promise<{
  price: number;
  originalPrice?: number;
  currency: string;
  colours: string[];
  sizes: string[];
  outOfStockSizes: string[];
  variants: Array<{ colour?: string; size?: string; name: string; price: number; inStock?: boolean; stock?: number }>;
} | null> {
  try {
    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
      logger.warn('Gemini API key not configured, skipping live search pricing lookup.');
      return null;
    }

    const prompt = `Find the current live discounted UK sale price (in GBP £), compare-at price, all colours, and all sizes/options for AliExpress product ID ${productId}.
AliExpress URL: https://www.aliexpress.com/item/${productId}.html
${title ? `Product Title: ${title}` : ''}

CRITICAL RULES FOR SIZES AND INVENTORY AVAILABILITY:
1. Extract ALL sizes that this product is manufactured in, from the option buttons AND the sizing table (e.g. "XS", "S", "M", "L", "XL", "XXL", etc.).
2. ACCURATELY IDENTIFY OUT-OF-STOCK OR MISSING SIZES:
   - Check the product option buttons on AliExpress to see which sizes are CURRENTLY SELECTABLE / IN STOCK vs which sizes are OUT OF STOCK / DASHED / GREYED OUT / CROSSED OUT / MISSING (for example, if XS and XL have dashed borders or cannot be purchased).
   - In "outOfStockSizes", list all sizes that are out of stock, greyed out, or unselectable on AliExpress (e.g. ["XS", "XL"]).
   - For every variant in "variants", set:
     - "inStock": true and "stock": 35 (if selectable and available)
     - "inStock": false and "stock": 0 (if out of stock, greyed out, dashed, or missing)
3. Include ALL manufactured sizes in the "variants" list (even if out of stock, include them with inStock: false and stock: 0) so the store can add them as disabled/sold out.
4. Output strictly valid JSON ONLY, with NO markdown formatting, NO backticks:
{
  "price": number,
  "originalPrice": number,
  "currency": "GBP",
  "colours": string[],
  "sizes": string[],
  "outOfStockSizes": string[],
  "variants": [
    {
      "colour": string,
      "size": string,
      "name": string,
      "price": number,
      "inStock": boolean,
      "stock": number
    }
  ]
}`;

    const modelsToTry = ['gemini-3.6-flash', 'gemini-2.5-flash'];
    let rawText: string | null = null;

    for (const model of modelsToTry) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }]
          })
        });

        if (res.ok) {
          const data = await res.json();
          rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
          if (rawText) break;
        } else {
          logger.warn(`Gemini search pricing with model ${model} returned status ${res.status}`);
        }
      } catch (callErr) {
        logger.warn(`Gemini search call with model ${model} failed:`, callErr);
      }
    }

    if (!rawText) return null;

    const cleanedJson = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    const jsonMatch = cleanedJson.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.price || isNaN(Number(parsed.price)) || Number(parsed.price) <= 0) {
      return null;
    }

    const rawColours = Array.isArray(parsed.colours) ? parsed.colours.map(String).filter(Boolean) : [];
    const rawSizes = Array.isArray(parsed.sizes) ? parsed.sizes.map(String).filter(Boolean) : [];
    const outOfStockSizes = Array.isArray(parsed.outOfStockSizes)
      ? parsed.outOfStockSizes.map((s: any) => String(s).trim().toUpperCase())
      : [];

    let parsedVariants: Array<{ colour?: string; size?: string; name: string; price: number; inStock?: boolean; stock?: number }> = [];

    if (Array.isArray(parsed.variants) && parsed.variants.length > 0) {
      parsedVariants = parsed.variants.map((v: any) => {
        const sizeStr = v.size ? String(v.size) : undefined;
        const cleanSizeUpper = sizeStr ? sizeStr.trim().toUpperCase() : '';
        const isOos = v.inStock === false || v.stock === 0 || outOfStockSizes.includes(cleanSizeUpper);
        return {
          colour: v.colour ? String(v.colour) : undefined,
          size: sizeStr,
          name: String(v.name || (v.colour && v.size ? `${v.colour} / ${v.size}` : v.colour || v.size || 'Standard')),
          price: Number(v.price) || Number(parsed.price),
          inStock: !isOos,
          stock: isOos ? 0 : (typeof v.stock === 'number' && v.stock > 0 ? v.stock : 35)
        };
      });
    }

    // If colours and sizes exist but combinations weren't populated in variants array, generate Cartesian product
    if (parsedVariants.length === 0 && rawColours.length > 0 && rawSizes.length > 0) {
      rawColours.forEach((c: string) => {
        rawSizes.forEach((s: string) => {
          const cleanSizeUpper = s.trim().toUpperCase();
          const isOos = outOfStockSizes.includes(cleanSizeUpper);
          parsedVariants.push({
            colour: c,
            size: s,
            name: `${c} / ${s}`,
            price: Number(parsed.price),
            inStock: !isOos,
            stock: isOos ? 0 : 35
          });
        });
      });
    } else if (parsedVariants.length === 0 && rawColours.length > 0) {
      rawColours.forEach((c: string) => {
        parsedVariants.push({
          colour: c,
          name: c,
          price: Number(parsed.price),
          inStock: true,
          stock: 35
        });
      });
    } else if (parsedVariants.length === 0 && rawSizes.length > 0) {
      rawSizes.forEach((s: string) => {
        const cleanSizeUpper = s.trim().toUpperCase();
        const isOos = outOfStockSizes.includes(cleanSizeUpper);
        parsedVariants.push({
          size: s,
          name: s,
          price: Number(parsed.price),
          inStock: !isOos,
          stock: isOos ? 0 : 35
        });
      });
    }

    // If any size from rawSizes is missing from parsedVariants, add it as a variant with stock: 0!
    if (rawSizes.length > 0) {
      rawSizes.forEach((s: string) => {
        const cleanSizeUpper = s.trim().toUpperCase();
        const exists = parsedVariants.some((pv) => pv.size?.trim().toUpperCase() === cleanSizeUpper);
        if (!exists) {
          if (rawColours.length > 0) {
            rawColours.forEach((c: string) => {
              parsedVariants.push({
                colour: c,
                size: s,
                name: `${c} / ${s}`,
                price: Number(parsed.price),
                inStock: false,
                stock: 0
              });
            });
          } else {
            parsedVariants.push({
              size: s,
              name: s,
              price: Number(parsed.price),
              inStock: false,
              stock: 0
            });
          }
        }
      });
    }

    return {
      price: Math.round(Number(parsed.price) * 100) / 100,
      originalPrice: parsed.originalPrice && !isNaN(Number(parsed.originalPrice)) ? Math.round(Number(parsed.originalPrice) * 100) / 100 : undefined,
      currency: parsed.currency || 'GBP',
      colours: rawColours,
      sizes: rawSizes,
      outOfStockSizes,
      variants: parsedVariants
    };
  } catch (err) {
    logger.warn(`Failed to fetch live AliExpress pricing with Gemini search for ${productId}:`, err);
    return null;
  }
}

/**
 * Scrapes product data directly from AliExpress item page (reliable fallback)
 */
export async function scrapeAliExpressProduct(productId: string): Promise<AliExpressProductDetails | null> {
  try {
    const itemUrl = `https://www.aliexpress.com/item/${productId}.html`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let res: Response;
    try {
      res = await fetch(itemUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Cache-Control': 'no-cache'
        }
      });
    } finally {
      clearTimeout(timeout);
    }

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

    // If no title could be extracted, AliExpress likely returned a bot-detection page or empty shell — fail explicitly
    if (!title) {
      throw new Error(`Failed to extract product data from AliExpress for product ${productId}. The page may be blocked, require CAPTCHA, or use client-side rendering that cannot be scraped.`);
    }

    // Extract Images from all possible sources
    const rawImages: string[] = [];

    // A. DCData imagePathList (Current AliExpress Architecture)
    if (Array.isArray(dcData?.imagePathList) && dcData.imagePathList.length > 0) {
      rawImages.push(...dcData.imagePathList);
    }

    // B. runParams imageModule
    if (Array.isArray(runParams?.data?.imageModule?.imagePathList) && runParams.data.imageModule.imagePathList.length > 0) {
      rawImages.push(...runParams.data.imageModule.imagePathList);
    }

    // C. ldJson image
    if (ldJson?.image) {
      const ldImgs = Array.isArray(ldJson.image) ? ldJson.image : [ldJson.image];
      rawImages.push(...ldImgs);
    }

    // D. Only fallback to regex across full HTML if no structured gallery images were found
    if (rawImages.length === 0) {
      const ogImgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
      if (ogImgMatch && ogImgMatch[1]) {
        rawImages.push(ogImgMatch[1]);
      }

      // Regex search across full HTML for media CDN images (aliexpress-media.com and alicdn.com)
      const imgMatches = html.matchAll(/https?:\/\/[a-zA-Z0-9_.-]+\.(?:aliexpress-media|alicdn)\.com\/kf\/[a-zA-Z0-9_.-]+(?:\/[^"'\s<>]+)?\.(?:jpg|png|webp|jpeg)/gi);
      for (const m of imgMatches) {
        rawImages.push(m[0]);
      }
    }

    // Clean, validate and deduplicate image URLs by unique asset key (e.g. /kf/S...)
    const seenAssetKeys = new Set<string>();
    const cleanedImages: string[] = [];

    for (const url of rawImages) {
      let u = url.trim();
      if (u.startsWith('//')) u = 'https:' + u;
      // Remove thumbnail/dimension suffixes (e.g. _80x80.jpg, _Q90.jpg)
      u = u.replace(/_[0-9]+x[0-9]+.*$/i, '');
      u = u.split('?')[0];

      if (!u.startsWith('http')) continue;
      if (u.includes('error') || u.includes('p_404') || u.includes('icon') || u.includes('S19538f0e')) continue;

      // Extract unique media asset key (e.g. /kf/S5ada36ecd6284052972aa02bf53e5c64i)
      const assetMatch = u.match(/\/kf\/([a-zA-Z0-9_-]+)/i);
      const assetKey = assetMatch ? assetMatch[1].toLowerCase() : u.toLowerCase();

      if (!seenAssetKeys.has(assetKey)) {
        seenAssetKeys.add(assetKey);
        // Normalize URL to clean direct format without SEO slug if it had one
        const cleanUrl = assetMatch
          ? u.replace(/\/kf\/[a-zA-Z0-9_-]+(?:\/[^"'\s<>]+)?\.(jpg|png|webp|jpeg)/i, `/kf/${assetMatch[1]}.$1`)
          : u;
        cleanedImages.push(cleanUrl);
      }
    }

    const primaryImage = cleanedImages[0] || '/Logo.jpg';

    // Extract Price & Variants
    const variants: AliExpressVariant[] = [];
    let minPrice = 19.99;
    let maxPrice = 29.99;
    let originalPrice: number | undefined = undefined;

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
      originalPrice = Math.round(minPrice * 1.35 * 100) / 100;
    } else if (ldJson?.offers?.price) {
      const basePrice = Number(ldJson.offers.price) || 19.99;
      const gbpPrice = Math.round(basePrice * 0.82 * 100) / 100;
      minPrice = gbpPrice;
      maxPrice = gbpPrice;
      originalPrice = Math.round(gbpPrice * 1.35 * 100) / 100;

      ['Small (S)', 'Medium (M)', 'Large (L)', 'Extra Large (XL)'].forEach((size, idx) => {
        variants.push({
          skuId: `${productId}-${size.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          skuCode: generateVariantSku(productId, size, idx),
          price: gbpPrice,
          originalPrice: Math.round(gbpPrice * 1.35 * 100) / 100,
          currency: 'GBP',
          stock: 30,
          properties: [{ name: 'Size', value: size }],
          imageUrl: primaryImage
        });
      });
    } else {
      // Modern AliExpress uses CSR (Client Side Rendering) where prices aren't in raw static HTML.
      // Use live Google Search Grounding via Gemini to fetch authentic GBP prices and actual variants.
      const livePricing = await fetchLiveAliExpressPricingWithGemini(productId, title);

      if (livePricing && livePricing.price > 0) {
        minPrice = livePricing.price;
        originalPrice = livePricing.originalPrice;

        const liveVariants: Array<{ colour?: string; size?: string; name: string; price: number; inStock?: boolean; stock?: number }> =
          livePricing.variants.length > 0
            ? livePricing.variants
            : (livePricing.sizes.length > 0
                ? livePricing.sizes.map((s) => ({
                    size: s,
                    name: s,
                    price: livePricing.price,
                    inStock: !livePricing.outOfStockSizes?.includes(s.trim().toUpperCase()),
                    stock: livePricing.outOfStockSizes?.includes(s.trim().toUpperCase()) ? 0 : 35
                  }))
                : []);

        if (liveVariants.length > 0) {
          liveVariants.forEach((lv, idx) => {
            const vPrice = lv.price || livePricing.price;
            const skuCode = generateVariantSku(productId, lv.name, idx);
            const skuId = `${productId}-${lv.name.toLowerCase().replace(/[^a-z0-9]/g, '-') || idx + 1}`;

            // Parse properties: if multi-attribute like "Red / XS", split into Colour and Size
            const props: Array<{ name: string; value: string }> = [];

            if (lv.colour && lv.size) {
              props.push({ name: 'Colour', value: lv.colour });
              props.push({ name: 'Size', value: lv.size });
            } else {
              const optionParts = lv.name.split(/\s*[\/|,]\s*|\s+-\s+/).map((p) => p.trim()).filter(Boolean);
              if (optionParts.length === 2) {
                props.push({ name: 'Colour', value: optionParts[0] });
                props.push({ name: 'Size', value: optionParts[1] });
              } else if (optionParts.length > 2) {
                props.push({ name: 'Colour', value: optionParts[0] });
                props.push({ name: 'Size', value: optionParts.slice(1).join(' - ') });
              } else {
                props.push({ name: 'Size', value: lv.name });
              }
            }

            const sizeVal = props.find((p) => /size/i.test(p.name))?.value;
            const cleanSizeUpper = sizeVal ? sizeVal.trim().toUpperCase() : '';
            const isOos =
              lv.inStock === false ||
              lv.stock === 0 ||
              (cleanSizeUpper && livePricing.outOfStockSizes?.includes(cleanSizeUpper));
            const finalStock = isOos ? 0 : (typeof lv.stock === 'number' ? lv.stock : 35);

            variants.push({
              skuId,
              skuCode,
              price: vPrice,
              originalPrice: livePricing.originalPrice || Math.round(vPrice * 1.4 * 100) / 100,
              currency: 'GBP',
              stock: finalStock,
              properties: props,
              imageUrl: primaryImage
            });
          });

          const dedupedVariants = ensureUniqueVariantSkus(variants);
          variants.length = 0;
          variants.push(...dedupedVariants);

          const prices = variants.map((v) => v.price);
          minPrice = Math.min(...prices);
          maxPrice = Math.max(...prices);
        } else {
          variants.push({
            skuId: `${productId}-std`,
            skuCode: `${productId}-STD`,
            price: livePricing.price,
            originalPrice: livePricing.originalPrice || Math.round(livePricing.price * 1.4 * 100) / 100,
            currency: 'GBP',
            stock: 35,
            properties: [{ name: 'Option', value: 'Standard' }],
            imageUrl: primaryImage
          });
          maxPrice = livePricing.price;
        }
      } else {
        // Fallback variants with realistic British pet pricing tiers if live pricing lookup is unavailable
        const sizeTiers = [
          { name: 'Small (S)', price: 19.99, orig: 27.99 },
          { name: 'Medium (M)', price: 24.99, orig: 34.99 },
          { name: 'Large (L)', price: 29.99, orig: 41.99 },
          { name: 'Extra Large (XL)', price: 34.99, orig: 48.99 }
        ];

        sizeTiers.forEach((tier, idx) => {
          variants.push({
            skuId: `${productId}-${tier.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            skuCode: generateVariantSku(productId, tier.name, idx),
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

    const uniqueColours = Array.from(
      new Set(
        variants
          .map((v) => v.properties.find((p) => /colou?r/i.test(p.name))?.value)
          .filter(Boolean) as string[]
      )
    );

    const uniqueSizes = Array.from(
      new Set(
        variants
          .map((v) => v.properties.find((p) => /size/i.test(p.name) || p.name === 'Option')?.value)
          .filter(Boolean) as string[]
      )
    );

    const propertiesObj: Record<string, string[]> = {};
    if (uniqueColours.length > 0) propertiesObj.Colour = uniqueColours;
    if (uniqueSizes.length > 0) propertiesObj.Size = uniqueSizes;
    if (Object.keys(propertiesObj).length === 0) propertiesObj.Option = ['Standard'];

    return {
      productId,
      title: title,
      description: description,
      images: cleanedImages.length > 0 ? cleanedImages : ['/Logo.jpg'],
      variants,
      properties: propertiesObj,
      priceMin: minPrice,
      priceMax: maxPrice,
      originalPrice,
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
  const resolved = await resolveAliExpressProductId(urlOrId);
  const productId = resolved.productId;
  const canonicalUrl = resolved.resolvedUrl || `https://www.aliexpress.com/item/${productId}.html`;

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
        const title = resp.ae_item_base_info_dto?.subject || resp.subject || 'AliExpress Product';
        const description = resp.ae_item_base_info_dto?.detail || resp.detail || '';

        // Extract Images (modern API returns semicolon-delimited list in ae_multimedia_info_dto.image_urls)
        let uniqueImages: string[] = [];
        if (resp.ae_multimedia_info_dto?.image_urls) {
          uniqueImages = resp.ae_multimedia_info_dto.image_urls.split(';').map((u: string) => u.trim()).filter(Boolean);
        } else {
          const rawImages: string[] = (resp.product_small_image_urls?.string || []).concat(resp.product_main_image_url ? [resp.product_main_image_url] : []);
          uniqueImages = Array.from(new Set(rawImages)).filter(Boolean);
        }
        if (uniqueImages.length === 0) uniqueImages = ['/Logo.jpg'];

        // Extract SKUs / Variants (modern API returns ae_item_sku_info_dtos.ae_item_sku_info_d_t_o)
        const rawSkus: any[] = resp.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || resp.aeop_ae_product_s_k_us?.aeop_ae_product_sku || [];

        const rawVariants: AliExpressVariant[] = rawSkus.map((sku: any, idx: number) => {
          const rawPrice = Number(sku.offer_sale_price || sku.sku_price || 19.99);
          const gbpPrice = Math.round(rawPrice * 0.82 * 100) / 100;

          const propList = sku.ae_sku_property_dtos?.ae_sku_property_d_t_o || sku.aeop_s_k_u_property?.aeop_sku_property || [];
          const properties = propList.map((p: any) => ({
            name: p.sku_property_name || 'Option',
            value: p.property_value_definition_name || p.sku_property_value || 'Default',
            imageUrl: p.sku_image
          }));

          const sizeVal = properties.find((p: any) => /size/i.test(p.name))?.value;
          const optionNames = properties.map((p: any) => p.value).join(' / ');

          let baseSku = sku.sku_code?.trim() || sku.id;
          if (!baseSku) {
            baseSku = generateVariantSku(productId, optionNames || `Option-${idx + 1}`, idx);
          } else if (sizeVal) {
            const cleanSize = extractCleanSizeCode(sizeVal);
            if (cleanSize && !baseSku.includes(cleanSize)) {
              baseSku = `${baseSku}-${cleanSize}`;
            }
          }

          const propImg = properties.find((p: any) => p.imageUrl)?.imageUrl;

          return {
            skuId: String(sku.sku_id || `${productId}-${idx + 1}`),
            skuCode: String(baseSku),
            price: gbpPrice,
            originalPrice: sku.sku_price ? Math.round(Number(sku.sku_price) * 0.82 * 100) / 100 : undefined,
            currency: 'GBP',
            stock: Number(sku.sku_available_stock || sku.ipm_sku_stock || 99),
            properties,
            imageUrl: propImg || sku.sku_image || uniqueImages[0] || '/Logo.jpg'
          };
        });

        const variants = ensureUniqueVariantSkus(rawVariants);
        const prices = variants.map((v) => v.price);
        return {
          productId,
          title,
          description,
          images: uniqueImages,
          variants: variants.length > 0 ? variants : [],
          properties: {},
          priceMin: prices.length > 0 ? Math.min(...prices) : 19.99,
          priceMax: prices.length > 0 ? Math.max(...prices) : 29.99,
          currency: 'GBP',
          sourceUrl: canonicalUrl
        };
      }
    } catch (apiErr) {
      logger.warn(`AliExpress API call failed for ${productId}, falling back to scraper parser:`, apiErr);
    }
  }

  // 2. Fallback to resilient HTML scraper/parser
  const product = await scrapeAliExpressProduct(productId);
  if (product) {
    if (canonicalUrl) product.sourceUrl = canonicalUrl;
    return product;
  }
  return null;
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
        product_items: orderRequest.items.map((item) => {
          const isSkuAttr = item.aliexpressSkuId && item.aliexpressSkuId.includes(':');
          return {
            product_id: orderRequest.aliexpressProductId,
            ...(isSkuAttr ? { sku_attr: item.aliexpressSkuId } : { sku_id: item.aliexpressSkuId }),
            product_count: item.quantity
          };
        })
      })
    };

    logger.info('AliExpress API Payload:', params);
    const response = await callAliExpressApi('aliexpress.trade.buy.placeorder', params, accessToken);
    logger.info('AliExpress API Response:', JSON.stringify(response, null, 2));
    
    const result = response?.aliexpress_trade_buy_placeorder_response?.result;

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
      error: response?.error_response?.sub_msg || 
             response?.error_response?.msg || 
             result?.error_msg || 
             result?.error_code || 
             JSON.stringify(response) || 
             'AliExpress order placement failed'
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
