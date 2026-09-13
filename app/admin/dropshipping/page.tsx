'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '../components/AdminLayout';
import { 
  Truck, 
  Search, 
  Download, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Image as ImageIcon, 
  AlertCircle, 
  RefreshCw, 
  Key, 
  Sliders, 
  Eye, 
  Package, 
  CheckCircle2, 
  X,
  ChevronRight,
  Pencil,
  ArrowRight,
  Wand2,
  Copy,
  UploadCloud,
  Camera,
  Zap,
  Home,
  Trees
} from 'lucide-react';
import { AliExpressProductDetails, AliExpressVariant } from '@/lib/aliexpress/types';
import { extractCleanSizeCode } from '@/lib/aliexpress/client';

interface ProductType {
  producttypeid: string;
  name: string;
}

export default function DropshippingPage() {
  const [activeTab, setActiveTab] = useState<'import' | 'orders' | 'settings'>('import');

  // Input state
  const [urlOrId, setUrlOrId] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Staged Product customizer state
  const [stagedProduct, setStagedProduct] = useState<AliExpressProductDetails | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [selectedProductTypeId, setSelectedProductTypeId] = useState<string>('');
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [sellingPrice, setSellingPrice] = useState<string>('24.99');
  const [compareAtPrice, setCompareAtPrice] = useState<string>('34.99');
  const [supplierBaseCost, setSupplierBaseCost] = useState<string>('0.00');
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
  const [primaryImageUrl, setPrimaryImageUrl] = useState<string>('');
  const [selectedVariants, setSelectedVariants] = useState<Array<AliExpressVariant & { isIncluded: boolean; customSku?: string; customPrice?: number }>>([]);
  const [selectedColourFilter, setSelectedColourFilter] = useState<string>('all');

  // Import execution state
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<{ productId: string; name: string } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // AI Studio Image Generation State
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [studioSourceImage, setStudioSourceImage] = useState<string>('');
  const [studioBreed, setStudioBreed] = useState<string>('Labrador Retriever');
  const [studioPreset, setStudioPreset] = useState<'clean_studio' | 'dynamic_action' | 'british_home' | 'outdoor_park' | 'custom'>('clean_studio');
  const [studioCustomPrompt, setStudioCustomPrompt] = useState<string>('');
  const [synthesizedConfig, setSynthesizedConfig] = useState<{ breed: string; preset: string; sourceImage: string; customPrompt: string } | null>(null);
  const [isSynthesizingPrompt, setIsSynthesizingPrompt] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [synthesizedAnalysis, setSynthesizedAnalysis] = useState<string | null>(null);
  const [synthesizedPrompt, setSynthesizedPrompt] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [studioError, setStudioError] = useState<string | null>(null);
  const [studioRequiresBilling, setStudioRequiresBilling] = useState(false);
  const [hasCopiedPrompt, setHasCopiedPrompt] = useState(false);
  const [isUploadingManual, setIsUploadingManual] = useState(false);

  // Settings & Connection state
  const [authStatus, setAuthStatus] = useState<{ isConnected: boolean; authUrl: string; tokenExpiresAt?: string | null; hasGeminiKey?: boolean } | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [isSavingGeminiKey, setIsSavingGeminiKey] = useState(false);
  const [geminiKeyMessage, setGeminiKeyMessage] = useState<string | null>(null);
  const [isSuggestingTitle, setIsSuggestingTitle] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [titleBadge, setTitleBadge] = useState<string | null>(null);
  const [descBadge, setDescBadge] = useState<string | null>(null);

  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [fulfillingOrderId, setFulfillingOrderId] = useState<string | null>(null);
  const [orderActionMessage, setOrderActionMessage] = useState<string | null>(null);

  // Load product types on mount
  useEffect(() => {
    fetch('/api/product-types')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.productTypes)) {
          setProductTypes(data.productTypes);
          if (data.productTypes.length > 0) {
            setSelectedProductTypeId(data.productTypes[0].producttypeid);
          }
        }
      })
      .catch(() => {});

    // Check auth status
    fetchAuthStatus();
  }, []);

  const fetchAuthStatus = async () => {
    try {
      const res = await fetch('/api/aliexpress/auth');
      const data = await res.json();
      if (data.success) {
        setAuthStatus(data);
      }
    } catch {}
  };

  // Load orders when switching to orders tab
  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab]);

  const loadOrders = async () => {
    try {
      setIsLoadingOrders(true);
      const res = await fetch('/api/aliexpress/orders');
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Handle Fetching Product from AliExpress
  const handleFetch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlOrId.trim()) return;

    try {
      setIsFetching(true);
      setFetchError(null);
      setImportSuccess(null);
      setImportError(null);

      const res = await fetch('/api/aliexpress/fetch-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlOrId: urlOrId.trim() })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFetchError(data.error || 'Failed to fetch product from AliExpress');
        return;
      }

      const prod: AliExpressProductDetails = data.product;
      setStagedProduct(prod);

      // Populate editable fields
      const cleanedName = cleanTitleForPetBrand(prod.title);
      setCustomTitle(cleanedName);
      setCustomDescription(enhanceDescriptionForPetParents(prod.description, cleanedName));
      
      const baseCost = prod.priceMin ? prod.priceMin.toFixed(2) : '0.00';
      setSupplierBaseCost(baseCost);

      const costNum = prod.priceMin || 9.99;
      // High-converting UK pet retail markup:
      // Sub-£10 items: 2.2x-2.4x markup (e.g. £5.79 cost -> £13.99 sale)
      // £10-£25 items: ~1.6x markup (e.g. £15 cost -> £24.99 sale)
      // >£25 items: ~1.45x markup
      const defaultSell = costNum < 10
        ? (Math.ceil(costNum * 2.3) - 0.01).toFixed(2)
        : costNum < 25
          ? (Math.ceil(costNum * 1.6) - 0.01).toFixed(2)
          : (Math.ceil(costNum * 1.45) - 0.01).toFixed(2);

      const defaultOriginal = prod.originalPrice && prod.originalPrice > parseFloat(defaultSell)
        ? prod.originalPrice.toFixed(2)
        : (Math.ceil(parseFloat(defaultSell) * 1.4) - 0.01).toFixed(2);

      setSellingPrice(defaultSell);
      setCompareAtPrice(defaultOriginal);

      setSelectedImageUrls(prod.images || []);
      setPrimaryImageUrl(prod.images?.[0] || '');

      setSelectedVariants(
        (prod.variants || []).map((v, idx) => {
          let sku = (v.skuCode || v.skuId || `SKU-${idx + 1}`).trim().toUpperCase();
          const sizeProp = v.properties.find((p) => /size/i.test(p.name))?.value;
          if (sizeProp) {
            const cleanSize = extractCleanSizeCode(sizeProp);
            if (cleanSize && !sku.endsWith(`-${cleanSize}`) && !sku.includes(`-${cleanSize}-`)) {
              sku = `${sku}-${cleanSize}`;
            }
          }
          return {
            ...v,
            skuCode: sku,
            customSku: sku,
            isIncluded: true,
            customPrice: Number(defaultSell)
          };
        })
      );
      setSelectedColourFilter('all');
    } catch (err: any) {
      setFetchError(err.message || 'An error occurred while contacting AliExpress');
    } finally {
      setIsFetching(false);
    }
  };

  // Cleaner function: Trims keyword spam into clean editorial product title
  const cleanTitleForPetBrand = (rawTitle: string): string => {
    let clean = rawTitle
      .replace(/aliexpress|drop\s*shipping|wholesale|free\s*shipping|hot\s*sale|new\s*arrival|202\d|factory\s*price/gi, '')
      .replace(/[\(\)\[\]\{\}]/g, '')
      .replace(/,\s*,/g, ',')
      .replace(/\s+/g, ' ')
      .trim();

    // Cap to readable length
    const words = clean.split(' ').slice(0, 7).join(' ');
    return words || 'Cozy Pet Costume & Accessory';
  };

  // Tone of Voice Enhancer: Formats text into friendly, knowledgeable UK pet parent copy
  const enhanceDescriptionForPetParents = (rawDesc: string, prodTitle: string): string => {
    return `Give your beloved furbaby the ultimate in tail-wagging comfort and style! Designed with pure pet happiness in mind, the ${prodTitle} delivers the perfect blend of cozy warmth, effortless dressing, and delightful charm for family gatherings, park walks, and celebrations.

Why Devoted Pet Parents Love It:
• Exceptionally Soft & Gentle: Crafted from skin-friendly, breathable fabric that won't pinch, rub, or tug against delicate fur.
• Fuss-Free Dressing: Engineered with quick, secure fastenings for a snug fit that stays comfortably in place through running and play.
• Safe & Lightweight: Designed for unrestricted movement so your four-legged companion can strut and play happily.

Sizing & Fit:
We always recommend measuring your pet's neck and chest girth before ordering to ensure the most comfortable, tail-wagging fit.

Care Instructions:
Gentle hand or machine wash on cold cycle (30°C). Air dry naturally to keep the fabric irresistibly soft and vibrant.`;
  };

  // AI Title Suggestion Handler (Updates ONLY the Title)
  const handleSuggestTitle = async () => {
    if (!stagedProduct) return;
    try {
      setIsSuggestingTitle(true);
      setTitleBadge(null);

      const categoryName = productTypes.find((p) => p.producttypeid === selectedProductTypeId)?.name || 'Pet Accessories';

      const res = await fetch('/api/ai/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle || stagedProduct.title,
          rawDescription: stagedProduct.description,
          category: categoryName,
          target: 'title'
        })
      });

      const data = await res.json();
      if (data.success && data.title) {
        setCustomTitle(data.title);
        setTitleBadge(data.isAi ? 'AI Suggested' : 'Cleaned Title');
      }
    } catch (err) {
      console.error(err);
      setCustomTitle(cleanTitleForPetBrand(stagedProduct.title));
      setTitleBadge('Cleaned Title');
    } finally {
      setIsSuggestingTitle(false);
    }
  };

  // AI Description Generation Handler (Updates ONLY the Description)
  const handleGenerateDescription = async () => {
    if (!stagedProduct) return;
    try {
      setIsGeneratingDescription(true);
      setDescBadge(null);

      const categoryName = productTypes.find((p) => p.producttypeid === selectedProductTypeId)?.name || 'Pet Accessories';

      const res = await fetch('/api/ai/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle || stagedProduct.title,
          rawDescription: stagedProduct.description,
          category: categoryName,
          target: 'description'
        })
      });

      const data = await res.json();
      if (data.success && data.description) {
        setCustomDescription(data.description);
        setDescBadge(data.isAi ? `Written by Gemini AI (${data.modelUsed || '1.5 Flash'})` : 'Formatted with British Pet Brand Persona');
      }
    } catch (err) {
      console.error(err);
      setCustomDescription(enhanceDescriptionForPetParents(stagedProduct.description, customTitle));
      setDescBadge('Formatted with British Pet Brand Persona');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Save Gemini API Key
  const handleSaveGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiApiKeyInput.trim()) return;

    try {
      setIsSavingGeminiKey(true);
      setGeminiKeyMessage(null);
      const res = await fetch('/api/aliexpress/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: geminiApiKeyInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setGeminiKeyMessage('Gemini API key saved successfully!');
        setGeminiApiKeyInput('');
        fetchAuthStatus();
      } else {
        setGeminiKeyMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setGeminiKeyMessage(`Failed: ${err.message}`);
    } finally {
      setIsSavingGeminiKey(false);
    }
  };

  // Toggle image selection
  const toggleImageSelection = (imgUrl: string) => {
    setSelectedImageUrls((prev) => {
      if (prev.includes(imgUrl)) {
        if (prev.length === 1) return prev; // keep at least one
        const updated = prev.filter((u) => u !== imgUrl);
        if (primaryImageUrl === imgUrl) {
          setPrimaryImageUrl(updated[0] || '');
        }
        return updated;
      } else {
        return [...prev, imgUrl];
      }
    });
  };

  // Open AI Studio Modal
  const openImageStudioModal = (imgUrl?: string) => {
    const target = imgUrl || primaryImageUrl || stagedProduct?.images?.[0] || '';
    setStudioSourceImage(target);
    setStudioError(null);
    setStudioRequiresBilling(false);
    setSynthesizedAnalysis(null);
    setSynthesizedPrompt(null);
    setGeneratedImageUrl(null);
    setIsStudioOpen(true);
  };

  // Synthesize Studio Prompt with Gemini 3.6 Flash
  const handleSynthesizePrompt = async () => {
    try {
      setIsSynthesizingPrompt(true);
      setStudioError(null);
      setStudioRequiresBilling(false);

      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'synthesize-prompt',
          sourceImageUrl: studioSourceImage,
          productTitle: customTitle || stagedProduct?.title || 'Pet Costume',
          breed: studioBreed,
          scenePreset: studioPreset,
          customInstructions: studioCustomPrompt
        })
      });

      const data = await res.json();
      if (data.success) {
        setSynthesizedAnalysis(data.analysis);
        setSynthesizedPrompt(data.imagenPrompt);
        setSynthesizedConfig({
          breed: studioBreed,
          preset: studioPreset,
          sourceImage: studioSourceImage,
          customPrompt: studioCustomPrompt
        });
      } else {
        setStudioError(data.error || 'Failed to synthesize prompt');
      }
    } catch (err: any) {
      setStudioError(err.message || 'Error communicating with Gemini');
    } finally {
      setIsSynthesizingPrompt(false);
    }
  };

  // 1-Click Generate with Imagen 3
  const handleGenerateImagen = async () => {
    try {
      setIsGeneratingImage(true);
      setStudioError(null);
      setStudioRequiresBilling(false);

      // Verify that the prompt aligns with the currently selected breed, preset, image, and directions
      const isConfigUnchanged =
        synthesizedConfig &&
        synthesizedConfig.breed === studioBreed &&
        synthesizedConfig.preset === studioPreset &&
        synthesizedConfig.sourceImage === studioSourceImage &&
        synthesizedConfig.customPrompt === studioCustomPrompt;

      const promptToSend = isConfigUnchanged && synthesizedPrompt ? synthesizedPrompt : undefined;

      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          prompt: promptToSend,
          sourceImageUrl: studioSourceImage,
          productTitle: customTitle || stagedProduct?.title || 'Pet Costume',
          breed: studioBreed,
          scenePreset: studioPreset,
          customInstructions: studioCustomPrompt
        })
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        if (data.analysis) setSynthesizedAnalysis(data.analysis);
        if (data.promptUsed) {
          setSynthesizedPrompt(data.promptUsed);
          setSynthesizedConfig({
            breed: studioBreed,
            preset: studioPreset,
            sourceImage: studioSourceImage,
            customPrompt: studioCustomPrompt
          });
        }
      } else {
        if (data.requiresBilling) {
          setStudioRequiresBilling(true);
        }
        setStudioError(data.error || 'Image generation failed');
        if (data.promptUsed) setSynthesizedPrompt(data.promptUsed);
        if (data.analysis) setSynthesizedAnalysis(data.analysis);
      }
    } catch (err: any) {
      setStudioError(err.message || 'Network error calling Image generation');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Add Generated Image into Staged Product Gallery
  const handleApplyGeneratedImage = (makePrimary: boolean = true) => {
    if (!generatedImageUrl) return;

    setSelectedImageUrls((prev) => {
      const next = prev.includes(generatedImageUrl) ? prev : [generatedImageUrl, ...prev];
      return next;
    });

    if (stagedProduct) {
      setStagedProduct({
        ...stagedProduct,
        images: stagedProduct.images.includes(generatedImageUrl)
          ? stagedProduct.images
          : [generatedImageUrl, ...stagedProduct.images]
      });
    }

    if (makePrimary) {
      setPrimaryImageUrl(generatedImageUrl);
    }

    setIsStudioOpen(false);
  };

  // Copy prompt to clipboard
  const handleCopyPrompt = () => {
    if (!synthesizedPrompt) return;
    navigator.clipboard.writeText(synthesizedPrompt);
    setHasCopiedPrompt(true);
    setTimeout(() => setHasCopiedPrompt(false), 2000);
  };

  // Handle manual file upload from user's Gemini chat
  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingManual(true);
      setStudioError(null);

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const res = await fetch('/api/ai/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'upload-manual',
              base64Data,
              mimeType: file.type
            })
          });

          const data = await res.json();
          if (data.success && data.imageUrl) {
            setGeneratedImageUrl(data.imageUrl);
          } else {
            setStudioError(data.error || 'Failed to upload image');
          }
        } catch (uploadErr: any) {
          setStudioError(uploadErr.message || 'Upload processing error');
        } finally {
          setIsUploadingManual(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setStudioError(err.message || 'Upload failed');
      setIsUploadingManual(false);
    }
  };

  // Execute Import
  const handleImportToStore = async () => {
    if (!stagedProduct) return;
    if (!customTitle.trim()) {
      alert('Please enter a product title');
      return;
    }

    try {
      setIsImporting(true);
      setImportError(null);

      // Reorder images so primary image is first
      const orderedImages = [
        primaryImageUrl,
        ...selectedImageUrls.filter((u) => u !== primaryImageUrl)
      ].filter(Boolean);

      const includedVariants = selectedVariants.filter((v) => v.isIncluded);
      const sellPriceNum = parseFloat(sellingPrice) || 24.99;
      const comparePriceNum = compareAtPrice ? parseFloat(compareAtPrice) : null;

      let promoDiscount: number | null = null;
      if (comparePriceNum && comparePriceNum > sellPriceNum) {
        promoDiscount = Math.round(((comparePriceNum - sellPriceNum) / comparePriceNum) * 100);
      }

      const payload = {
        aliexpressProductId: stagedProduct.productId,
        aliexpressProductUrl: stagedProduct.sourceUrl,
        name: customTitle.trim(),
        description: customDescription.trim(),
        rfproducttypeid: 1,
        producttypeid: selectedProductTypeId,
        sellingPrice: sellPriceNum,
        compareAtPrice: comparePriceNum,
        promodiscountpercent: promoDiscount,
        images: orderedImages,
        selectedVariants: includedVariants.map((v) => {
          let variantSku = (v.customSku || v.skuCode || v.skuId || '').trim().toUpperCase();
          const sizeVal = v.properties.find((p) => /size/i.test(p.name))?.value;
          const colourVal = v.properties.find((p) => /colou?r/i.test(p.name))?.value;

          if (sizeVal) {
            const cleanSize = extractCleanSizeCode(sizeVal);
            if (cleanSize && !variantSku.endsWith(`-${cleanSize}`) && !variantSku.includes(`-${cleanSize}-`)) {
              variantSku = `${variantSku}-${cleanSize}`;
            }
          }

          return {
            skuId: v.skuId,
            sku: variantSku,
            price: v.customPrice || sellPriceNum,
            compareAtPrice: comparePriceNum,
            quantity: v.stock || 40,
            size: sizeVal || undefined,
            colour: colourVal || undefined,
            imageUrl: v.imageUrl || orderedImages[0]
          };
        })
      };

      const res = await fetch('/api/aliexpress/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        setImportError(result.error || 'Failed to import product');
        return;
      }

      setImportSuccess({
        productId: result.productId,
        name: customTitle
      });

      // Reset staged view
      setStagedProduct(null);
      setUrlOrId('');
    } catch (err: any) {
      setImportError(err.message || 'Error occurred during import');
    } finally {
      setIsImporting(false);
    }
  };

  // Save manual token in settings
  const handleSaveManualToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;

    try {
      setIsSavingToken(true);
      setSettingsMessage(null);
      const res = await fetch('/api/aliexpress/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: manualToken.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setSettingsMessage('Access token saved successfully!');
        setManualToken('');
        fetchAuthStatus();
      } else {
        setSettingsMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setSettingsMessage(`Failed: ${err.message}`);
    } finally {
      setIsSavingToken(false);
    }
  };

  // Fulfill order action
  const handleFulfillOrder = async (orderId: string) => {
    try {
      setFulfillingOrderId(orderId);
      setOrderActionMessage(null);

      const res = await fetch('/api/aliexpress/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fulfill', orderId })
      });
      const data = await res.json();

      if (data.success) {
        setOrderActionMessage(`Order ${orderId} successfully forwarded to AliExpress (Order ID: ${data.aliexpressOrderId})`);
        loadOrders();
      } else {
        setOrderActionMessage(`Failed to fulfill order: ${data.error}`);
      }
    } catch (err: any) {
      setOrderActionMessage(`Error: ${err.message}`);
    } finally {
      setFulfillingOrderId(null);
    }
  };

  return (
    <AdminLayout currentPath="/admin/dropshipping">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">
                Fulfillment & Supplier Sync
              </span>
              {authStatus?.isConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  AliExpress Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Direct Scraper Mode
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900 tracking-tight">
              AliExpress Dropshipping Hub
            </h1>
          </div>

          {/* Tab navigation */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setActiveTab('import')}
              className={`flex-1 sm:flex-initial px-3.5 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap text-center touch-manipulation ${
                activeTab === 'import'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Product Importer
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 sm:flex-initial px-3.5 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap text-center touch-manipulation ${
                activeTab === 'orders'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Order Fulfillment
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 sm:flex-initial px-3.5 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap text-center touch-manipulation ${
                activeTab === 'settings'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Settings & API
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: PRODUCT IMPORTER & STAGING CUSTOMIZER                */}
        {/* ============================================================ */}
        {activeTab === 'import' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Import Success Banner */}
            {importSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900">
                      Product Successfully Added to Store!
                    </h4>
                    <p className="text-xs text-emerald-700">
                      &quot;{importSuccess.name}&quot; is now live with all images and variants.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                  <Link
                    href={`/products/${importSuccess.productId}`}
                    target="_blank"
                    className="flex-1 sm:flex-initial text-center px-3 py-2 sm:py-1.5 text-xs font-semibold bg-white border border-emerald-300 text-emerald-800 rounded-md hover:bg-emerald-50 flex items-center justify-center gap-1.5"
                  >
                    <span>View on Store</span>
                    <ExternalLink size={12} />
                  </Link>
                  <Link
                    href="/admin/products"
                    className="flex-1 sm:flex-initial text-center px-3 py-2 sm:py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded-md hover:bg-emerald-800"
                  >
                    Manage in Items
                  </Link>
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-6 shadow-sm">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Import by URL or Product ID
              </h2>
              <p className="text-xs text-neutral-600 mb-3 sm:mb-4">
                Enter any AliExpress product URL or item ID to pull product details, images, sizes, and specs into your customizable staging editor.
              </p>

              <form onSubmit={handleFetch} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={urlOrId}
                    onChange={(e) => setUrlOrId(e.target.value)}
                    placeholder="e.g. https://www.aliexpress.com/item/1005006247926174.html or 1005006247926174"
                    className="w-full px-4 py-3 sm:py-2.5 text-base sm:text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-neutral-50/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isFetching || !urlOrId.trim()}
                  className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-neutral-900 text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0 touch-manipulation min-h-[44px]"
                >
                  {isFetching ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Fetching from AliExpress...</span>
                    </>
                  ) : (
                    <>
                      <Download size={15} />
                      <span>Fetch Product</span>
                    </>
                  )}
                </button>
              </form>

              {fetchError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{fetchError}</span>
                </div>
              )}
            </div>

            {/* STAGING WORKSTATION (When a product is fetched) */}
            {stagedProduct && (
              <div className="bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-8">
                {/* Staging Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-200 gap-4">
                  <div>
                    <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-400">
                      Product Staging & Customization
                    </span>
                    <h3 className="text-xl font-bold text-neutral-900 mt-0.5">
                      Review & Customise Before Publishing
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={stagedProduct.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1 underline"
                    >
                      <span>Original Supplier Link</span>
                      <ExternalLink size={12} />
                    </a>
                    <button
                      type="button"
                      onClick={() => setStagedProduct(null)}
                      className="text-xs text-neutral-400 hover:text-neutral-600"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Section A: Title & Category */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                        Product Title
                      </label>
                      {titleBadge && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          {titleBadge}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSuggestTitle}
                        disabled={isSuggestingTitle}
                        className="text-xs text-neutral-900 hover:text-black font-semibold flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
                      >
                        {isSuggestingTitle ? (
                          <>
                            <RefreshCw size={11} className="animate-spin" />
                            <span>Suggesting...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={11} />
                            <span>AI Suggest Title</span>
                          </>
                        )}
                      </button>
                      <span className="text-neutral-300">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomTitle(cleanTitleForPetBrand(stagedProduct.title));
                          setTitleBadge('Clean Filtered');
                        }}
                        className="text-xs text-neutral-500 hover:text-neutral-800"
                      >
                        Clean Filter
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block mb-1.5">
                      Store Category
                    </label>
                    <select
                      value={selectedProductTypeId}
                      onChange={(e) => setSelectedProductTypeId(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                    >
                      {productTypes.map((pt) => (
                        <option key={pt.producttypeid} value={pt.producttypeid}>
                          {pt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Section B: British Pet Parent Tone Description */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                        Product Description (British Pet Parent Tone)
                      </label>
                      {descBadge && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          {descBadge}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateDescription}
                      disabled={isGeneratingDescription}
                      className="text-xs text-neutral-900 hover:text-neutral-700 font-semibold flex items-center gap-1.5 px-3 py-1 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors self-start sm:self-auto"
                    >
                      {isGeneratingDescription ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Generating with Gemini AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} />
                          <span>Generate with Gemini AI</span>
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    className="w-full px-4 py-3 text-base sm:text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 font-sans leading-relaxed"
                  />
                  <p className="text-[11px] text-neutral-400">
                    Formatted in conversational British English with warm, affectionate pet terminology (&apos;furbaby&apos;, &apos;pet parent&apos;, &apos;tail-wagging&apos;).
                  </p>
                </div>

                {/* Section C: Image Selector */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                        Product Images
                      </label>
                      <p className="text-xs text-neutral-500">
                        Select which images to include ({selectedImageUrls.length} selected). Tap &quot;Set Primary&quot; to set the main photo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openImageStudioModal(primaryImageUrl || stagedProduct.images?.[0])}
                      className="inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-bold bg-neutral-900 hover:bg-black text-white rounded-lg transition-colors shadow-sm self-start sm:self-auto touch-manipulation min-h-[38px]"
                    >
                      <Sparkles size={13} className="text-amber-400" />
                      <span>AI Studio: Re-imagine Scene</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 sm:gap-3">
                    {(stagedProduct.images || []).map((imgUrl, idx) => {
                      const isSelected = selectedImageUrls.includes(imgUrl);
                      const isPrimary = primaryImageUrl === imgUrl;

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (!isPrimary) {
                              setPrimaryImageUrl(imgUrl);
                              if (!isSelected) {
                                setSelectedImageUrls((prev) => [...prev, imgUrl]);
                              }
                            }
                          }}
                          className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                            isPrimary
                              ? 'border-neutral-950 ring-2 ring-neutral-950/20 shadow-sm'
                              : isSelected
                              ? 'border-neutral-900'
                              : 'border-neutral-200 opacity-60'
                          }`}
                        >
                          <div className="aspect-square bg-neutral-100">
                            <img
                              src={imgUrl}
                              alt="Import Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/Logo.jpg';
                              }}
                            />
                          </div>

                          {/* Re-imagine button - always visible on mobile for tap */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openImageStudioModal(imgUrl);
                            }}
                            title="Re-imagine this product photo with AI"
                            className="absolute top-1.5 left-1.5 p-1.5 rounded-md bg-white/95 hover:bg-white text-neutral-800 shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10 touch-manipulation"
                          >
                            <Wand2 size={13} className="text-neutral-900" />
                          </button>

                          {/* Checkbox badge */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleImageSelection(imgUrl);
                            }}
                            className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center transition-colors z-10 touch-manipulation ${
                              isSelected ? 'bg-neutral-950 text-white shadow-sm' : 'bg-white/90 text-neutral-400 border border-neutral-300'
                            }`}
                          >
                            <Check size={14} className={isSelected ? 'opacity-100' : 'opacity-0'} />
                          </button>

                          {/* Primary marker / set primary button */}
                          {isPrimary ? (
                            <span className="absolute bottom-1 left-1 right-1 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider bg-neutral-950 text-white rounded shadow-sm">
                              Primary
                            </span>
                          ) : (
                            isSelected && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPrimaryImageUrl(imgUrl);
                                }}
                                className="absolute bottom-1 left-1 right-1 py-0.5 text-center text-[10px] font-semibold bg-white/95 text-neutral-900 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation shadow-sm"
                              >
                                Set Primary
                              </button>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section D: Pricing & Margins */}
                <div className="bg-neutral-50 rounded-xl p-4 sm:p-5 border border-neutral-200">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                      Pricing & Profit Margin (£ GBP)
                    </h4>
                    <span className="text-[10px] text-neutral-500 bg-white px-2 py-0.5 rounded border border-neutral-200 font-medium">
                      Live Supplier Rates
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div>
                      <label className="text-[11px] font-medium text-neutral-700 block mb-1">
                        Supplier Base Cost (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={supplierBaseCost}
                        onChange={(e) => setSupplierBaseCost(e.target.value)}
                        className="w-full px-3 py-2 text-base sm:text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-neutral-700 block mb-1">
                        Selling Price (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={sellingPrice}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSellingPrice(val);
                          const numVal = parseFloat(val);
                          if (!isNaN(numVal) && numVal > 0) {
                            setSelectedVariants((prev) =>
                              prev.map((v) => ({
                                ...v,
                                customPrice: numVal
                              }))
                            );
                          }
                        }}
                        className="w-full px-3 py-2 text-base sm:text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-neutral-700 block mb-1">
                        Original Price (£ Compare At)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={compareAtPrice}
                        onChange={(e) => setCompareAtPrice(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
                      />
                    </div>

                    <div>
                      <span className="text-[11px] font-medium text-neutral-500 block mb-1">
                        Estimated Profit / Margin
                      </span>
                      {(() => {
                        const base = parseFloat(supplierBaseCost) || 0;
                        const sell = parseFloat(sellingPrice) || 0;
                        const profit = sell - base;
                        const margin = sell > 0 ? Math.round((profit / sell) * 100) : 0;
                        if (profit > 0) {
                          return (
                            <p className="text-lg font-bold text-emerald-600">
                              +£{profit.toFixed(2)}{' '}
                              <span className="text-xs text-neutral-500 font-normal">
                                ({margin}%)
                              </span>
                            </p>
                          );
                        } else if (sell > 0) {
                          return <p className="text-sm font-bold text-red-500">Below Cost</p>;
                        } else {
                          return <p className="text-sm text-neutral-400 font-medium">—</p>;
                        }
                      })()}
                    </div>
                  </div>
                </div>

                {/* Section E: Variants */}
                {selectedVariants.length > 0 && (() => {
                  const availableColours = Array.from(
                    new Set(
                      selectedVariants
                        .map((v) => v.properties.find((p) => /colou?r/i.test(p.name))?.value)
                        .filter(Boolean) as string[]
                    )
                  );

                  const displayedVariants = selectedVariants
                    .map((variant, idx) => ({ ...variant, originalIndex: idx }))
                    .filter((variant) => {
                      if (selectedColourFilter === 'all') return true;
                      const c = variant.properties.find((p) => /colou?r/i.test(p.name))?.value;
                      return c === selectedColourFilter;
                    });

                  return (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">
                            Product Variants & Stock ({selectedVariants.filter((v) => v.isIncluded).length} of {selectedVariants.length} included)
                          </label>
                          <p className="text-[11px] text-neutral-500">
                            Customise prices, unique size-inclusive SKUs, and select which colours to offer.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedVariants(selectedVariants.map((v) => ({ ...v, isIncluded: true })))}
                            className="text-xs font-medium text-neutral-700 hover:text-black underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-neutral-300">|</span>
                          <button
                            type="button"
                            onClick={() => setSelectedVariants(selectedVariants.map((v) => ({ ...v, isIncluded: false })))}
                            className="text-xs font-medium text-neutral-700 hover:text-black underline cursor-pointer"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      {/* Colour Filter Pills */}
                      {availableColours.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-neutral-50 rounded-lg border border-neutral-200">
                          <span className="text-xs font-semibold text-neutral-600 mr-1">Filter Colour:</span>
                          <button
                            type="button"
                            onClick={() => setSelectedColourFilter('all')}
                            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors cursor-pointer ${
                              selectedColourFilter === 'all'
                                ? 'bg-neutral-900 text-white shadow-sm'
                                : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
                            }`}
                          >
                            All Colours ({selectedVariants.length})
                          </button>
                          {availableColours.map((col) => {
                            const count = selectedVariants.filter(
                              (v) => v.properties.find((p) => /colou?r/i.test(p.name))?.value === col
                            ).length;
                            const activeCount = selectedVariants.filter(
                              (v) => v.properties.find((p) => /colou?r/i.test(p.name))?.value === col && v.isIncluded
                            ).length;
                            const isSelected = selectedColourFilter === col;
                            return (
                              <button
                                key={col}
                                type="button"
                                onClick={() => setSelectedColourFilter(col)}
                                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-neutral-900 text-white shadow-sm'
                                    : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
                                }`}
                              >
                                <span>{col}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-neutral-700 text-neutral-200' : 'bg-neutral-100 text-neutral-600'}`}>
                                  {activeCount}/{count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="border border-neutral-200 rounded-lg overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600">
                            <tr>
                              <th className="py-2.5 px-3 w-10 text-center">Include</th>
                              <th className="py-2.5 px-3">Colour & Size</th>
                              <th className="py-2.5 px-3">Variant SKU</th>
                              <th className="py-2.5 px-3">Price (£)</th>
                              <th className="py-2.5 px-3">Stock Qty</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {displayedVariants.map((variant) => {
                              const idx = variant.originalIndex;
                              return (
                                <tr key={variant.skuId} className={variant.isIncluded ? 'hover:bg-neutral-50/50' : 'bg-neutral-50/70 opacity-60'}>
                                  <td className="py-2.5 px-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={variant.isIncluded}
                                      onChange={(e) => {
                                        const updated = [...selectedVariants];
                                        updated[idx].isIncluded = e.target.checked;
                                        setSelectedVariants(updated);
                                      }}
                                      className="w-4 h-4 text-neutral-900 rounded focus:ring-neutral-900 cursor-pointer"
                                    />
                                  </td>
                                  <td className="py-2.5 px-3 font-medium text-neutral-900">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {variant.properties.map((p) => {
                                        const isColour = /colou?r/i.test(p.name);
                                        return (
                                          <span
                                            key={p.name}
                                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-tight ${
                                              isColour
                                                ? 'bg-neutral-900 text-white'
                                                : 'bg-neutral-100 text-neutral-800 border border-neutral-200'
                                            }`}
                                          >
                                            <span className="opacity-70 text-[9px] mr-1 uppercase">{p.name}:</span>
                                            {p.value}
                                          </span>
                                        );
                                      })}
                                    </div>
                                    {variant.price > 0 && (
                                      <div className="text-[10px] text-neutral-400 font-normal mt-1">
                                        Supplier Cost: £{variant.price.toFixed(2)}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <input
                                      type="text"
                                      value={variant.customSku || variant.skuCode || variant.skuId}
                                      onChange={(e) => {
                                        const updated = [...selectedVariants];
                                        updated[idx].customSku = e.target.value.toUpperCase();
                                        setSelectedVariants(updated);
                                      }}
                                      className="w-44 max-w-full px-2 py-1 text-xs font-mono border border-neutral-300 rounded uppercase bg-white"
                                    />
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={variant.customPrice || sellingPrice}
                                      onChange={(e) => {
                                        const updated = [...selectedVariants];
                                        updated[idx].customPrice = parseFloat(e.target.value) || 0;
                                        setSelectedVariants(updated);
                                      }}
                                      className="w-20 px-2 py-1 text-xs border border-neutral-300 rounded"
                                    />
                                  </td>
                                  <td className="py-2.5 px-3 text-neutral-700">
                                    {variant.stock || 40}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* Bottom Action Bar */}
                <div className="pt-6 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-neutral-500">
                    Once imported, this item is immediately available in your shop catalog and can be further managed in the standard Products page.
                  </p>

                  <button
                    type="button"
                    onClick={handleImportToStore}
                    disabled={isImporting}
                    className="w-full sm:w-auto px-8 py-3 bg-neutral-950 hover:bg-neutral-900 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Saving to Store Catalog...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Import Product to Store</span>
                      </>
                    )}
                  </button>
                </div>

                {importError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: ORDER FULFILLMENT & TRACKING                          */}
        {/* ============================================================ */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Customer Orders (Dropshipping Fulfillment)
                </h3>
                <p className="text-xs text-neutral-500">
                  View store orders, forward items to AliExpress, and sync courier tracking numbers.
                </p>
              </div>
              <button
                type="button"
                onClick={loadOrders}
                disabled={isLoadingOrders}
                className="px-3.5 py-2 text-xs font-semibold border border-neutral-300 rounded-lg hover:bg-neutral-50 flex items-center gap-1.5"
              >
                <RefreshCw size={13} className={isLoadingOrders ? 'animate-spin' : ''} />
                <span>Refresh Orders</span>
              </button>
            </div>

            {orderActionMessage && (
              <div className="p-3 bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs rounded-lg">
                {orderActionMessage}
              </div>
            )}

            {isLoadingOrders ? (
              <div className="p-12 text-center text-xs text-neutral-400">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
                <Package size={32} className="mx-auto text-neutral-300 mb-3" />
                <h4 className="text-sm font-semibold text-neutral-800">No orders found</h4>
                <p className="text-xs text-neutral-500 mt-1">
                  Customer orders placed on your store will appear here for fulfillment.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const dropshipItems = (order.order_items || []).filter(
                    (item: any) => item.product?.aliexpress_product_id
                  );

                  return (
                    <div
                      key={order.orderid}
                      className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-100 gap-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-neutral-900">
                            Order #{order.orderid}
                          </span>
                          <span className="text-xs text-neutral-400">•</span>
                          <span className="text-xs text-neutral-500">
                            {new Date(order.createdat).toLocaleDateString('en-GB')}
                          </span>
                          <span className="text-xs font-semibold text-neutral-900">
                            Total: £{Number(order.total || 0).toFixed(2)}
                          </span>
                        </div>

                        <div>
                          {order.aliexpress_order_id ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check size={12} />
                              AliExpress Order: {order.aliexpress_order_id}
                            </span>
                          ) : dropshipItems.length > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Unfulfilled on Supplier
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-400">Standard Catalog Item</span>
                          )}
                        </div>
                      </div>

                      {/* Items & Shipping */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="font-semibold text-neutral-700 block mb-1">
                            Line Items:
                          </span>
                          <ul className="space-y-1 text-neutral-600">
                            {(order.order_items || []).map((item: any) => (
                              <li key={item.orderitemid} className="flex items-center justify-between">
                                <span>
                                  {item.quantity}x {item.product?.name || 'Product'} (SKU: {item.variant?.sku || 'N/A'})
                                </span>
                                {item.product?.aliexpress_product_url && (
                                  <a
                                    href={item.product.aliexpress_product_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-neutral-900 underline flex items-center gap-1"
                                  >
                                    <span>AliExpress Link</span>
                                    <ExternalLink size={10} />
                                  </a>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <span className="font-semibold text-neutral-700 block mb-1">
                            Shipping Destination:
                          </span>
                          <p className="text-neutral-600">
                            {order.deliverystreet} {order.deliveryapartment}
                            <br />
                            {order.delivery_region}, {order.econtoffice || 'United Kingdom'}
                          </p>
                        </div>
                      </div>

                      {/* Fulfillment Actions */}
                      {dropshipItems.length > 0 && (
                        <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {order.aliexpress_tracking_number ? (
                              <span className="text-xs text-neutral-700 font-medium">
                                Tracking: <span className="font-mono">{order.aliexpress_tracking_number}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-neutral-400">
                                Tracking number will sync once dispatched by supplier.
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {!order.aliexpress_order_id ? (
                              <button
                                type="button"
                                onClick={() => handleFulfillOrder(order.orderid)}
                                disabled={fulfillingOrderId === order.orderid}
                                className="px-3.5 py-1.5 bg-neutral-950 text-white text-xs font-semibold rounded-md hover:bg-neutral-800 disabled:opacity-50"
                              >
                                {fulfillingOrderId === order.orderid ? 'Forwarding...' : 'Fulfill on AliExpress'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={async () => {
                                  const res = await fetch('/api/aliexpress/orders', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'sync_tracking', orderId: order.orderid })
                                  });
                                  const d = await res.json();
                                  alert(d.message || (d.trackingNumber ? `Tracking: ${d.trackingNumber}` : 'Sync completed'));
                                  loadOrders();
                                }}
                                className="px-3 py-1.5 border border-neutral-300 text-neutral-700 text-xs font-semibold rounded-md hover:bg-neutral-50"
                              >
                                Sync Tracking
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: SETTINGS & API CONNECTION                             */}
        {/* ============================================================ */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  AliExpress Open Platform Connection
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Connect your AliExpress buyer account to enable automatic dropship order creation and logistics tracking queries.
                </p>
              </div>

              {/* Status card */}
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                    Account Authorization Status
                  </span>
                  <p className="text-sm font-bold text-neutral-900 mt-0.5">
                    {authStatus?.isConnected ? 'Connected & Authorized' : 'Pending Authorization'}
                  </p>
                </div>
                {authStatus?.authUrl && (
                  <a
                    href={authStatus.authUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-neutral-950 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 flex items-center gap-1.5"
                  >
                    <span>Authorize on AliExpress</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {/* Stored App Credentials */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                  App Credentials (Active)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase">App Key</span>
                    <p className="text-xs font-mono font-bold text-neutral-900 mt-0.5">546324</p>
                  </div>
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase">App Secret</span>
                    <p className="text-xs font-mono font-bold text-neutral-900 mt-0.5">••••••••••••••••</p>
                  </div>
                </div>
              </div>

              {/* Manual Access Token Entry */}
              <div className="pt-4 border-t border-neutral-200 space-y-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Manual Token Input
                  </h4>
                  <p className="text-xs text-neutral-500">
                    If you generated an Access Token directly from the AliExpress Developer &quot;Auth Management&quot; console, you can paste it here directly.
                  </p>
                </div>

                <form onSubmit={handleSaveManualToken} className="flex gap-2">
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Paste access_token here..."
                    className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                  <button
                    type="submit"
                    disabled={isSavingToken || !manualToken.trim()}
                    className="px-4 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {isSavingToken ? 'Saving...' : 'Save Token'}
                  </button>
                </form>

                {settingsMessage && (
                  <p className="text-xs text-neutral-700">{settingsMessage}</p>
                )}
              </div>

              {/* Google Gemini AI API Configuration */}
              <div className="pt-4 border-t border-neutral-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                      Google Gemini AI Copywriting
                    </h4>
                    <p className="text-xs text-neutral-500">
                      Powers dynamic, 1-click British pet parent title & description generation tailored to each product.
                    </p>
                  </div>
                  {authStatus?.hasGeminiKey ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      <Check size={12} />
                      Gemini Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                      Template Mode
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveGeminiKey} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={geminiApiKeyInput}
                      onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                      placeholder="Paste Gemini API Key (e.g. AIzaSy...)"
                      className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isSavingGeminiKey || !geminiApiKeyInput.trim()}
                      className="px-4 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 disabled:opacity-50 shrink-0"
                    >
                      {isSavingGeminiKey ? 'Saving...' : 'Save AI Key'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span>Stored securely in database / .env.local</span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-neutral-900 underline flex items-center gap-1"
                    >
                      <span>Get free Gemini API Key</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </form>

                {geminiKeyMessage && (
                  <p className="text-xs text-neutral-700">{geminiKeyMessage}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* AI STUDIO DIRECTOR & IMAGE RE-IMAGINER MODAL               */}
        {/* ========================================================= */}
        {isStudioOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end sm:justify-center p-0 sm:p-4 overflow-hidden">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-4xl w-full shadow-2xl border-t sm:border border-neutral-200 overflow-hidden flex flex-col h-[94vh] sm:h-auto sm:max-h-[90vh] mx-auto">
              {/* Modal Header */}
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950 text-white shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-amber-400 shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold tracking-tight truncate">AI Studio Director & Scene Re-imaginer</h3>
                    <p className="text-[11px] text-neutral-400 truncate">
                      Deconstruct AliExpress products, switch pet breeds, and generate editorial studio photography
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStudioOpen(false)}
                  className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
                {/* Left Column: Controls (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Source Image Selector */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                        Source Product Image
                      </label>
                      <span className="text-[10px] text-neutral-400 font-medium">
                        Vision Analysis Source
                      </span>
                    </div>

                    {/* Active Source Card */}
                    <div className="flex items-center gap-3 p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-neutral-200 shrink-0 border border-neutral-300">
                        {studioSourceImage ? (
                          <img
                            src={studioSourceImage}
                            alt="Source"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/Logo.jpg';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-400">
                            <ImageIcon size={20} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-neutral-900 text-white">
                            Active Source
                          </span>
                          {studioSourceImage === primaryImageUrl && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Catalog Primary
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-neutral-800 block truncate">
                          {customTitle || stagedProduct?.title || 'Selected AliExpress Image'}
                        </span>
                        <span className="text-[10px] text-neutral-500 block truncate">
                          Deconstructs textures, materials & costume parts
                        </span>
                      </div>
                    </div>

                    {/* Thumbnail Switcher (All Available Photos) */}
                    {stagedProduct?.images && stagedProduct.images.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                            Tap to switch photo ({stagedProduct.images.length} available):
                          </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 -mx-1 px-1 scrollbar-thin snap-x">
                          {stagedProduct.images.map((imgUrl, i) => {
                            const isCurrent = studioSourceImage === imgUrl;
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setStudioSourceImage(imgUrl);
                                  setSynthesizedPrompt(null);
                                  setSynthesizedAnalysis(null);
                                  setGeneratedImageUrl(null);
                                }}
                                title={`Use Image #${i + 1} as AI Studio source`}
                                className={`relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 transition-all snap-start touch-manipulation ${
                                  isCurrent
                                    ? 'border-neutral-950 ring-2 ring-neutral-950/20 shadow-md scale-105'
                                    : 'border-neutral-200 hover:border-neutral-400 opacity-60 hover:opacity-100'
                                }`}
                              >
                                <img
                                  src={imgUrl}
                                  alt={`Thumb ${i + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = '/Logo.jpg';
                                  }}
                                />
                                {isCurrent && (
                                  <span className="absolute inset-0 bg-neutral-950/35 flex items-center justify-center">
                                    <Check size={14} className="text-white drop-shadow font-bold" />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Breed Selection */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block mb-1.5">
                      Target Pet Breed
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {[
                        'Labrador Retriever',
                        'Golden Retriever',
                        'French Bulldog',
                        'Cockapoo',
                        'Dachshund',
                        'Poodle',
                        'Original Breed'
                      ].map((breed) => (
                        <button
                          key={breed}
                          type="button"
                          onClick={() => {
                            setStudioBreed(breed);
                            setSynthesizedPrompt(null);
                            setSynthesizedAnalysis(null);
                            setGeneratedImageUrl(null);
                          }}
                          className={`px-3 py-1.5 text-xs rounded-full border transition-all font-medium touch-manipulation min-h-[32px] ${
                            studioBreed === breed
                              ? 'bg-neutral-950 text-white border-neutral-950 shadow-sm'
                              : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 active:bg-neutral-50'
                          }`}
                        >
                          {breed}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={studioBreed}
                      onChange={(e) => {
                        setStudioBreed(e.target.value);
                        setSynthesizedPrompt(null);
                        setSynthesizedAnalysis(null);
                        setGeneratedImageUrl(null);
                      }}
                      placeholder="Or enter custom breed (e.g. Jack Russell)"
                      className="w-full px-3 py-2 text-base sm:text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>

                  {/* Scene & Pose Presets (Clean Monochrome Icons, Zero Emojis) */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block mb-1.5">
                      Scene & Pose Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'clean_studio', label: 'Clean Studio', desc: 'White backdrop, soft 85mm light', icon: Camera },
                        { id: 'dynamic_action', label: 'Dynamic Action', desc: 'Rearing stallion pose, motion', icon: Zap },
                        { id: 'british_home', label: 'British Home', desc: 'Warm oak floor, morning sun', icon: Home },
                        { id: 'outdoor_park', label: 'Autumn Park', desc: 'English garden, golden hour', icon: Trees }
                      ].map((preset) => {
                        const IconComponent = preset.icon;
                        const isSelected = studioPreset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setStudioPreset(preset.id as any);
                              setSynthesizedPrompt(null);
                              setSynthesizedAnalysis(null);
                              setGeneratedImageUrl(null);
                            }}
                            className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all touch-manipulation flex flex-col justify-between min-h-[64px] ${
                              isSelected
                                ? 'border-neutral-950 bg-neutral-950 text-white shadow-sm'
                                : 'border-neutral-200 bg-white hover:border-neutral-300 text-neutral-800 active:bg-neutral-50'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <IconComponent size={13} className={isSelected ? 'text-amber-400' : 'text-neutral-600'} />
                              <span className="text-xs font-bold block truncate">{preset.label}</span>
                            </div>
                            <span className={`text-[10px] block leading-tight ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                              {preset.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Directions */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block mb-1.5">
                      Custom Instructions (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={studioCustomPrompt}
                      onChange={(e) => {
                        setStudioCustomPrompt(e.target.value);
                        setSynthesizedPrompt(null);
                        setSynthesizedAnalysis(null);
                        setGeneratedImageUrl(null);
                      }}
                      placeholder="Optional: e.g. playful head tilt, soft golden hour rim lighting, cozy blanket details"
                      className="w-full px-3 py-2 text-base sm:text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>

                  {/* Primary Trigger Buttons */}
                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleSynthesizePrompt}
                      disabled={isSynthesizingPrompt || isGeneratingImage}
                      className="w-full py-3 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 touch-manipulation min-h-[44px] active:scale-[0.99]"
                    >
                      {isSynthesizingPrompt ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Analyzing with Gemini Vision...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 size={13} />
                          <span>1. Synthesize Studio Prompt</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateImagen}
                      disabled={isGeneratingImage || isSynthesizingPrompt}
                      className="w-full py-3.5 px-4 bg-neutral-950 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 touch-manipulation min-h-[48px] active:scale-[0.99]"
                    >
                      {isGeneratingImage ? (
                        <>
                          <RefreshCw size={15} className="animate-spin text-amber-400" />
                          <span>Generating with Google Imagen 3...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={15} className="text-amber-400" />
                          <span>2. 1-Click Generate (Google Imagen 3)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right Column: AI Output & Live Preview (7 cols) */}
                <div className="lg:col-span-7 bg-neutral-50 rounded-2xl p-4 sm:p-5 border border-neutral-200 flex flex-col min-h-[360px] justify-between space-y-4">
                  {/* Status / Output Section */}
                  <div className="space-y-4 flex-1">
                    {/* Error Banner */}
                    {studioError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                        <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
                        <div className="flex-1">
                          <span className="font-semibold block">Notice:</span>
                          <span className="text-[11px] leading-relaxed block mt-0.5">{studioError}</span>
                        </div>
                      </div>
                    )}

                    {/* Google Cloud Billing Guidance when required */}
                    {studioRequiresBilling && (
                      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5">
                        <div className="flex items-center gap-2 text-amber-800">
                          <Sparkles size={14} className="text-amber-600 shrink-0" />
                          <span className="text-xs font-bold">Google Cloud Billing Activation Needed for 1-Click API</span>
                        </div>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                          Google Imagen 3 API has a free tier quota of 0 requests until a Google Cloud project with billing is linked to the API key.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <a
                            href="https://console.cloud.google.com/billing"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-2 bg-neutral-900 hover:bg-black text-white text-[11px] font-semibold rounded-lg shadow-sm touch-manipulation"
                          >
                            <span>Open Google Cloud Billing</span>
                            <ExternalLink size={10} />
                          </a>
                          <span className="text-[11px] text-amber-600 font-medium">
                            Or copy the prompt below into your free Gemini chat!
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Generated Image Result */}
                    {generatedImageUrl ? (
                      <div className="space-y-3">
                        <div className="aspect-square max-h-[280px] sm:max-h-[320px] w-full mx-auto rounded-xl overflow-hidden border-2 border-neutral-950 shadow-lg bg-neutral-900 relative group">
                          <img
                            src={generatedImageUrl}
                            alt="AI Studio Generated"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold bg-neutral-950/80 backdrop-blur-sm text-emerald-400 border border-emerald-400/30 rounded">
                            Imagen 3 Commercial
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={() => handleApplyGeneratedImage(true)}
                            className="flex-1 py-3 px-4 bg-neutral-950 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow flex items-center justify-center gap-1.5 touch-manipulation min-h-[44px] active:scale-[0.99]"
                          >
                            <CheckCircle2 size={14} className="text-emerald-400" />
                            <span>Set as Primary Photo</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyGeneratedImage(false)}
                            className="py-3 px-4 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold rounded-xl transition-colors touch-manipulation min-h-[44px]"
                          >
                            Add to Gallery
                          </button>
                        </div>
                      </div>
                    ) : isGeneratingImage ? (
                      <div className="h-56 sm:h-64 flex flex-col items-center justify-center text-center p-6 space-y-3">
                        <RefreshCw size={28} className="animate-spin text-neutral-900" />
                        <div>
                          <span className="text-xs font-bold text-neutral-800 block">
                            Creating High-Resolution Studio Shot
                          </span>
                          <span className="text-[11px] text-neutral-500 block mt-1">
                            Deconstructing textures, applying {studioBreed}, and rendering 85mm studio lighting...
                          </span>
                        </div>
                      </div>
                    ) : null}

                    {/* Synthesized Prompt Card */}
                    {synthesizedPrompt && (
                      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-neutral-200 space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5 truncate">
                            <Sparkles size={12} className="text-amber-500 shrink-0" />
                            <span className="truncate">Synthesized Commercial Prompt</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyPrompt}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg transition-colors touch-manipulation shrink-0"
                          >
                            {hasCopiedPrompt ? (
                              <>
                                <Check size={12} className="text-emerald-600" />
                                <span className="text-emerald-700">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copy for Gemini Chat</span>
                              </>
                            )}
                          </button>
                        </div>

                        {synthesizedAnalysis && (
                          <p className="text-[11px] text-neutral-500 italic bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                            &quot;{synthesizedAnalysis}&quot;
                          </p>
                        )}

                        <div className="p-2.5 bg-neutral-900 text-neutral-100 rounded-lg text-xs font-mono leading-relaxed max-h-32 sm:max-h-36 overflow-y-auto select-all">
                          {synthesizedPrompt}
                        </div>
                      </div>
                    )}

                    {!synthesizedPrompt && !generatedImageUrl && !isGeneratingImage && (
                      <div className="h-48 sm:h-64 flex flex-col items-center justify-center text-center p-4 sm:p-6 space-y-2 border-2 border-dashed border-neutral-200 rounded-xl">
                        <Camera size={32} className="text-neutral-300" />
                        <span className="text-xs font-bold text-neutral-700">
                          Ready to Re-imagine This Product
                        </span>
                        <p className="text-[11px] text-neutral-400 max-w-sm">
                          Select your desired breed ({studioBreed}) and style, then tap &quot;Synthesize Studio Prompt&quot; or &quot;1-Click Generate&quot; to begin.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Manual Drop-In Upload Box (Use Gemini web generated image) */}
                  <div className="pt-3 border-t border-neutral-200 shrink-0 pb-2 sm:pb-0">
                    <label className="flex items-center justify-between p-3 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl cursor-pointer transition-colors group touch-manipulation min-h-[50px]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 group-hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors shrink-0">
                          <UploadCloud size={16} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-neutral-800 block truncate">
                            {isUploadingManual ? 'Uploading to Store...' : 'Upload Image from Gemini Chat'}
                          </span>
                          <span className="text-[10px] text-neutral-500 block truncate">
                            Generated in your gemini.google.com chat? Click to upload here
                          </span>
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleManualUpload}
                        disabled={isUploadingManual}
                        className="hidden"
                      />
                      <span className="text-[11px] font-semibold text-neutral-900 px-3 py-1.5 bg-neutral-100 group-hover:bg-neutral-200 rounded-lg transition-colors shrink-0">
                        Browse
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
