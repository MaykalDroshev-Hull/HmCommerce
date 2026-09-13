import { createServerClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface CopywritingInput {
  title: string;
  rawDescription?: string;
  category?: string;
  specifications?: string | Record<string, any>;
  target?: 'title' | 'description' | 'both';
}

export interface CopywritingOutput {
  title?: string;
  description?: string;
  isAi: boolean;
  modelUsed?: string;
}

/**
 * Retrieve Gemini API Key from environment or database settings
 */
export async function getGeminiApiKey(): Promise<string | null> {
  // 1. Check environment variable
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5) {
    return process.env.GEMINI_API_KEY.trim();
  }

  // 2. Check store_settings in database
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('store_settings')
      .select('gemini_api_key')
      .limit(1)
      .maybeSingle();

    if (data?.gemini_api_key && data.gemini_api_key.trim().length > 5) {
      return data.gemini_api_key.trim();
    }
  } catch (error) {
    logger.warn('Failed to read gemini_api_key from database:', error);
  }

  return null;
}

/**
 * Creative Local Title Generator (cycles or picks engaging British pet names)
 */
export function generateLocalPetTitle(rawInput: string): string {
  const lower = rawInput.toLowerCase();

  // Extract core keywords
  let core = rawInput
    .replace(/aliexpress|drop\s*shipping|wholesale|free\s*shipping|hot\s*sale|new\s*arrival|202\d|factory\s*price|suit|clothes|apparel|costumes?/gi, '')
    .replace(/[\(\)\[\]\{\}]/g, '')
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();

  const prefixes = [
    'Saddle-Up',
    'Highland',
    'Barkley & Co.',
    'CosyPaws',
    'Sheriff Paws',
    'Waggle',
    'Adventure Hound',
    'Heritage Pet'
  ];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];

  if (lower.includes('cowboy') || lower.includes('rider')) {
    const cowboyTitles = [
      'Saddle-Up Cowboy Rider Dog Costume',
      'Sheriff Paws Cowboy Rider Pup Outfit',
      'Prairie Rider Festive Dog Cosplay Set',
      'Rodeo Pup Cowboy Rider Costume with Hat'
    ];
    return cowboyTitles[Math.floor(Math.random() * cowboyTitles.length)];
  }

  if (lower.includes('collar') || lower.includes('lead') || lower.includes('leash')) {
    const collarTitles = [
      'Daydrift Adventure Padded Dog Collar',
      'Highland Heritage Anodised Alloy Collar',
      'Rover Trail All-Weather Padded Collar',
      'Coastal Walk Quick-Release Dog Collar'
    ];
    return collarTitles[Math.floor(Math.random() * collarTitles.length)];
  }

  if (lower.includes('harness')) {
    const harnessTitles = [
      'Trailblazer Ergonomic No-Pull Harness',
      'Highland Explorer Dual-Clip Dog Harness',
      'ActivePaws Breathable Padded Step-In Harness'
    ];
    return harnessTitles[Math.floor(Math.random() * harnessTitles.length)];
  }

  if (lower.includes('raincoat') || lower.includes('waterproof')) {
    const rainTitles = [
      'Paws & Puddles All-Weather Raincoat',
      'StormShield Waterproof Reflective Dog Jacket',
      'Highland Drizzle Lightweight Pet Rain Mac'
    ];
    return rainTitles[Math.floor(Math.random() * rainTitles.length)];
  }

  // Generic fallback with prefix + cleaned title
  const words = core.split(' ').filter(w => w.length > 2).slice(0, 4).join(' ');
  return `${prefix} ${words || 'Comfort Pet Gear'}`;
}

/**
 * Smart Fallback Copywriter (zero external API required)
 */
export function generateLocalPetCopy(input: CopywritingInput): CopywritingOutput {
  const target = input.target || 'both';

  const title = generateLocalPetTitle(input.title);

  const description = `Give your beloved furbaby the ultimate in tail-wagging comfort and charm! Designed with pure pet happiness in mind, the ${title} delivers the perfect blend of cozy warmth, effortless dressing, and delightful style for daily strolls, family gatherings, and photo-ready celebrations.

Why Devoted Pet Parents Love It:
• Exceptionally Soft & Gentle: Crafted from skin-friendly, breathable fabric that won't pinch, rub, or tug against delicate fur.
• Fuss-Free Dressing: Engineered with quick, secure fastenings for a snug fit that stays comfortably in place through running and playful romps.
• Safe & Lightweight: Designed for unrestricted movement so your four-legged companion can strut and play happily.

Sizing & Fit Guide:
We always recommend measuring your pet's neck and chest girth before ordering to ensure the most comfortable, tail-wagging fit. If in between sizes, we suggest choosing the larger size for maximum comfort.

Care Instructions:
Gentle hand or machine wash on cold cycle (30°C). Air dry naturally to keep the fabric irresistibly soft, clean, and vibrant.`;

  return {
    title: target === 'description' ? undefined : title,
    description: target === 'title' ? undefined : description,
    isAi: false
  };
}

