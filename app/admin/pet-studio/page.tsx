'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AdminLayout from '../components/AdminLayout';
import ImageOverlayEditor from '../components/ImageOverlayEditor';
import { getAdminSession } from '@/lib/auth';
import { useTheme } from '@/context/ThemeContext';
import { stitchPhotos } from './utils/stitchPhotos';
import {
  Upload,
  Sparkles,
  Loader2,
  Download,
  RefreshCw,
  ChevronDown,
  X,
  RatioIcon,
  Camera,
  Columns2,
  Rows2,
  ImageIcon,
  Layers,
  ShoppingBag,
  Copy,
  Check,
  ExternalLink,
  HelpCircle,
  FolderOpen,
  AlertCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Presets & Constants                                                */
/* ------------------------------------------------------------------ */

export const BACKGROUND_PRESETS = [
  {
    id: 'british-living-room',
    name: 'Cosy British Living Room',
    url: 'https://images.unsplash.com/photo-1540518614846-7ede433c4ef0?q=80&w=1200&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1540518614846-7ede433c4ef0?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 'autumn-park',
    name: 'Sunny Autumn Country Park',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 'luxury-studio',
    name: 'Luxury White Studio',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1200&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 'festive-fireplace',
    name: 'Warm Fireplace Hearth',
    url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=1200&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=200&auto=format&fit=crop'
  }
];

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProductOption {
  productid: string;
  name: string;
}

interface ProductDetail {
  productid: string;
  name: string;
  images: string[];
  variants?: {
    productvariantid: string;
    images?: string[];
    imageurl?: string;
  }[];
}

export interface GalleryItem {
  id: string;
  url: string;
  label: string;
  type: 'original' | 'ai';
  createdAt: number;
}

export type StudioMode = 'single' | 'versus' | 'dual_costume' | 'dog_cat_scene';

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function PetStudioPage() {
  const router = useRouter();
  const { theme } = useTheme();

  // Auth
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Products
  const [products, setProducts] = useState<ProductOption[]>([]);

  // Product A
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(null);
  const [selectedProductImage, setSelectedProductImage] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Product B (for Dual Costume mode)
  const [selectedProductIdB, setSelectedProductIdB] = useState('');
  const [productDetailB, setProductDetailB] = useState<ProductDetail | null>(null);
  const [selectedProductImageB, setSelectedProductImageB] = useState('');
  const [productSearchTermB, setProductSearchTermB] = useState('');
  const [showProductDropdownB, setShowProductDropdownB] = useState(false);

  // Pet images
  const [petImageA, setPetImageA] = useState<string | null>(null);
  const [petImageB, setPetImageB] = useState<string | null>(null);
  const petInputARef = useRef<HTMLInputElement>(null);
  const petInputBRef = useRef<HTMLInputElement>(null);

  // Mode & Layout
  const [mode, setMode] = useState<StudioMode>('versus');
  const [versusLayout, setVersusLayout] = useState<'horizontal' | 'vertical'>('vertical');

  // Aspect ratio
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [customRatio, setCustomRatio] = useState('');

  // Generation & Stitching
  const [customInstructions, setCustomInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [stitching, setStitching] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Gallery of session images (originals and AI creations)
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  // Dropdown refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownBRef = useRef<HTMLDivElement>(null);

  // Background image (for Dog & Cat Scene mode)
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  // Costume input sources ('catalog' | 'upload')
  const [dogCostumeSource, setDogCostumeSource] = useState<'catalog' | 'upload'>('catalog');
  const [catCostumeSource, setCatCostumeSource] = useState<'catalog' | 'upload'>('catalog');
  const [customCostumeA, setCustomCostumeA] = useState<string | null>(null);
  const [customCostumeNameA, setCustomCostumeNameA] = useState('');
  const [customCostumeB, setCustomCostumeB] = useState<string | null>(null);
  const [customCostumeNameB, setCustomCostumeNameB] = useState('');
  const costumeInputARef = useRef<HTMLInputElement>(null);
  const costumeInputBRef = useRef<HTMLInputElement>(null);

  // Gemini Prompt Modal & Copy
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const geminiResultInputRef = useRef<HTMLInputElement>(null);

  // Direct user image upload for overlay editor
  const userImageUploadInputRef = useRef<HTMLInputElement>(null);
  const [isCanvasDragging, setIsCanvasDragging] = useState(false);

  // Effective costume image and name helpers
  const effectiveCostumeImageA = dogCostumeSource === 'catalog' ? selectedProductImage : customCostumeA;
  const effectiveCostumeNameA = dogCostumeSource === 'catalog'
    ? (productDetail?.name || products.find(p => p.productid === selectedProductId)?.name || 'Dog Costume')
    : (customCostumeNameA.trim() || 'Dog Costume');

  const effectiveCostumeImageB = catCostumeSource === 'catalog' ? selectedProductImageB : customCostumeB;
  const effectiveCostumeNameB = catCostumeSource === 'catalog'
    ? (productDetailB?.name || products.find(p => p.productid === selectedProductIdB)?.name || 'Cat Costume')
    : (customCostumeNameB.trim() || 'Cat Costume');

  /* ---------------------------------------------------------------- */
  /*  Auth                                                             */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    document.title = 'Pet Fashion Studio - Admin';
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getAdminSession();
        if (!session) { router.push('/admin/login'); return; }
        setIsAuthenticated(true);
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  /* ---------------------------------------------------------------- */
  /*  Load products                                                    */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const res = await fetch('/api/products?basic=true');
        const data = await res.json();
        if (data.success) {
          setProducts(
            (data.products || []).map((p: { productid?: string; id?: string; name?: string }) => ({
              productid: p.productid || p.id,
              name: p.name || 'Product',
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      }
    })();
  }, [isAuthenticated]);

  /* ---------------------------------------------------------------- */
  /*  Load product detail when selected (Product A)                    */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!selectedProductId) {
      setProductDetail(null);
      setSelectedProductImage('');
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/products/${selectedProductId}`);
        const data = await res.json();
        if (data.success && data.product) {
          const p = data.product;
          const allImages: string[] = [];
          if (p.images && Array.isArray(p.images)) allImages.push(...p.images);
          if (p.Images && Array.isArray(p.Images)) {
            p.Images.forEach((img: { imageurl?: string }) => {
              if (img.imageurl) allImages.push(img.imageurl);
            });
          }
          const variants = p.variants || p.Variants || [];
          variants.forEach((v: any) => {
            if (v.images && Array.isArray(v.images)) allImages.push(...v.images);
            if (v.imageurl) allImages.push(v.imageurl);
          });

          const uniqueImages = [...new Set(allImages)].filter(Boolean);

          setProductDetail({
            productid: p.productid,
            name: p.name,
            images: uniqueImages,
            variants
          });

          if (uniqueImages.length > 0) {
            setSelectedProductImage(uniqueImages[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load product detail:', err);
      }
    })();
  }, [selectedProductId]);

  /* ---------------------------------------------------------------- */
  /*  Load product detail when selected (Product B for Dual Costumes)  */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!selectedProductIdB) {
      setProductDetailB(null);
      setSelectedProductImageB('');
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/products/${selectedProductIdB}`);
        const data = await res.json();
        if (data.success && data.product) {
          const p = data.product;
          const allImages: string[] = [];
          if (p.images && Array.isArray(p.images)) allImages.push(...p.images);
          if (p.Images && Array.isArray(p.Images)) {
            p.Images.forEach((img: { imageurl?: string }) => {
              if (img.imageurl) allImages.push(img.imageurl);
            });
          }
          const variants = p.variants || p.Variants || [];
          variants.forEach((v: any) => {
            if (v.images && Array.isArray(v.images)) allImages.push(...v.images);
            if (v.imageurl) allImages.push(v.imageurl);
          });

          const uniqueImages = [...new Set(allImages)].filter(Boolean);

          setProductDetailB({
            productid: p.productid,
            name: p.name,
            images: uniqueImages,
            variants
          });

          if (uniqueImages.length > 0) {
            setSelectedProductImageB(uniqueImages[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load product B detail:', err);
      }
    })();
  }, [selectedProductIdB]);

  /* ---------------------------------------------------------------- */
  /*  Close dropdowns on outside click                                 */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
      if (dropdownBRef.current && !dropdownBRef.current.contains(e.target as Node)) {
        setShowProductDropdownB(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Client-side Image Optimization Helpers                          */
  /* ---------------------------------------------------------------- */

  const compressImageFile = useCallback((file: File, maxDimension = 1400, quality = 0.85): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        return reject(new Error('Selected file is not an image.'));
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.onload = (e) => {
        const src = e.target?.result as string;
        const img = new window.Image();
        img.onerror = () => reject(new Error('Failed to decode image.'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(src);

          // Fill white background for clean JPEG export
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const ensureCompressedDataUrl = useCallback((src: string, maxDimension = 1400, quality = 0.85): Promise<string> => {
    // If not a data URI or already lightweight (< 500KB base64 is ~680,000 chars), return directly
    if (!src.startsWith('data:') || src.length < 500_000) {
      return Promise.resolve(src);
    }
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(src);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });
  }, []);

  /* ---------------------------------------------------------------- */
  /*  File handlers                                                    */
  /* ---------------------------------------------------------------- */

  const handleFileUpload = useCallback(async (file: File, setter: (v: string | null) => void) => {
    try {
      const optimized = await compressImageFile(file);
      setter(optimized);
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        setter(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [compressImageFile]);

  /* ---------------------------------------------------------------- */
  /*  Prompt generation for Gemini Web App or API                      */
  /* ---------------------------------------------------------------- */

  const getStudioPromptText = useCallback(() => {
    const activeRatio = aspectRatio === 'custom' ? (customRatio.trim() || '9:16') : aspectRatio;

    if (mode === 'dog_cat_scene') {
      return `You are an elite commercial pet photographer and creative digital artist for the luxury British pet brand "Meow Bark".

TASK: Create a single seamless, realistic commercial photograph featuring BOTH a dog and a cat together inside the provided background environment.

I have attached 5 reference images in this exact order:
- Image 1: The DOG photo (preserve the exact dog breed, facial features, fur texture, and coloring)
- Image 2: The CAT photo (preserve the exact cat breed, face, fur texture, eye color, and coat markings)
- Image 3: The BACKGROUND ENVIRONMENT photo (place both pets naturally inside this exact scene/room)
- Image 4: The DOG'S COSTUME: "${effectiveCostumeNameA}" (dress the dog in this exact outfit; faithfully preserve its pattern, colors, hood/collar, and fabric texture)
- Image 5: The CAT'S COSTUME: "${effectiveCostumeNameB}" (dress the cat in this exact outfit; faithfully preserve its pattern, colors, hood/collar, and fabric texture)

CRITICAL DIRECTIVES:
1. NATURAL INTEGRATION: Position both the dog and cat naturally together within the background environment provided in Image 3. They should look like they are genuinely in that physical space, sitting or standing comfortably side by side.
2. LIGHTING & SHADOWS: The lighting, ambient reflections, floor contact shadows, and depth of field on both pets must perfectly match the lighting, color temperature, and perspective of the background image.
3. PET FIDELITY: Maintain the authentic identities of both animals. The dog must look like the dog in Image 1. The cat must look like the cat in Image 2. Do not swap species or alter breeds.
4. COSTUME ACCURACY: The dog is wearing Outfit 1 ("${effectiveCostumeNameA}"), and the cat is wearing Outfit 2 ("${effectiveCostumeNameB}"). Both costumes must fit naturally on the animals' bodies with realistic folds and fabric draping.
5. COMPOSITION: Both pets should be prominently visible, harmonious in scale, looking joyful, confident, stylish, and adorable.
6. CLEAN FINISH: Absolutely NO watermarks, garbled letters, text overlays, or digital artifacts. Clean photography finish suitable for luxury social media post.
${customInstructions ? `\nADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}

IMAGE DIMENSIONS: The output image MUST be in ${activeRatio} aspect ratio.

Output a single finished commercial photograph.`;
    } else if (mode === 'dual_costume') {
      return `You are an elite commercial pet photographer for the premium British pet brand "Meow Bark".

TASK: Create a stunning high-converting final Call-To-Action comparison image for social media (TikTok / Instagram).
Both pets are modelling DIFFERENT products from the Meow Bark collection to showcase product variety!

I have attached 4 reference images:
- Image 1: Photo of PET A (first pet photo)
- Image 2: Photo of PET B (second pet photo)
- Image 3: Photo of PRODUCT A: "${effectiveCostumeNameA}"
- Image 4: Photo of PRODUCT B: "${effectiveCostumeNameB}"

REQUIREMENTS:
${versusLayout === 'vertical' ? `- Create a single image split 50/50 LEFT and RIGHT with a clean vertical divider line down the middle.
- LEFT SIDE: Pet A wearing/modelling PRODUCT A: "${effectiveCostumeNameA}". Faithfully preserve all colours, pattern, fabric texture, and design details of Product A.
- RIGHT SIDE: Pet B wearing/modelling PRODUCT B: "${effectiveCostumeNameB}". Faithfully preserve all colours, pattern, fabric texture, and design details of Product B.` : `- Create a single image split 50/50 TOP and BOTTOM with a clean horizontal divider line across the middle.
- TOP HALF: Pet A wearing/modelling PRODUCT A: "${effectiveCostumeNameA}". Faithfully preserve all colours, pattern, fabric texture, and design details of Product A.
- BOTTOM HALF: Pet B wearing/modelling PRODUCT B: "${effectiveCostumeNameB}". Faithfully preserve all colours, pattern, fabric texture, and design details of Product B.`}
- Both pets should look joyful, confident, stylish, and happy modelling their respective outfits.
- Use a cohesive, clean, bright, professional luxury studio background on both sides (seamless white or soft neutral).
- Clean split layout. Keep the background clean. Do NOT add hardcoded watermarks or distorted text.
- Commercial 3-point lighting, Hasselblad-sharp focus, high resolution.
- KEEP the pet breeds/species faithful to the uploaded photos.
${customInstructions ? `\nADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}

IMAGE DIMENSIONS: The output image MUST be in ${activeRatio} aspect ratio.

Output a single finished image ready for the final TikTok call-to-action slide.`;
    } else if (mode === 'versus') {
      return `You are an elite commercial pet photographer for the premium British pet brand "Meow Bark".

TASK: Create a stunning "Who Wears It Better?" side-by-side comparison image for social media (TikTok / Instagram).

I have attached 3 reference images:
- Image 1: Photo of PET A (first pet photo)
- Image 2: Photo of PET B (second pet photo)
- Image 3: Photo of the product: "${effectiveCostumeNameA}"

REQUIREMENTS:
${versusLayout === 'vertical' ? `- Create a single image split 50/50 LEFT and RIGHT with a clean vertical divider line down the middle.
- LEFT SIDE: Pet A wearing/modelling the product "${effectiveCostumeNameA}". The pet should look adorable, confident, and stylish.
- RIGHT SIDE: Pet B wearing/modelling the product "${effectiveCostumeNameA}". The pet should also look adorable and stylish but in a slightly different pose.` : `- Create a single image split 50/50 TOP and BOTTOM with a clean horizontal divider line across the middle.
- TOP HALF: Pet A wearing/modelling the product "${effectiveCostumeNameA}". The pet should look adorable, confident, and stylish.
- BOTTOM HALF: Pet B wearing/modelling the product "${effectiveCostumeNameA}". The pet should also look adorable and stylish but in a slightly different pose.`}
- BOTH pets must be wearing the EXACT same product shown in the product image. Maintain the exact design, colour, pattern, and details of the product.
- Use the same clean, bright, professional studio background on both sides.
- Clean split layout. Do NOT add hardcoded watermarks or distorted text.
- Commercial lighting, sharp focus, high resolution.
- KEEP the pet breeds/species faithful to the uploaded photos.
${customInstructions ? `\nADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}

IMAGE DIMENSIONS: The output image MUST be in ${activeRatio} aspect ratio.

Output a single finished image ready for TikTok posting.`;
    } else {
      return `You are an elite commercial pet photographer for the premium British pet brand "Meow Bark".

TASK: Create a stunning, high-end commercial photograph of the pet wearing/modelling the product.

I have attached 2 reference images:
- Image 1: A photo of the pet
- Image 2: A photo of the product: "${effectiveCostumeNameA}"

REQUIREMENTS:
- Dress the pet in the exact product shown in the product image. Maintain the exact design, colour, pattern, fabric texture, and all details faithfully.
- KEEP the pet breed/species faithful to the uploaded photo. Do NOT change the animal.
- The pet should look adorable, happy, confident, and stylish wearing the product.
- Clean luxury commercial editorial studio photography setting.
- Seamless white or soft neutral studio background with soft contact shadows.
- Professional 3-point commercial lighting, Hasselblad-quality sharpness, 85mm portrait lens aesthetic.
- ABSOLUTELY NO watermarks, text, logos, or typography of any kind.
${customInstructions ? `\nADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}

IMAGE DIMENSIONS: The output image MUST be in ${activeRatio} aspect ratio.

Output a single finished photograph.`;
    }
  }, [mode, aspectRatio, customRatio, effectiveCostumeNameA, effectiveCostumeNameB, versusLayout, customInstructions]);

  const handleCopyPrompt = async () => {
    const text = getStudioPromptText();
    try {
      await navigator.clipboard.writeText(text);
      setPromptCopied(true);
      setShowPromptModal(true);
      setTimeout(() => setPromptCopied(false), 3000);
    } catch {
      setShowPromptModal(true);
    }
  };

  const handleUploadGeminiResult = (file: File) => {
    handleFileUpload(file, (dataUrl) => {
      if (dataUrl) {
        setGeneratedImage(dataUrl);
        const newItem: GalleryItem = {
          id: `gemini-app-${Date.now()}`,
          url: dataUrl,
          label: mode === 'dog_cat_scene' ? 'Gemini App: Dog & Cat Scene' : 'Gemini App Generated Shot',
          type: 'ai',
          createdAt: Date.now(),
        };
        setGallery(prev => [newItem, ...prev]);
      }
    });
  };

  const handleUploadUserImage = useCallback((file: File, customLabel?: string) => {
    handleFileUpload(file, (dataUrl) => {
      if (dataUrl) {
        setGeneratedImage(dataUrl);
        const newItem: GalleryItem = {
          id: `upload-${Date.now()}`,
          url: dataUrl,
          label: customLabel || 'Uploaded Photo (Overlays)',
          type: 'original',
          createdAt: Date.now(),
        };
        setGallery(prev => [newItem, ...prev]);
      }
    });
  }, [handleFileUpload]);

  /* ---------------------------------------------------------------- */
  /*  Stitch Original Photos (Instant Slide 1 / Mockup)                */
  /* ---------------------------------------------------------------- */

  const canStitchOriginals = () => {
    if (!petImageA) return false;
    if (mode === 'single') return true;
    if (mode === 'versus' || mode === 'dual_costume') return !!petImageB;
    if (mode === 'dog_cat_scene') return !!petImageB && !!backgroundImage;
    return true;
  };

  const handleStitchOriginals = async () => {
    if (!canStitchOriginals() || stitching) return;
    setStitching(true);
    setError('');

    try {
      const activeRatio = aspectRatio === 'custom' ? customRatio.trim() : aspectRatio;
      const stitchedDataUrl = await stitchPhotos({
        imageA: petImageA!,
        imageB: petImageB,
        backgroundImage: mode === 'dog_cat_scene' ? backgroundImage : null,
        mode: mode === 'dog_cat_scene' ? 'dog_cat_scene' : (mode === 'single' ? 'single' : 'versus'),
        layout: versusLayout,
        aspectRatio: activeRatio,
      });

      setGeneratedImage(stitchedDataUrl);
      let label = 'Slide 1: Original Photo';
      if (mode === 'versus' || mode === 'dual_costume') label = 'Slide 1: Originals (50/50)';
      if (mode === 'dog_cat_scene') label = 'Slide 1: Scene Composite Mockup';

      const newItem: GalleryItem = {
        id: `original-${Date.now()}`,
        url: stitchedDataUrl,
        label,
        type: 'original',
        createdAt: Date.now(),
      };
      setGallery(prev => [newItem, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Failed to stitch photos.');
    } finally {
      setStitching(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  AI Fashion Generation (Slide 2 or Slide 3 CTA)                   */
  /* ---------------------------------------------------------------- */

  const canGenerate = () => {
    if (!petImageA) return false;
    if (mode === 'single') return !!effectiveCostumeImageA;
    if (mode === 'versus') return !!petImageB && !!effectiveCostumeImageA;
    if (mode === 'dual_costume') return !!petImageB && !!effectiveCostumeImageA && !!effectiveCostumeImageB;
    if (mode === 'dog_cat_scene') {
      return !!petImageB && !!backgroundImage && !!effectiveCostumeImageA && !!effectiveCostumeImageB;
    }
    return true;
  };

  const handleGenerate = async () => {
    if (!canGenerate() || generating) return;
    setGenerating(true);
    setError('');

    try {
      // Ensure all images are compressed before building payload to guarantee no request limit or JSON truncation issues
      const [compPetA, compPetB, compBg, compCostumeA, compCostumeB] = await Promise.all([
        petImageA ? ensureCompressedDataUrl(petImageA) : Promise.resolve(null),
        petImageB ? ensureCompressedDataUrl(petImageB) : Promise.resolve(null),
        backgroundImage ? ensureCompressedDataUrl(backgroundImage) : Promise.resolve(null),
        effectiveCostumeImageA ? ensureCompressedDataUrl(effectiveCostumeImageA) : Promise.resolve(null),
        effectiveCostumeImageB ? ensureCompressedDataUrl(effectiveCostumeImageB) : Promise.resolve(null),
      ]);

      const petImages = mode === 'single'
        ? [compPetA!]
        : [compPetA!, compPetB!];

      const res = await fetch('/api/admin/pet-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          petImages,
          productImageUrl: compCostumeA || effectiveCostumeImageA,
          productName: effectiveCostumeNameA,
          productImageUrlB: (mode === 'dual_costume' || mode === 'dog_cat_scene') ? (compCostumeB || effectiveCostumeImageB) : undefined,
          productNameB: (mode === 'dual_costume' || mode === 'dog_cat_scene') ? effectiveCostumeNameB : undefined,
          backgroundImage: mode === 'dog_cat_scene' ? (compBg || backgroundImage) : undefined,
          customInstructions: customInstructions.trim() || undefined,
          aspectRatio: aspectRatio === 'custom' ? customRatio.trim() : aspectRatio,
          versusLayout: (mode === 'versus' || mode === 'dual_costume') ? versusLayout : undefined,
        })
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error('Server returned an invalid response. If using high-resolution photos, try re-uploading them or copy the prompt for the free Gemini web app.');
      }

      if (data.success && data.imageUrl) {
        setGeneratedImage(data.imageUrl);

        let label = 'AI Dressed Shot';
        if (mode === 'versus') label = 'Slide 2: Same Outfit (50/50)';
        if (mode === 'dual_costume') label = 'Slide 3: 2 Costumes (CTA)';
        if (mode === 'dog_cat_scene') label = 'AI Dog & Cat Scene (Costumes in Background)';

        const newItem: GalleryItem = {
          id: `ai-${Date.now()}`,
          url: data.imageUrl,
          label,
          type: 'ai',
          createdAt: Date.now(),
        };
        setGallery(prev => [newItem, ...prev]);
      } else {
        setError(data.error || 'Generation failed. Please try again or click "Copy Gemini Prompt" to generate in the Gemini app.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Filtered products                                                */
  /* ---------------------------------------------------------------- */

  const filteredProductsA = products.filter(p =>
    p.name.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const filteredProductsB = products.filter(p =>
    p.name.toLowerCase().includes(productSearchTermB.toLowerCase())
  );

  /* ---------------------------------------------------------------- */
  /*  Render helpers                                                   */
  /* ---------------------------------------------------------------- */

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 12,
  };

  const btnPrimary: React.CSSProperties = {
    backgroundColor: theme.colors.primary,
    color: '#fff',
    borderRadius: 10,
  };

  const btnSecondary: React.CSSProperties = {
    backgroundColor: theme.colors.secondary,
    color: theme.colors.text,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: theme.colors.border,
  };

  /* ---------------------------------------------------------------- */
  /*  Loading / auth gate                                              */
  /* ---------------------------------------------------------------- */

  if (isLoading) {
    return (
      <AdminLayout currentPath="/admin/pet-studio">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={32} className="animate-spin" style={{ color: theme.colors.primary }} />
        </div>
      </AdminLayout>
    );
  }

  if (!isAuthenticated) return null;

  /* ---------------------------------------------------------------- */
  /*  Main render                                                      */
  /* ---------------------------------------------------------------- */

  return (
    <AdminLayout currentPath="/admin/pet-studio">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: theme.colors.text }}>
              Pet Fashion Studio
            </h1>
            <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
              Create uniform TikTok & Instagram content: Slide 1 (Raw Originals), Slide 2 (Same Outfit), and Slide 3 (2 Different Costumes for your Call to Action)!
            </p>
          </div>
        </div>

        {/* Studio Mode Toggle */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMode('dog_cat_scene')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all shadow-xs"
            style={mode === 'dog_cat_scene' ? btnPrimary : btnSecondary}
            title="Dog & Cat in custom background with 2 separate costumes & overlays"
          >
            <Sparkles size={16} />
            Dog & Cat Scene (in Background)
          </button>
          <button
            onClick={() => setMode('dual_costume')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all"
            style={mode === 'dual_costume' ? btnPrimary : btnSecondary}
            title="Both pets wearing 2 different costumes for your final Call-to-Action slide"
          >
            <ShoppingBag size={16} />
            2 Different Costumes (CTA Slide)
          </button>
          <button
            onClick={() => setMode('versus')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all"
            style={mode === 'versus' ? btnPrimary : btnSecondary}
          >
            <Columns2 size={16} />
            Who Wears It Better (Same Costume)
          </button>
          <button
            onClick={() => setMode('single')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all"
            style={mode === 'single' ? btnPrimary : btnSecondary}
          >
            <Camera size={16} />
            Single Pet
          </button>

          {/* Versus / Dual Costume layout direction */}
          {(mode === 'versus' || mode === 'dual_costume') && (
            <>
              <div className="w-px self-stretch" style={{ backgroundColor: theme.colors.border }} />
              <button
                onClick={() => setVersusLayout('vertical')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all"
                style={versusLayout === 'vertical' ? btnPrimary : btnSecondary}
                title="Left & Right split comparison"
              >
                <Columns2 size={14} />
                Side by Side (Left & Right)
              </button>
              <button
                onClick={() => setVersusLayout('horizontal')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all"
                style={versusLayout === 'horizontal' ? btnPrimary : btnSecondary}
                title="Top & Bottom split comparison"
              >
                <Rows2 size={14} />
                Stacked (Top & Bottom)
              </button>
            </>
          )}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT COLUMN — Inputs & Actions */}
          <div className="space-y-5">

            {/* Pet Image(s) Upload */}
            <div style={cardStyle} className="p-5">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: theme.colors.text }}>
                <Upload size={18} />
                {mode === 'dog_cat_scene'
                  ? '1. Upload Pet Photos (Dog & Cat)'
                  : mode !== 'single'
                  ? 'Upload Pet Photos (A & B)'
                  : 'Upload Pet Photo'}
              </h2>
              {mode === 'dog_cat_scene' && (
                <p className="text-xs mb-3" style={{ color: theme.colors.textSecondary }}>
                  Upload clear photos of your dog and cat. Their authentic facial features, coat patterns, and breeds will be preserved in the scene.
                </p>
              )}

              <div className={`grid gap-4 ${mode !== 'single' ? 'grid-cols-2' : 'grid-cols-1'}`}>

                {/* Pet A / Dog */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1" style={{ color: theme.colors.textSecondary }}>
                    {mode === 'dog_cat_scene' ? '🐶 Dog Photo (Image 1)' : mode !== 'single' ? 'Pet A' : 'Pet Photo'}
                  </span>
                  {petImageA ? (
                    <div className="relative group rounded-lg overflow-hidden aspect-square border" style={{ borderColor: theme.colors.border }}>
                      <Image
                        src={petImageA}
                        alt={mode === 'dog_cat_scene' ? 'Dog photo' : 'Pet A photo'}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <button
                        onClick={() => setPetImageA(null)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove photo A"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => petInputARef.current?.click()}
                      className="w-full aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors hover:bg-opacity-50"
                      style={{
                        borderColor: theme.colors.border,
                        color: theme.colors.textSecondary,
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.colors.secondary; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <Upload size={28} />
                      <span className="text-sm font-medium">
                        {mode === 'dog_cat_scene' ? 'Upload Dog Photo' : mode !== 'single' ? 'Upload Pet A' : 'Upload Pet Photo'}
                      </span>
                      <span className="text-xs">JPG, PNG, WebP</span>
                    </button>
                  )}
                  <input
                    ref={petInputARef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, setPetImageA);
                      e.target.value = '';
                    }}
                  />
                </div>

                {/* Pet B / Cat */}
                {mode !== 'single' && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1" style={{ color: theme.colors.textSecondary }}>
                      {mode === 'dog_cat_scene' ? '🐱 Cat Photo (Image 2)' : 'Pet B'}
                    </span>
                    {petImageB ? (
                      <div className="relative group rounded-lg overflow-hidden aspect-square border" style={{ borderColor: theme.colors.border }}>
                        <Image
                          src={petImageB}
                          alt={mode === 'dog_cat_scene' ? 'Cat photo' : 'Pet B photo'}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <button
                          onClick={() => setPetImageB(null)}
                          className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove photo B"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => petInputBRef.current?.click()}
                        className="w-full aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors"
                        style={{
                          borderColor: theme.colors.border,
                          color: theme.colors.textSecondary,
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.colors.secondary; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <Upload size={28} />
                        <span className="text-sm font-medium">
                          {mode === 'dog_cat_scene' ? 'Upload Cat Photo' : 'Upload Pet B'}
                        </span>
                        <span className="text-xs">JPG, PNG, WebP</span>
                      </button>
                    )}
                    <input
                      ref={petInputBRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, setPetImageB);
                        e.target.value = '';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Background Environment Card (for dog_cat_scene mode) */}
            {mode === 'dog_cat_scene' && (
              <div style={cardStyle} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: theme.colors.text }}>
                    <ImageIcon size={18} />
                    2. Background Environment (Image 3)
                  </h2>
                  {backgroundImage && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Selected
                    </span>
                  )}
                </div>

                {backgroundImage ? (
                  <div className="relative group rounded-xl overflow-hidden aspect-video border" style={{ borderColor: theme.colors.border }}>
                    <Image
                      src={backgroundImage}
                      alt="Background Environment"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      onClick={() => setBackgroundImage(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove background image"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={() => backgroundInputRef.current?.click()}
                      className="w-full aspect-[21/9] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors"
                      style={{
                        borderColor: theme.colors.border,
                        color: theme.colors.textSecondary,
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.colors.secondary; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <Upload size={28} />
                      <span className="text-sm font-medium">Upload Custom Background Image</span>
                      <span className="text-xs">Living room, park, beach, Halloween scenery, etc. (JPG, PNG, WebP)</span>
                    </button>
                    <input
                      ref={backgroundInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, setBackgroundImage);
                        e.target.value = '';
                      }}
                    />

                    {/* Quick background presets */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.colors.textSecondary }}>
                        Or choose a preset background scene:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {BACKGROUND_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => setBackgroundImage(preset.url)}
                            className="group relative rounded-lg overflow-hidden border text-left transition-all hover:scale-[1.02]"
                            style={{
                              borderColor: theme.colors.border,
                              height: 64
                            }}
                          >
                            <Image
                              src={preset.thumbnail}
                              alt={preset.name}
                              fill
                              className="object-cover group-hover:brightness-105 transition-all"
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex items-end p-1.5">
                              <span className="text-[10px] text-white font-semibold leading-tight line-clamp-2">
                                {preset.name}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Costumes Selector(s) */}
            <div style={cardStyle} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: theme.colors.text }}>
                  <ShoppingBag size={18} />
                  {mode === 'dog_cat_scene'
                    ? '3. Costumes (Dog & Cat)'
                    : mode === 'dual_costume'
                    ? 'Select 2 Costumes'
                    : 'Select Product for AI Dressing'}
                </h2>
                {mode === 'dog_cat_scene' && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    Dual Costumes
                  </span>
                )}
              </div>

              {/* Costume A / Dog Costume */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.colors.textSecondary }}>
                    {mode === 'dog_cat_scene' ? '🐶 Dog Costume (Image 4)' : mode === 'dual_costume' ? 'Costume for Pet A' : 'Product to Model'}
                  </label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      onClick={() => setDogCostumeSource('catalog')}
                      className={`px-2 py-0.5 rounded transition-colors ${dogCostumeSource === 'catalog' ? 'font-bold underline' : 'opacity-70'}`}
                      style={{ color: dogCostumeSource === 'catalog' ? theme.colors.primary : theme.colors.textSecondary }}
                    >
                      Store Products
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => setDogCostumeSource('upload')}
                      className={`px-2 py-0.5 rounded transition-colors ${dogCostumeSource === 'upload' ? 'font-bold underline' : 'opacity-70'}`}
                      style={{ color: dogCostumeSource === 'upload' ? theme.colors.primary : theme.colors.textSecondary }}
                    >
                      Upload Costume
                    </button>
                  </div>
                </div>

                {dogCostumeSource === 'catalog' ? (
                  <div>
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setShowProductDropdown(!showProductDropdown)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors text-left"
                        style={{
                          backgroundColor: theme.colors.secondary,
                          color: theme.colors.text,
                          borderWidth: 1,
                          borderStyle: 'solid',
                          borderColor: theme.colors.border,
                        }}
                      >
                        <span className="truncate">
                          {selectedProductId
                            ? products.find(p => p.productid === selectedProductId)?.name || 'Selected product'
                            : 'Choose product from store...'}
                        </span>
                        <ChevronDown size={16} className="flex-shrink-0 ml-2" />
                      </button>

                      {showProductDropdown && (
                        <div
                          className="absolute z-30 w-full mt-1 rounded-lg shadow-xl overflow-hidden"
                          style={{
                            backgroundColor: theme.colors.surface,
                            borderWidth: 1,
                            borderStyle: 'solid',
                            borderColor: theme.colors.border,
                          }}
                        >
                          <div className="p-2">
                            <input
                              type="text"
                              value={productSearchTerm}
                              onChange={(e) => setProductSearchTerm(e.target.value)}
                              placeholder="Search product..."
                              className="w-full px-3 py-2 rounded-md text-sm outline-none"
                              style={{
                                backgroundColor: theme.colors.secondary,
                                color: theme.colors.text,
                                borderWidth: 1,
                                borderStyle: 'solid',
                                borderColor: theme.colors.border,
                              }}
                              autoFocus
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredProductsA.length === 0 ? (
                              <div className="px-3 py-2 text-sm" style={{ color: theme.colors.textSecondary }}>
                                No products found
                              </div>
                            ) : (
                              filteredProductsA.map(p => (
                                <button
                                  key={p.productid}
                                  onClick={() => {
                                    setSelectedProductId(p.productid);
                                    setShowProductDropdown(false);
                                    setProductSearchTerm('');
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm transition-colors truncate"
                                  style={{
                                    color: p.productid === selectedProductId ? '#fff' : theme.colors.text,
                                    backgroundColor: p.productid === selectedProductId ? theme.colors.primary : 'transparent',
                                  }}
                                >
                                  {p.name}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Swatches for Product A */}
                    {productDetail && productDetail.images.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[11px] mb-1.5" style={{ color: theme.colors.textSecondary }}>
                          Select costume angle:
                        </p>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                          {productDetail.images.map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedProductImage(img)}
                              className="relative aspect-square rounded-lg overflow-hidden transition-all"
                              style={{
                                borderWidth: selectedProductImage === img ? 3 : 1,
                                borderStyle: 'solid',
                                borderColor: selectedProductImage === img ? theme.colors.primary : theme.colors.border,
                                opacity: selectedProductImage === img ? 1 : 0.7,
                              }}
                            >
                              <Image src={img} alt={`Angle ${idx + 1}`} fill className="object-cover" sizes="80px" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={customCostumeNameA}
                      onChange={(e) => setCustomCostumeNameA(e.target.value)}
                      placeholder="e.g. Yellow Bee Fleece Hoodie..."
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{
                        backgroundColor: theme.colors.secondary,
                        color: theme.colors.text,
                        borderWidth: 1,
                        borderStyle: 'solid',
                        borderColor: theme.colors.border,
                      }}
                    />
                    {customCostumeA ? (
                      <div className="relative group rounded-lg overflow-hidden aspect-video border" style={{ borderColor: theme.colors.border, maxHeight: 120 }}>
                        <Image src={customCostumeA} alt="Custom costume A" fill className="object-contain" unoptimized />
                        <button
                          onClick={() => setCustomCostumeA(null)}
                          className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => costumeInputARef.current?.click()}
                        className="w-full py-3 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-xs font-medium"
                        style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}
                      >
                        <Upload size={16} />
                        Upload Costume Photo for Dog
                      </button>
                    )}
                    <input
                      ref={costumeInputARef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, setCustomCostumeA);
                        e.target.value = '';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Costume B / Cat Costume (Dual Costume & Dog-Cat Scene) */}
              {(mode === 'dual_costume' || mode === 'dog_cat_scene') && (
                <div className="space-y-2 pt-3 border-t" style={{ borderColor: theme.colors.border }}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.colors.textSecondary }}>
                      {mode === 'dog_cat_scene' ? '🐱 Cat Costume (Image 5)' : 'Costume for Pet B'}
                    </label>
                    <div className="flex items-center gap-1 text-[11px]">
                      <button
                        onClick={() => setCatCostumeSource('catalog')}
                        className={`px-2 py-0.5 rounded transition-colors ${catCostumeSource === 'catalog' ? 'font-bold underline' : 'opacity-70'}`}
                        style={{ color: catCostumeSource === 'catalog' ? theme.colors.primary : theme.colors.textSecondary }}
                      >
                        Store Products
                      </button>
                      <span>•</span>
                      <button
                        onClick={() => setCatCostumeSource('upload')}
                        className={`px-2 py-0.5 rounded transition-colors ${catCostumeSource === 'upload' ? 'font-bold underline' : 'opacity-70'}`}
                        style={{ color: catCostumeSource === 'upload' ? theme.colors.primary : theme.colors.textSecondary }}
                      >
                        Upload Costume
                      </button>
                    </div>
                  </div>

                  {catCostumeSource === 'catalog' ? (
                    <div>
                      <div className="relative" ref={dropdownBRef}>
                        <button
                          onClick={() => setShowProductDropdownB(!showProductDropdownB)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors text-left"
                          style={{
                            backgroundColor: theme.colors.secondary,
                            color: theme.colors.text,
                            borderWidth: 1,
                            borderStyle: 'solid',
                            borderColor: theme.colors.border,
                          }}
                        >
                          <span className="truncate">
                            {selectedProductIdB
                              ? products.find(p => p.productid === selectedProductIdB)?.name || 'Selected product B'
                              : 'Choose second costume from store...'}
                          </span>
                          <ChevronDown size={16} className="flex-shrink-0 ml-2" />
                        </button>

                        {showProductDropdownB && (
                          <div
                            className="absolute z-30 w-full mt-1 rounded-lg shadow-xl overflow-hidden"
                            style={{
                              backgroundColor: theme.colors.surface,
                              borderWidth: 1,
                              borderStyle: 'solid',
                              borderColor: theme.colors.border,
                            }}
                          >
                            <div className="p-2">
                              <input
                                type="text"
                                value={productSearchTermB}
                                onChange={(e) => setProductSearchTermB(e.target.value)}
                                placeholder="Search second product..."
                                className="w-full px-3 py-2 rounded-md text-sm outline-none"
                                style={{
                                  backgroundColor: theme.colors.secondary,
                                  color: theme.colors.text,
                                  borderWidth: 1,
                                  borderStyle: 'solid',
                                  borderColor: theme.colors.border,
                                }}
                                autoFocus
                              />
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {filteredProductsB.length === 0 ? (
                                <div className="px-3 py-2 text-sm" style={{ color: theme.colors.textSecondary }}>
                                  No products found
                                </div>
                              ) : (
                                filteredProductsB.map(p => (
                                  <button
                                    key={p.productid}
                                    onClick={() => {
                                      setSelectedProductIdB(p.productid);
                                      setShowProductDropdownB(false);
                                      setProductSearchTermB('');
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm transition-colors truncate"
                                    style={{
                                      color: p.productid === selectedProductIdB ? '#fff' : theme.colors.text,
                                      backgroundColor: p.productid === selectedProductIdB ? theme.colors.primary : 'transparent',
                                    }}
                                  >
                                    {p.name}
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Swatches for Product B */}
                      {productDetailB && productDetailB.images.length > 0 && (
                        <div className="pt-2">
                          <p className="text-[11px] mb-1.5" style={{ color: theme.colors.textSecondary }}>
                            Select costume angle for Pet B:
                          </p>
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                            {productDetailB.images.map((img, idx) => (
                              <button
                                key={idx}
                                onClick={() => setSelectedProductImageB(img)}
                                className="relative aspect-square rounded-lg overflow-hidden transition-all"
                                style={{
                                  borderWidth: selectedProductImageB === img ? 3 : 1,
                                  borderStyle: 'solid',
                                  borderColor: selectedProductImageB === img ? theme.colors.primary : theme.colors.border,
                                  opacity: selectedProductImageB === img ? 1 : 0.7,
                                }}
                              >
                                <Image src={img} alt={`Angle B ${idx + 1}`} fill className="object-cover" sizes="80px" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={customCostumeNameB}
                        onChange={(e) => setCustomCostumeNameB(e.target.value)}
                        placeholder="e.g. Green Dinosaur Dino Dragon Hoodie..."
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{
                          backgroundColor: theme.colors.secondary,
                          color: theme.colors.text,
                          borderWidth: 1,
                          borderStyle: 'solid',
                          borderColor: theme.colors.border,
                        }}
                      />
                      {customCostumeB ? (
                        <div className="relative group rounded-lg overflow-hidden aspect-video border" style={{ borderColor: theme.colors.border, maxHeight: 120 }}>
                          <Image src={customCostumeB} alt="Custom costume B" fill className="object-contain" unoptimized />
                          <button
                            onClick={() => setCustomCostumeB(null)}
                            className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => costumeInputBRef.current?.click()}
                          className="w-full py-3 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-xs font-medium"
                          style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}
                        >
                          <Upload size={16} />
                          Upload Costume Photo for Cat
                        </button>
                      )}
                      <input
                        ref={costumeInputBRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, setCustomCostumeB);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Extra Instructions */}
            <div style={cardStyle} className="p-5">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: theme.colors.text }}>
                <Sparkles size={18} />
                Extra Instructions (optional)
              </h2>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. 'Both pets looking forward smiling happily', 'Dog sitting on the left, cat lounging on the right'..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm resize-none outline-none"
                style={{
                  backgroundColor: theme.colors.secondary,
                  color: theme.colors.text,
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: theme.colors.border,
                }}
              />
            </div>

            {/* Aspect Ratio */}
            <div style={cardStyle} className="p-5">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: theme.colors.text }}>
                <RatioIcon size={18} />
                Aspect Ratio
              </h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { id: '9:16', label: '9:16 (TikTok / Reels)' },
                  { id: '16:9', label: '16:9 (Landscape)' },
                  { id: '4.5:16', label: '4.5:16 (Ultrawide)' },
                  { id: '1:1', label: '1:1 (Square)' },
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setAspectRatio(r.id); setCustomRatio(''); }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
                    style={aspectRatio === r.id ? btnPrimary : btnSecondary}
                  >
                    {r.label}
                  </button>
                ))}
                <button
                  onClick={() => setAspectRatio('custom')}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
                  style={aspectRatio === 'custom' ? btnPrimary : btnSecondary}
                >
                  Custom
                </button>
              </div>
              {aspectRatio === 'custom' && (
                <input
                  type="text"
                  value={customRatio}
                  onChange={(e) => setCustomRatio(e.target.value)}
                  placeholder="e.g. 3:4, 2:3, 21:9..."
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    backgroundColor: theme.colors.secondary,
                    color: theme.colors.text,
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: theme.colors.border,
                  }}
                />
              )}
            </div>

            {/* Creation Action Buttons */}
            <div className="space-y-3 pt-1">

              {/* 1. Copy Prompt Button (Primary for Gemini Web App workflow) */}
              <button
                onClick={handleCopyPrompt}
                className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl text-sm font-semibold transition-all border shadow-xs group"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: '#a855f7',
                  color: theme.colors.text,
                }}
                title="Copy prompt formatted with your reference images to paste directly into the free Gemini app"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-xs">
                    {promptCopied ? <Check size={18} /> : <Copy size={17} />}
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm flex items-center gap-2">
                      <span>Copy Prompt for Gemini App</span>
                      {promptCopied && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-semibold animate-pulse">
                          Copied!
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] opacity-75 font-normal">
                      No API credits needed • Run directly in gemini.google.com
                    </div>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1.5 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                  Free Web App <ExternalLink size={12} />
                </span>
              </button>

              {/* 2. Instant Mockup / Combine Originals Button */}
              <button
                onClick={handleStitchOriginals}
                disabled={!canStitchOriginals() || stitching}
                className="w-full flex items-center justify-between px-5 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed border shadow-xs"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.primary,
                  color: theme.colors.text,
                }}
                title="Stitch the photos together into an instant preview mockup"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: '#3b82f6' }}
                  >
                    <Layers size={17} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">
                      {mode === 'dog_cat_scene'
                        ? '1. Instant Scene Mockup (Canvas Composite)'
                        : mode !== 'single'
                        ? '1. Combine Originals (Slide 1)'
                        : '1. Frame Original Photo'}
                    </div>
                    <div className="text-[11px] opacity-75 font-normal">
                      Instant browser composite • No API wait • Ready for overlays
                    </div>
                  </div>
                </div>
                {stitching ? (
                  <Loader2 size={18} className="animate-spin" style={{ color: theme.colors.primary }} />
                ) : (
                  <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                    Instant
                  </span>
                )}
              </button>

              {/* 3. Generate with Gemini API Button */}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate() || generating}
                className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                style={btnPrimary}
                title={
                  mode === 'dog_cat_scene'
                    ? 'Generate photorealistic scene of dog & cat in costumes in background via Gemini API'
                    : mode === 'dual_costume'
                    ? 'Dress Pet A in Costume A and Pet B in Costume B for the final Call To Action slide'
                    : mode === 'versus'
                    ? 'Dress both pets in the same outfit for Slide 2'
                    : 'Dress pet in the selected product'
                }
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0">
                    <Sparkles size={17} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">
                      {mode === 'dog_cat_scene'
                        ? '2. Generate Scene (Gemini API)'
                        : mode === 'dual_costume'
                        ? '2. Generate 2 Costumes Comparison (CTA)'
                        : mode === 'versus'
                        ? '2. Generate "Who Wears It Better"'
                        : 'Generate AI Dressed Shot'}
                    </div>
                    <div className="text-[11px] opacity-85 font-normal">
                      {mode === 'dog_cat_scene'
                        ? 'Dog & Cat in background with costumes • 30-60s'
                        : mode === 'dual_costume'
                        ? 'Pet A in Outfit A & Pet B in Outfit B • 30-60s'
                        : mode === 'versus'
                        ? 'Both pets wearing selected product • 30-60s'
                        : 'AI Pet Fashion • Dressed in product'}
                    </div>
                  </div>
                </div>
                {generating && <Loader2 size={18} className="animate-spin" />}
              </button>

              {/* 4. Direct Upload Image for Overlays */}
              <button
                onClick={() => userImageUploadInputRef.current?.click()}
                className="w-full flex items-center justify-between px-5 py-2.5 rounded-xl text-xs font-semibold transition-all border shadow-xs"
                style={btnSecondary}
                title="Upload any image from your computer to apply templates and overlays"
              >
                <div className="flex items-center gap-2.5">
                  <Upload size={16} className="text-primary" />
                  <span className="font-bold">Upload Any Image (To Apply Overlays)</span>
                </div>
                <span className="text-[11px] opacity-75">Upload Photo</span>
              </button>

              {/* 5. Upload Gemini Result Button */}
              <button
                onClick={() => geminiResultInputRef.current?.click()}
                className="w-full flex items-center justify-between px-5 py-2 rounded-xl text-xs font-medium transition-all border opacity-90"
                style={btnSecondary}
                title="If you ran the prompt in Gemini web app, import your generated photo here to add overlays and download"
              >
                <div className="flex items-center gap-2.5">
                  <FolderOpen size={15} className="text-amber-500" />
                  <span>Import from Gemini App</span>
                </div>
                <span className="text-[11px] opacity-75">Import Image</span>
              </button>

              <input
                ref={userImageUploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadUserImage(file, 'Uploaded Photo');
                  e.target.value = '';
                }}
              />
              <input
                ref={geminiResultInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadGeminiResult(file);
                  e.target.value = '';
                }}
              />
            </div>

            {/* Validation hints */}
            {!generating && !stitching && (
              <div
                className="text-xs space-y-1 p-3 rounded-xl border"
                style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textSecondary }}
              >
                {mode === 'dog_cat_scene' ? (
                  <>
                    {!petImageA && <p>• Upload Dog photo (Image 1)</p>}
                    {!petImageB && <p>• Upload Cat photo (Image 2)</p>}
                    {!backgroundImage && <p>• Upload or pick a Background environment (Image 3)</p>}
                    {!effectiveCostumeImageA && <p>• Select or upload Costume for the Dog (Image 4)</p>}
                    {!effectiveCostumeImageB && <p>• Select or upload Costume for the Cat (Image 5)</p>}
                    {canStitchOriginals() && !canGenerate() && (
                      <p className="text-blue-600 dark:text-blue-400 font-semibold">
                        ✓ Pet photos and background ready! You can create an instant mockup right now.
                      </p>
                    )}
                    {canGenerate() && (
                      <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ All 5 images ready! Click <b>Copy Prompt for Gemini App</b> or <b>Generate with Gemini API</b>.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    {!petImageA && <p>• Upload Pet A photo to enable stitching and generation.</p>}
                    {mode !== 'single' && !petImageB && <p>• Upload Pet B photo for the comparison.</p>}
                    {!effectiveCostumeImageA && <p>• Select or upload product for Pet A.</p>}
                    {mode === 'dual_costume' && !effectiveCostumeImageB && <p>• Select or upload second product for Pet B.</p>}
                    {canStitchOriginals() && (
                      <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ Pet photos ready! You can combine originals for Slide 1 right now.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — Output & Interactive Editor */}
          <div className="space-y-5">

            {/* Active Working Image */}
            <div style={cardStyle} className="p-5 min-h-[420px] flex flex-col">
              <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: theme.colors.border }}>
                <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: theme.colors.text }}>
                  <Camera size={18} />
                  Current Image Canvas
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => userImageUploadInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors hover:opacity-90 shadow-2xs"
                    style={btnSecondary}
                    title="Upload any image directly from your computer to apply overlay templates"
                  >
                    <Upload size={13} />
                    <span>Upload Image</span>
                  </button>
                  {generatedImage && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Ready to Style
                    </span>
                  )}
                </div>
              </div>

              {error && (
                <div
                  className="p-3.5 rounded-xl text-sm mb-4 space-y-2"
                  style={{
                    backgroundColor: '#fef2f2',
                    color: '#b91c1c',
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: '#fecaca',
                  }}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertCircle size={16} />
                    <span>Generation Notice</span>
                  </div>
                  <p className="text-xs leading-relaxed">{error}</p>
                  <div className="pt-1 flex items-center gap-3">
                    <button
                      onClick={handleCopyPrompt}
                      className="text-xs font-bold underline text-purple-700 hover:text-purple-900 flex items-center gap-1"
                    >
                      <Sparkles size={12} />
                      Open Prompt for free Gemini Web App &rarr;
                    </button>
                  </div>
                </div>
              )}

              {generating ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
                  <div className="relative">
                    <Loader2 size={48} className="animate-spin" style={{ color: theme.colors.primary }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: theme.colors.text }}>
                      {mode === 'dual_costume'
                        ? 'AI is dressing both pets in their different costumes...'
                        : 'AI is dressing your furbaby in the selected product...'}
                    </p>
                    <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                      This typically takes 30-60 seconds. Sit tight!
                    </p>
                  </div>
                </div>
              ) : stitching ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
                  <Loader2 size={40} className="animate-spin" style={{ color: theme.colors.primary }} />
                  <p className="text-sm font-medium" style={{ color: theme.colors.text }}>
                    Stitching photos together into a 50/50 comparison...
                  </p>
                </div>
              ) : generatedImage ? (
                <div className="space-y-3">
                  {/* Overlay editor with persistent Template System */}
                  <ImageOverlayEditor
                    imageUrl={generatedImage}
                    mode={mode}
                    versusLayout={versusLayout}
                    onUploadImage={(dataUrl) => {
                      setGeneratedImage(dataUrl);
                      const newItem: GalleryItem = {
                        id: `upload-${Date.now()}`,
                        url: dataUrl,
                        label: 'Uploaded Image (Overlays)',
                        type: 'original',
                        createdAt: Date.now(),
                      };
                      setGallery(prev => [newItem, ...prev]);
                    }}
                  />

                  <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: theme.colors.border }}>
                    <button
                      onClick={() => userImageUploadInputRef.current?.click()}
                      className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors border"
                      style={btnSecondary}
                      title="Upload or swap the image to apply templates onto"
                    >
                      <Upload size={14} />
                      Upload / Replace Image
                    </button>
                    <a
                      href={generatedImage}
                      download={`pet-studio-raw-${Date.now()}.jpg`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors"
                      style={btnSecondary}
                    >
                      <Download size={14} />
                      Download Raw (No Overlays)
                    </a>
                    <button
                      onClick={handleGenerate}
                      disabled={generating || !canGenerate()}
                      className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
                      style={btnSecondary}
                    >
                      <RefreshCw size={14} />
                      Regenerate AI
                    </button>
                    <button
                      onClick={() => geminiResultInputRef.current?.click()}
                      className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors"
                      style={btnSecondary}
                      title="Upload an image generated in Gemini web app"
                    >
                      <FolderOpen size={14} className="text-amber-500" />
                      Import from Gemini
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsCanvasDragging(true);
                  }}
                  onDragLeave={() => setIsCanvasDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsCanvasDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleUploadUserImage(file, 'Dropped Photo');
                  }}
                  className={`flex-1 flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all text-center ${
                    isCanvasDragging ? 'scale-[1.01]' : ''
                  }`}
                  style={{
                    borderColor: isCanvasDragging ? theme.colors.primary : theme.colors.border,
                    backgroundColor: isCanvasDragging ? 'rgba(0,0,0,0.04)' : 'transparent',
                    minHeight: 400
                  }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform hover:scale-105"
                    style={{ backgroundColor: theme.colors.secondary, color: theme.colors.primary }}
                  >
                    <Upload size={32} />
                  </div>

                  <h3 className="text-base font-bold mb-1" style={{ color: theme.colors.text }}>
                    Upload Your Image to Apply Overlay Templates
                  </h3>
                  <p className="text-xs max-w-md mb-5 leading-relaxed" style={{ color: theme.colors.textSecondary }}>
                    Upload any photo (from Gemini web app, phone, camera, or Canva) to immediately apply TikTok meme text, Call-To-Action buttons, and brand logo overlays.
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => userImageUploadInputRef.current?.click()}
                      className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-sm hover:brightness-105"
                      style={btnPrimary}
                    >
                      <Upload size={16} />
                      Upload Photo for Overlays
                    </button>

                    <button
                      onClick={() => geminiResultInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors border"
                      style={btnSecondary}
                    >
                      <FolderOpen size={15} className="text-amber-500" />
                      Import from Gemini App
                    </button>
                  </div>
                  <span className="text-[11px] mt-2.5" style={{ color: theme.colors.textSecondary }}>
                    Drag & drop anywhere here • Supports JPG, PNG, WebP
                  </span>

                  {/* Preset Templates teaser */}
                  <div className="mt-6 pt-5 border-t w-full max-w-sm" style={{ borderColor: theme.colors.border }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.colors.textSecondary }}>
                      Ready-to-use Templates
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px]" style={{ color: theme.colors.textSecondary }}>
                      <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 border" style={{ borderColor: theme.colors.border }}>
                        TikTok "Who Wears It Better"
                      </span>
                      <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 border" style={{ borderColor: theme.colors.border }}>
                        Shop Both • Link in Bio CTA
                      </span>
                      <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 border" style={{ borderColor: theme.colors.border }}>
                        Dog & Cat Besties Badges
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Session Gallery (Slides Carousel) */}
            {gallery.length > 0 && (
              <div style={cardStyle} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: theme.colors.text }}>
                    <ImageIcon size={18} />
                    Session Gallery ({gallery.length})
                  </h2>
                  <span className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    Click any slide to view, style, or apply templates
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {gallery.map((item) => {
                    const isSelected = generatedImage === item.url;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setGeneratedImage(item.url)}
                        className="relative aspect-square rounded-xl overflow-hidden transition-all border group text-left"
                        style={{
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                          borderWidth: isSelected ? 2 : 1,
                          boxShadow: isSelected ? '0 0 0 2px rgba(59,130,246,0.4)' : undefined,
                        }}
                      >
                        <Image
                          src={item.url}
                          alt={item.label}
                          fill
                          className="object-cover"
                          sizes="160px"
                          unoptimized
                        />
                        <div className="absolute top-2 left-2 z-10">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded shadow"
                            style={{
                              backgroundColor: item.label.includes('Slide 1')
                                ? '#2563eb'
                                : item.label.includes('Slide 3')
                                ? '#ca8a04'
                                : item.label.includes('Dog & Cat') || item.label.includes('Gemini App')
                                ? '#9333ea'
                                : '#7c3aed',
                              color: '#fff',
                            }}
                          >
                            {item.label.includes('Slide 1')
                              ? 'Slide 1 (Mockup)'
                              : item.label.includes('Slide 3')
                              ? 'Slide 3 (CTA)'
                              : item.label.includes('Gemini App')
                              ? 'Gemini Web'
                              : 'AI Scene'}
                          </span>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-xs text-white text-[11px] px-2 py-1.5 truncate font-medium z-10">
                          {item.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gemini Web App Prompt Modal */}
        {showPromptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderStyle: 'solid',
                color: theme.colors.text
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: theme.colors.border }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Gemini Web App Prompt Ready!</h3>
                    <p className="text-[11px]" style={{ color: theme.colors.textSecondary }}>
                      Follow these 4 simple steps to generate for free in the Gemini app
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  aria-label="Close prompt modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="text-xs space-y-2 p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-900/60" style={{ borderColor: theme.colors.border }}>
                <div className="font-semibold text-sm flex items-center justify-between">
                  <span>Free Workflow (No API credits required):</span>
                  <a
                    href="https://gemini.google.com/app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold"
                  >
                    Open gemini.google.com <ExternalLink size={13} />
                  </a>
                </div>
                <ol className="list-decimal pl-4 space-y-1.5 opacity-90 text-[12px]">
                  <li>
                    Open <b>gemini.google.com</b> in your browser.
                  </li>
                  <li>
                    Click the <b>+ (Attach)</b> icon in Gemini and attach your reference images in order:
                    {mode === 'dog_cat_scene' ? (
                      <div className="mt-1 p-2 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold space-y-0.5 text-[11px]">
                        <div>1. 🐶 Dog Photo</div>
                        <div>2. 🐱 Cat Photo</div>
                        <div>3. 🖼️ Background Environment Photo</div>
                        <div>4. 👕 Dog Costume Photo ({effectiveCostumeNameA})</div>
                        <div>5. 👗 Cat Costume Photo ({effectiveCostumeNameB})</div>
                      </div>
                    ) : mode === 'dual_costume' ? (
                      <div className="mt-1 p-2 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold space-y-0.5 text-[11px]">
                        <div>1. Pet A Photo • 2. Pet B Photo • 3. Costume A • 4. Costume B</div>
                      </div>
                    ) : (
                      <div className="mt-1 p-2 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold text-[11px]">
                        Pet photo + Product costume image
                      </div>
                    )}
                  </li>
                  <li>
                    Paste the prompt (already copied to your clipboard!) into the message box and hit <b>Send</b>.
                  </li>
                  <li>
                    When Gemini generates your image, download it and click <b>Upload Result Image from Gemini</b> in Pet Studio to apply overlays, badges, and templates!
                  </li>
                </ol>
              </div>

              {/* Prompt Content Preview */}
              <div className="space-y-1.5 flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider">Prompt Text (Copied):</span>
                  {promptCopied && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Check size={14} /> Copied to Clipboard!
                    </span>
                  )}
                </div>
                <textarea
                  readOnly
                  value={getStudioPromptText()}
                  rows={7}
                  className="w-full p-3 font-mono text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border outline-none resize-none flex-1 overflow-y-auto"
                  style={{ borderColor: theme.colors.border }}
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: theme.colors.border }}>
                <a
                  href="https://gemini.google.com/app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-xs"
                >
                  <ExternalLink size={14} />
                  Open Gemini Web App
                </a>

                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(getStudioPromptText());
                      setPromptCopied(true);
                      setTimeout(() => setPromptCopied(false), 2500);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors border"
                    style={btnSecondary}
                  >
                    {promptCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    {promptCopied ? 'Copied!' : 'Copy Prompt Again'}
                  </button>
                  <button
                    onClick={() => setShowPromptModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white"
                    style={{ backgroundColor: theme.colors.primary }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