/**
 * Generate bespoke British Pet Copy using Google Gemini API
 */
export async function generateGeminiPetCopy(input: CopywritingInput): Promise<CopywritingOutput> {
  const apiKey = await getGeminiApiKey();
  const target = input.target || 'both';

  if (!apiKey) {
    logger.info('No Gemini API key found, using local pet copywriter');
    return generateLocalPetCopy(input);
  }

  let prompt = '';
  if (target === 'title') {
    prompt = `You are a creative British brand copywriter for "MB-Paws", a premium UK pet care lifestyle brand.
Task: Generate ONE catchy, premium, creative British brand product title (3 to 6 words) for this pet product.
Product Details from Supplier:
- Raw Title: "${input.title}"
- Description: "${input.rawDescription?.substring(0, 300) || ''}"
- Category: "${input.category || 'Pet Costumes & Gear'}"

Rules:
- British spelling only (e.g. Colour, Cosy).
- Zero emojis.
- Make it sound like an upscale British pet boutique (e.g. "Saddle-Up Cowboy Rider Pup Costume", "Highland Tweed Padded Harness", "Paws & Puddles All-Weather Raincoat").
- Respond ONLY with valid JSON: { "title": "Your Generated Product Title" }`;
  } else if (target === 'description') {
    prompt = `You are an expert British pet lifestyle copywriter for "MB-Paws", a premium UK pet care brand.
Your target audience is devoted British pet parents who treat their furbabies as beloved family members.

Product Information:
- Product Title: "${input.title}"
- Supplier Specs / Description: "${input.rawDescription?.substring(0, 1000) || 'None provided'}"
- Category: "${input.category || 'Pet Accessories'}"

Mandatory Rules:
1. British English spelling exclusively (colour, favourite, customise, cosy).
2. Zero coloured emojis. Do NOT include any emojis anywhere.
3. Conversational tone with natural contractions ("we've", "you'll", "it's").
4. Vocabulary: "pet parent", "furbaby", "tail-wagging", "wholesome", "loved", "comfort", "snug".
5. Structure:
   - Affectionate 2-3 sentence overview hook celebrating the pet.
   - "Why Devoted Pet Parents Love It:" section with 3-4 crisp benefit bullet points.
   - "Sizing & Fit Guide:" section with reassuring guidance on measuring neck and chest girth.
   - "Care Instructions:" section with gentle washing advice (30°C).

Respond ONLY with valid JSON:
{
  "description": "Full formatted multi-paragraph description text here"
}`;
  } else {
    prompt = `You are an expert British pet lifestyle copywriter for "MB-Paws", a premium UK pet care brand.
Your target audience is devoted British pet parents who treat their pets as cherished family members.

Product Information from Supplier:
- Raw Title: "${input.title}"
- Raw Description / Details: "${input.rawDescription?.substring(0, 1000) || 'None provided'}"
- Category: "${input.category || 'Pet Accessories'}"

Brand Persona & Style Rules (MANDATORY):
1. British English spelling exclusively (e.g., "colour", "favourite", "customise", "cosy").
2. Zero coloured emojis.
3. Conversational tone with natural contractions ("we've", "you'll", "it's").
4. Vocabulary: "pet parent", "furbaby", "tail-wagging", "wholesome", "loved", "comfort".
5. Structure:
   - Provide a clean, catchy, 3 to 6-word British product title.
   - An engaging, affectionate 2-3 sentence overview hook.
   - "Why Devoted Pet Parents Love It:" section with 3-4 crisp benefit bullet points.
   - "Sizing & Fit Guide:" section with reassuring guidance on measuring girth.
   - "Care Instructions:" section with gentle washing advice (30°C).

Respond in exact valid JSON format:
{
  "title": "Clean British Brand Title",
  "description": "Full formatted multi-paragraph description text here"
}`;
  }

  try {
    const models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-1.5-flash'];
    let lastError: any = null;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: 'application/json'
            }
          })
        });

        if (!response.ok) {
          const errBody = await response.text();
          lastError = new Error(`Gemini API HTTP ${response.status}: ${errBody}`);
          continue;
        }

        const data = await response.json();
        const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawContent) {
          try {
            const parsed = JSON.parse(rawContent);
            return {
              title: parsed.title ? parsed.title.trim() : undefined,
              description: parsed.description ? parsed.description.trim() : undefined,
              isAi: true,
              modelUsed: model
            };
          } catch (jsonErr) {
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              return {
                title: parsed.title ? parsed.title.trim() : undefined,
                description: parsed.description ? parsed.description.trim() : undefined,
                isAi: true,
                modelUsed: model
              };
            }
          }
        }
      } catch (modelErr) {
        lastError = modelErr;
      }
    }

    logger.warn('Gemini API call unsuccessful, falling back to local copywriter:', lastError);
    return generateLocalPetCopy(input);
  } catch (error) {
    logger.error('Error generating copy with Gemini:', error);
    return generateLocalPetCopy(input);
  }
}
