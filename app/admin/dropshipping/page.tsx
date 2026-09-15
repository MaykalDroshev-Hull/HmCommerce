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
  Trees,
  Ruler,
  FileSpreadsheet,
  Link2,
  ArrowLeftRight,
  Layers
} from 'lucide-react';
import { AliExpressProductDetails, AliExpressVariant } from '@/lib/aliexpress/types';
import { extractCleanSizeCode } from '@/lib/aliexpress/client';

export interface LinkedProductVariant {
  productVariantId: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  quantity: number;
  aliexpressSkuId: string | null;
  isVisible: boolean;
  size: string | null;
  colour: string | null;
}

export interface LinkedProduct {
  productId: string;
  name: string;
  sku: string;
  description: string;
  aliexpressProductId: string;
  aliexpressProductUrl: string | null;
  categoryName: string;
  primaryImage: string | null;
  totalStock: number;
  variants: LinkedProductVariant[];
  updatedAt: string;
}

interface ProductType {
  producttypeid: string;
  name: string;
}

interface StudioQueueItem {
  id: string;
  sourceUrl: string;
  imageType: 'product' | 'size_guide';
  logoVariant: 'black' | 'white';
  status: 'idle' | 'generating' | 'completed' | 'error';
  generatedUrl?: string;
  error?: string;
}

export default function DropshippingPage() {
  const [activeTab, setActiveTab] = useState<'import' | 'products' | 'orders' | 'settings'>('import');

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
  const [studioQueue, setStudioQueue] = useState<StudioQueueItem[]>([]);
  const [activeQueueIndex, setActiveQueueIndex] = useState<number>(0);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
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

  // Linked Products & Relink Supplier state
  const [linkedProducts, setLinkedProducts] = useState<LinkedProduct[]>([]);
  const [isLoadingLinkedProducts, setIsLoadingLinkedProducts] = useState(false);
  const [linkedProductsSearch, setLinkedProductsSearch] = useState('');
  const [syncingProductId, setSyncingProductId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ productId: string; message: string; isError?: boolean } | null>(null);

  // Relink Modal state
  const [relinkModalProduct, setRelinkModalProduct] = useState<LinkedProduct | null>(null);
  const [relinkNewUrl, setRelinkNewUrl] = useState('');
  const [isFetchingRelinkPreview, setIsFetchingRelinkPreview] = useState(false);
  const [relinkPreviewError, setRelinkPreviewError] = useState<string | null>(null);
  const [relinkSupplierPreview, setRelinkSupplierPreview] = useState<AliExpressProductDetails | null>(null);
  const [relinkAddNewVariants, setRelinkAddNewVariants] = useState(true);
  const [isSubmittingRelink, setIsSubmittingRelink] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [fulfillingOrderId, setFulfillingOrderId] = useState<string | null>(null);
  const [orderActionMessage, setOrderActionMessage] = useState<string | null>(null);
  const [isExportingGoogle, setIsExportingGoogle] = useState(false);

  const handleExportGoogleMerchant = async () => {
    try {
      setIsExportingGoogle(true);
      const res = await fetch('/api/admin/export/google-merchant');
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Export failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Google_Merchant_Center_Feed_MB_Paws_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Failed to export Google Merchant Center feed');
    } finally {
      setIsExportingGoogle(false);
    }
  };

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

  // Load tab data
  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
    } else if (activeTab === 'products') {
      loadLinkedProducts();
    }
  }, [activeTab]);

  const loadLinkedProducts = async () => {
    try {
      setIsLoadingLinkedProducts(true);
      const res = await fetch('/api/aliexpress/linked-products');
      const data = await res.json();
      if (data.success) {
        setLinkedProducts(data.products || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingLinkedProducts(false);
    }
  };

  const handleQuickSyncStock = async (productId: string) => {
    try {
      setSyncingProductId(productId);
      setSyncFeedback(null);
      const res = await fetch('/api/aliexpress/sync-supplier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, updateStock: true })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to sync stock');
      }
      setSyncFeedback({
        productId,
        message: `Successfully synced stock for ${data.matchedCount} variants from AliExpress.`
      });
      loadLinkedProducts();
    } catch (err: any) {
      setSyncFeedback({
        productId,
        message: err.message || 'Failed to sync stock',
        isError: true
      });
    } finally {
      setSyncingProductId(null);
    }
  };

  const handleOpenRelinkModal = (product: LinkedProduct) => {
    setRelinkModalProduct(product);
    setRelinkNewUrl('');
    setRelinkPreviewError(null);
    setRelinkSupplierPreview(null);
    setRelinkAddNewVariants(true);
  };

  const handleCloseRelinkModal = () => {
    if (isSubmittingRelink) return;
    setRelinkModalProduct(null);
    setRelinkSupplierPreview(null);
    setRelinkNewUrl('');
    setRelinkPreviewError(null);
  };

  const handleFetchRelinkPreview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!relinkNewUrl.trim()) return;

    try {
      setIsFetchingRelinkPreview(true);
      setRelinkPreviewError(null);
      setRelinkSupplierPreview(null);

      const res = await fetch('/api/aliexpress/fetch-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlOrId: relinkNewUrl.trim() })
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.product) {
        throw new Error(data.error || 'Could not fetch supplier listing');
      }

      setRelinkSupplierPreview(data.product);
    } catch (err: any) {
      setRelinkPreviewError(err.message || 'Failed to fetch supplier details');
    } finally {
      setIsFetchingRelinkPreview(false);
    }
  };

  const handleSubmitRelink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!relinkModalProduct || !relinkNewUrl.trim()) return;

    try {
      setIsSubmittingRelink(true);
      setRelinkPreviewError(null);

      const res = await fetch('/api/aliexpress/sync-supplier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: relinkModalProduct.productId,
          newUrlOrId: relinkNewUrl.trim(),
          updateStock: true,
          addNewVariants: relinkAddNewVariants
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to relink supplier');
      }

      setSyncFeedback({
        productId: relinkModalProduct.productId,
        message: `Supplier relinked to ${data.aliexpressProductId}! Updated ${data.matchedCount} variants${data.addedVariants?.length ? ` and added ${data.addedVariants.length} new sizes` : ''}.`
      });

      handleCloseRelinkModal();
      loadLinkedProducts();
    } catch (err: any) {
      setRelinkPreviewError(err.message || 'Failed to relink supplier');
    } finally {
      setIsSubmittingRelink(false);
    }
  };

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
  const openImageStudioModal = (focusedImgUrl?: string) => {
    setStudioError(null);
    setStudioRequiresBilling(false);
    setSynthesizedAnalysis(null);
    setSynthesizedPrompt(null);
    setGeneratedImageUrl(null);

    // Get selected images from staging
    const imagesToQueue = selectedImageUrls.length > 0
      ? selectedImageUrls
      : (stagedProduct?.images || []).slice(0, 4);

    const activeUrl = focusedImgUrl || primaryImageUrl || imagesToQueue[0] || '';

    // If focused image is not in queue, ensure it's included
    const fullList = focusedImgUrl && !imagesToQueue.includes(focusedImgUrl)
      ? [focusedImgUrl, ...imagesToQueue]
      : imagesToQueue;

    const queue: StudioQueueItem[] = fullList.map((url, i) => {
      const isLikelySizeGuide = /size|chart|measur|guide|dimension|table/i.test(url) || (i === 1 && fullList.length > 2);
      return {
        id: `img-${i}-${Date.now()}`,
        sourceUrl: url,
        imageType: isLikelySizeGuide ? 'size_guide' : 'product',
        logoVariant: 'black',
        status: 'idle'
      };
    });

    setStudioQueue(queue);
    const focusedIdx = queue.findIndex((q) => q.sourceUrl === activeUrl);
    const validIdx = focusedIdx >= 0 ? focusedIdx : 0;
    setActiveQueueIndex(validIdx);
    setStudioSourceImage(activeUrl);
    setIsStudioOpen(true);
  };

  // Generate a single queue item directly with Gemini multimodal
  const handleGenerateDirectItem = async (index: number) => {
    const item = studioQueue[index];
    if (!item) return;

    try {
      setStudioQueue((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], status: 'generating', error: undefined };
        return next;
      });
      setStudioError(null);
      setStudioRequiresBilling(false);

      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-direct',
          sourceImageUrl: item.sourceUrl,
          imageType: item.imageType,
          productTitle: customTitle || stagedProduct?.title || 'Pet Costume',
          breed: studioBreed,
          scenePreset: studioPreset,
          customInstructions: studioCustomPrompt,
          logoVariant: item.logoVariant
        })
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        setStudioQueue((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            status: 'completed',
            generatedUrl: data.imageUrl
          };
          return next;
        });
        if (index === activeQueueIndex) {
          setGeneratedImageUrl(data.imageUrl);
        }
      } else {
        if (data.requiresBilling) {
          setStudioRequiresBilling(true);
        }
        setStudioQueue((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            status: 'error',
            error: data.error || 'Generation failed'
          };
          return next;
        });
        setStudioError(data.error || 'Image generation failed');
      }
    } catch (err: any) {
      setStudioQueue((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          status: 'error',
          error: err.message || 'Network error'
        };
        return next;
      });
      setStudioError(err.message || 'Network error');
    }
  };

  // Generate ALL queued images simultaneously
  const handleGenerateAllQueued = async () => {
    try {
      setIsBatchGenerating(true);
      setStudioError(null);
      setStudioRequiresBilling(false);

      await Promise.allSettled(
        studioQueue.map((_, idx) => handleGenerateDirectItem(idx))
      );
    } finally {
      setIsBatchGenerating(false);
    }
  };

  // 1-Click Replace Single Generated Image in Gallery
  const handleReplaceImageInGallery = (originalUrl: string, newUrl: string) => {
    setSelectedImageUrls((prev) => prev.map((u) => (u === originalUrl ? newUrl : u)));
    if (primaryImageUrl === originalUrl) {
      setPrimaryImageUrl(newUrl);
    }
    if (stagedProduct) {
      setStagedProduct({
        ...stagedProduct,
        images: stagedProduct.images.map((u) => (u === originalUrl ? newUrl : u))
      });
    }
  };

  // 1-Click Replace ALL Completed Images in Gallery
  const handleApplyAllCompleted = () => {
    const completed = studioQueue.filter((q) => q.status === 'completed' && q.generatedUrl);
    if (completed.length === 0) return;

    let updatedSelected = [...selectedImageUrls];
    let updatedStaged = stagedProduct ? [...stagedProduct.images] : [];
    let updatedPrimary = primaryImageUrl;

    completed.forEach((item) => {
      if (item.generatedUrl) {
        updatedSelected = updatedSelected.map((u) => (u === item.sourceUrl ? item.generatedUrl! : u));
        updatedStaged = updatedStaged.map((u) => (u === item.sourceUrl ? item.generatedUrl! : u));
        if (updatedPrimary === item.sourceUrl) {
          updatedPrimary = item.generatedUrl;
        }
      }
    });

    setSelectedImageUrls(updatedSelected);
    setPrimaryImageUrl(updatedPrimary);
    if (stagedProduct) {
      setStagedProduct({
        ...stagedProduct,
        images: updatedStaged
      });
    }
    setIsStudioOpen(false);
  };

  // Select active queue item
  const handleSelectQueueIndex = (idx: number) => {
    setActiveQueueIndex(idx);
    const item = studioQueue[idx];
    if (item) {
      setStudioSourceImage(item.sourceUrl);
      setGeneratedImageUrl(item.generatedUrl || null);
      setStudioError(item.error || null);
      setSynthesizedPrompt(null);
      setSynthesizedAnalysis(null);
    }
  };

  // Toggle item type (product vs size_guide)
  const handleToggleQueueItemType = (idx: number, newType: 'product' | 'size_guide') => {
    setStudioQueue((prev) => {
      const next = [...prev];
      if (next[idx]) {
        next[idx] = { ...next[idx], imageType: newType };
      }
      return next;
    });
  };

  // Toggle logo variant for size guide
  const handleToggleQueueItemLogo = (idx: number, variant: 'black' | 'white') => {
    setStudioQueue((prev) => {
      const next = [...prev];
      if (next[idx]) {
        next[idx] = { ...next[idx], logoVariant: variant };
      }
      return next;
    });
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
            quantity: typeof v.stock === 'number' ? v.stock : 40,
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

          <div className="flex flex-wrap items-center gap-3">
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
                onClick={() => setActiveTab('products')}
                className={`flex-1 sm:flex-initial px-3.5 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap text-center touch-manipulation ${
                  activeTab === 'products'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Linked Products & Stock
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

            {/* Export Google Merchant Sheet */}
            <button
              onClick={handleExportGoogleMerchant}
              disabled={isExportingGoogle}
              title="Download products formatted for Google Merchant Center (.xlsx)"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{isExportingGoogle ? 'Exporting...' : 'Export Google Feed (.xlsx)'}</span>
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
                Import by URL, Mobile Link, or Product ID
              </h2>
              <p className="text-xs text-neutral-600 mb-3 sm:mb-4">
                Enter any AliExpress product URL, mobile share link (e.g. a.aliexpress.com/_...), or item ID to pull product details, images, sizes, and specs into your customizable staging editor.
              </p>

              <form onSubmit={handleFetch} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={urlOrId}
                    onChange={(e) => setUrlOrId(e.target.value)}
                    placeholder="e.g. 1005006247926174, desktop link, or mobile link (a.aliexpress.com/_...)"
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
                      onClick={() => openImageStudioModal()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 text-xs font-bold bg-neutral-900 hover:bg-black text-white rounded-lg transition-colors shadow-sm self-start sm:self-auto touch-manipulation min-h-[38px]"
                    >
                      <Sparkles size={13} className="text-amber-400" />
                      <span>AI Studio: Re-imagine Selected ({selectedImageUrls.length > 0 ? selectedImageUrls.length : (stagedProduct.images?.length || 0)})</span>
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
                                  <td className="py-2.5 px-3">
                                    {variant.stock === 0 ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                        0 (Out of stock on AliExpress - disabled on website)
                                      </span>
                                    ) : (
                                      <span className="text-neutral-700 font-medium">{variant.stock ?? 35}</span>
                                    )}
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
        {/* TAB 2: LINKED PRODUCTS & LIVE STOCK MANAGEMENT              */}
        {/* ============================================================ */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Header / Sub-nav bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Linked AliExpress Products & Live Stock
                </h3>
                <p className="text-xs text-neutral-500">
                  Monitor supplier inventory, relink out-of-stock items to alternative listings, and synchronise variant quantities via official AliExpress API.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadLinkedProducts}
                  disabled={isLoadingLinkedProducts}
                  className="px-3.5 py-2 text-xs font-semibold border border-neutral-300 rounded-lg hover:bg-neutral-50 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={13} className={isLoadingLinkedProducts ? 'animate-spin' : ''} />
                  <span>Refresh List</span>
                </button>
              </div>
            </div>

            {/* Global Sync Feedback Banner */}
            {syncFeedback && (
              <div
                className={`p-3.5 text-xs rounded-xl flex items-center justify-between gap-3 border ${
                  syncFeedback.isError
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {syncFeedback.isError ? (
                    <AlertCircle size={15} className="shrink-0 text-red-600" />
                  ) : (
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                  )}
                  <span>{syncFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSyncFeedback(null)}
                  className="text-neutral-400 hover:text-neutral-600 shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Search and Filters */}
            <div className="bg-white border border-neutral-200 rounded-xl p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={linkedProductsSearch}
                  onChange={(e) => setLinkedProductsSearch(e.target.value)}
                  placeholder="Filter by product name, store SKU, or AliExpress item ID..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-neutral-50/40"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-500 shrink-0 px-1">
                <span>
                  Showing{' '}
                  <strong className="text-neutral-900 font-semibold">
                    {
                      linkedProducts.filter((p) => {
                        if (!linkedProductsSearch.trim()) return true;
                        const s = linkedProductsSearch.toLowerCase();
                        return (
                          p.name.toLowerCase().includes(s) ||
                          p.sku.toLowerCase().includes(s) ||
                          p.aliexpressProductId?.toLowerCase().includes(s)
                        );
                      }).length
                    }
                  </strong>{' '}
                  of {linkedProducts.length} items
                </span>
              </div>
            </div>

            {/* Products List */}
            {isLoadingLinkedProducts ? (
              <div className="bg-white border border-neutral-200 rounded-xl p-16 text-center text-xs text-neutral-400 flex flex-col items-center justify-center gap-3">
                <RefreshCw size={24} className="animate-spin text-neutral-400" />
                <span>Loading linked products from catalog...</span>
              </div>
            ) : linkedProducts.length === 0 ? (
              <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
                <Package size={36} className="mx-auto text-neutral-300 mb-3" />
                <h4 className="text-sm font-bold text-neutral-800">No Linked AliExpress Products Found</h4>
                <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                  Import products using the Product Importer tab to manage supplier links and sync live inventory.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {linkedProducts
                  .filter((product) => {
                    if (!linkedProductsSearch.trim()) return true;
                    const s = linkedProductsSearch.toLowerCase();
                    return (
                      product.name.toLowerCase().includes(s) ||
                      product.sku.toLowerCase().includes(s) ||
                      product.aliexpressProductId?.toLowerCase().includes(s)
                    );
                  })
                  .map((product) => {
                    const isSyncing = syncingProductId === product.productId;
                    const isOutOfStock = product.totalStock === 0;

                    return (
                      <div
                        key={product.productId}
                        className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-6 shadow-sm hover:border-neutral-300 transition-all space-y-4"
                      >
                        {/* Top Row: Thumbnail, Title, Metas, Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5 min-w-0">
                            {product.primaryImage ? (
                              <img
                                src={product.primaryImage}
                                alt={product.name}
                                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-neutral-200 shrink-0 bg-neutral-50"
                              />
                            ) : (
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400 shrink-0">
                                <ImageIcon size={22} />
                              </div>
                            )}

                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                                  {product.sku}
                                </span>
                                <span className="text-[10px] font-medium text-neutral-500">
                                  {product.categoryName}
                                </span>
                                {isOutOfStock ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                    <AlertCircle size={10} />
                                    Out of Stock
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    {product.totalStock} units available
                                  </span>
                                )}
                              </div>

                              <h4 className="text-sm sm:text-base font-bold text-neutral-900 line-clamp-1">
                                {product.name}
                              </h4>

                              {/* Supplier Link Badge */}
                              <div className="flex items-center gap-2 pt-0.5">
                                <span className="text-xs text-neutral-500 flex items-center gap-1">
                                  Supplier Item ID: <strong className="font-mono text-neutral-800">{product.aliexpressProductId}</strong>
                                </span>
                                {product.aliexpressProductUrl && (
                                  <a
                                    href={product.aliexpressProductUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-neutral-900 hover:text-neutral-600 underline flex items-center gap-0.5 shrink-0"
                                    title="Open AliExpress listing in new tab"
                                  >
                                    <span>View Listing</span>
                                    <ExternalLink size={11} />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleQuickSyncStock(product.productId)}
                              disabled={isSyncing}
                              title="Fetch real-time stock quantities from current AliExpress link"
                              className="px-3.5 py-2 text-xs font-semibold border border-neutral-300 text-neutral-800 rounded-lg hover:bg-neutral-50 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                            >
                              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                              <span>{isSyncing ? 'Syncing...' : 'Sync Live Stock'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenRelinkModal(product)}
                              className="px-3.5 py-2 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              <Link2 size={13} />
                              <span>Relink Supplier</span>
                            </button>

                            <Link
                              href={`/products/${product.productId}`}
                              target="_blank"
                              className="p-2 text-neutral-500 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300 rounded-lg transition-colors"
                              title="View on storefront"
                            >
                              <Eye size={14} />
                            </Link>
                          </div>
                        </div>

                        {/* Variant Stock Breakdown Chips */}
                        <div className="pt-3 border-t border-neutral-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                              Variant Stock Levels ({product.variants.length} sizes/options)
                            </span>
                            <span className="text-[11px] text-neutral-500 font-medium">
                              Total Inventory: {product.totalStock} units
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {product.variants.map((v) => {
                              const variantLabel = v.size || v.colour || v.sku;
                              const isZero = v.quantity === 0;

                              return (
                                <div
                                  key={v.productVariantId}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border flex items-center gap-2 ${
                                    isZero
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : 'bg-neutral-50 text-neutral-800 border-neutral-200'
                                  }`}
                                >
                                  <span className="font-sans font-bold text-neutral-900">
                                    {variantLabel}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                                      isZero
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-white border border-neutral-200 text-neutral-700'
                                    }`}
                                  >
                                    {v.quantity} in stock
                                  </span>
                                  {v.price > 0 && (
                                    <span className="text-[10px] text-neutral-400 font-sans">
                                      £{v.price.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: ORDER FULFILLMENT & TRACKING                          */}
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
        {/* AI STUDIO MULTI-IMAGE DIRECT RE-IMAGINER MODAL              */}
        {/* ========================================================= */}
        {isStudioOpen && (() => {
          const activeItem = studioQueue[activeQueueIndex] || studioQueue[0];
          const completedCount = studioQueue.filter((q) => q.status === 'completed' && q.generatedUrl).length;

          return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center p-0 sm:p-4 overflow-hidden">
              <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-5xl w-full shadow-2xl border-t sm:border border-neutral-200 overflow-hidden flex flex-col h-[95vh] sm:h-[90vh] mx-auto">
                {/* Modal Header */}
                <div className="px-4 sm:px-6 py-3.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950 text-white shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-amber-400 shrink-0">
                      <Sparkles size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold tracking-tight truncate">
                          AI Studio: Direct Multimodal Re-imaginer
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                          {studioQueue.length} Images Queued
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 truncate">
                        Feeds source photos &amp; brand logo directly into Gemini multimodal vision for editorial studio shots &amp; branded sizing charts
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {completedCount > 0 && (
                      <button
                        type="button"
                        onClick={handleApplyAllCompleted}
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                      >
                        <CheckCircle2 size={13} />
                        <span>Apply All Completed ({completedCount}) to Store</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsStudioOpen(false)}
                      className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Queue Strip & Simultaneous Action Bar */}
                <div className="bg-neutral-100/90 px-4 sm:px-6 py-2.5 border-b border-neutral-200 shrink-0 flex items-center justify-between gap-3 overflow-x-auto">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 shrink-0 hidden md:inline">
                      Selected Queue ({studioQueue.length}):
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-thin">
                      {studioQueue.map((item, idx) => {
                        const isActive = idx === activeQueueIndex;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectQueueIndex(idx)}
                            className={`relative shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden border-2 transition-all touch-manipulation group ${
                              isActive
                                ? 'border-neutral-950 ring-2 ring-neutral-950/20 shadow-md scale-105'
                                : 'border-neutral-300 hover:border-neutral-400 opacity-75 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={item.generatedUrl || item.sourceUrl}
                              alt={`Queue ${idx + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/Logo.jpg';
                              }}
                            />
                            {item.status === 'generating' && (
                              <span className="absolute inset-0 bg-neutral-950/60 flex items-center justify-center">
                                <RefreshCw size={13} className="text-amber-400 animate-spin" />
                              </span>
                            )}
                            {item.status === 'completed' && (
                              <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                                <Check size={9} className="stroke-[3]" />
                              </span>
                            )}
                            {item.status === 'error' && (
                              <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm">
                                <AlertCircle size={9} />
                              </span>
                            )}
                            {item.imageType === 'size_guide' && (
                              <span className="absolute bottom-0 inset-x-0 bg-neutral-950/80 text-[8px] text-amber-300 font-bold uppercase text-center py-0.2 truncate leading-tight">
                                Size
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Batch Simultaneous Action Button */}
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateAllQueued}
                      disabled={isBatchGenerating || studioQueue.some((q) => q.status === 'generating')}
                      className="px-3.5 py-2 bg-neutral-950 hover:bg-black text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 touch-manipulation disabled:opacity-50"
                    >
                      {isBatchGenerating ? (
                        <>
                          <RefreshCw size={13} className="animate-spin text-amber-400" />
                          <span>Re-imagining All ({studioQueue.filter((q) => q.status === 'generating').length} active)...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} className="text-amber-400" />
                          <span>Re-imagine All ({studioQueue.length}) Directly</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
                  {/* Left Column: Active Image Controls (5 cols) */}
                  <div className="lg:col-span-5 space-y-4">
                    {/* Active Image Mode Box */}
                    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                          Active Item #{activeQueueIndex + 1} of {studioQueue.length}
                        </span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            activeItem?.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : activeItem?.status === 'generating'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : activeItem?.status === 'error'
                                  ? 'bg-red-100 text-red-800 border border-red-200'
                                  : 'bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          {activeItem?.status || 'idle'}
                        </span>
                      </div>

                      {/* Multimodal Generation Mode Toggle */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1.5">
                          Multimodal Generation Mode:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleQueueItemType(activeQueueIndex, 'product')}
                            className={`p-2.5 rounded-lg border text-left transition-all flex items-center gap-2 ${
                              activeItem?.imageType === 'product'
                                ? 'bg-neutral-950 text-white border-neutral-950 shadow-sm'
                                : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                            }`}
                          >
                            <Camera size={14} className={activeItem?.imageType === 'product' ? 'text-amber-400' : 'text-neutral-500'} />
                            <div>
                              <span className="text-xs font-bold block">Product Photo</span>
                              <span className={`text-[10px] block ${activeItem?.imageType === 'product' ? 'text-neutral-300' : 'text-neutral-400'}`}>
                                Editorial photoshoot
                              </span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleQueueItemType(activeQueueIndex, 'size_guide')}
                            className={`p-2.5 rounded-lg border text-left transition-all flex items-center gap-2 ${
                              activeItem?.imageType === 'size_guide'
                                ? 'bg-neutral-950 text-white border-neutral-950 shadow-sm'
                                : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                            }`}
                          >
                            <Ruler size={14} className={activeItem?.imageType === 'size_guide' ? 'text-amber-400' : 'text-neutral-500'} />
                            <div>
                              <span className="text-xs font-bold block">Size Guide</span>
                              <span className={`text-[10px] block ${activeItem?.imageType === 'size_guide' ? 'text-neutral-300' : 'text-neutral-400'}`}>
                                With brand logo
                              </span>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* If Size Guide: Brand Logo Variant Selector */}
                      {activeItem?.imageType === 'size_guide' && (
                        <div className="p-3 bg-white rounded-lg border border-neutral-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1">
                              <span>Brand Logo to Embed:</span>
                            </label>
                            <span className="text-[10px] text-neutral-400">Meow Bark Official</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleQueueItemLogo(activeQueueIndex, 'black')}
                              className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
                                activeItem.logoVariant === 'black'
                                  ? 'bg-neutral-950 text-white border-neutral-950'
                                  : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                              }`}
                            >
                              <div className="w-5 h-5 rounded bg-white border border-neutral-300 p-0.5 flex items-center justify-center shrink-0">
                                <img src="/Black Logo.png" alt="Black Logo" className="max-h-full object-contain" />
                              </div>
                              <span className="truncate">Black Logo (Light)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleQueueItemLogo(activeQueueIndex, 'white')}
                              className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
                                activeItem.logoVariant === 'white'
                                  ? 'bg-neutral-950 text-white border-neutral-950'
                                  : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                              }`}
                            >
                              <div className="w-5 h-5 rounded bg-neutral-900 border border-neutral-700 p-0.5 flex items-center justify-center shrink-0">
                                <img src="/White-logo.png" alt="White Logo" className="max-h-full object-contain" />
                              </div>
                              <span className="truncate">White Logo (Dark)</span>
                            </button>
                          </div>
                          <p className="text-[10px] text-neutral-500 leading-tight">
                            Gemini will read measurement rows directly from this photo and embed our official Meow Bark logo into a clean UK editorial chart.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* If Product Photo: Breed Selection & Style Presets */}
                    {activeItem?.imageType === 'product' && (
                      <>
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
                                }}
                                className={`px-2.5 py-1 text-xs rounded-full border transition-all font-medium touch-manipulation ${
                                  studioBreed === breed
                                    ? 'bg-neutral-950 text-white border-neutral-950 shadow-sm'
                                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
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
                            }}
                            placeholder="Or enter custom breed (e.g. Jack Russell)"
                            className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
                          />
                        </div>

                        {/* Scene Presets */}
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block mb-1.5">
                            Scene &amp; Pose Style
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
                                  }}
                                  className={`p-2 rounded-xl border text-left transition-all touch-manipulation flex flex-col justify-between ${
                                    isSelected
                                      ? 'border-neutral-950 bg-neutral-950 text-white shadow-sm'
                                      : 'border-neutral-200 bg-white hover:border-neutral-300 text-neutral-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <IconComponent size={12} className={isSelected ? 'text-amber-400' : 'text-neutral-600'} />
                                    <span className="text-xs font-bold block truncate">{preset.label}</span>
                                  </div>
                                  <span className={`text-[9px] block leading-tight ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                                    {preset.desc}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Custom Directions */}
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block mb-1">
                        Custom Instructions (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={studioCustomPrompt}
                        onChange={(e) => setStudioCustomPrompt(e.target.value)}
                        placeholder={
                          activeItem?.imageType === 'size_guide'
                            ? 'e.g. Bold table borders, highlight chest girth in centimeters, clean white background'
                            : 'e.g. Playful head tilt, soft golden hour rim lighting, cozy rug'
                        }
                        className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
                      />
                    </div>

                    {/* Active Item Action Buttons */}
                    <div className="pt-1 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleGenerateDirectItem(activeQueueIndex)}
                        disabled={activeItem?.status === 'generating' || isBatchGenerating}
                        className="w-full py-3 px-4 bg-neutral-950 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 touch-manipulation disabled:opacity-50"
                      >
                        {activeItem?.status === 'generating' ? (
                          <>
                            <RefreshCw size={14} className="animate-spin text-amber-400" />
                            <span>Feeding Directly to Gemini...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} className="text-amber-400" />
                            <span>Re-imagine Active Image #{activeQueueIndex + 1} Directly</span>
                          </>
                        )}
                      </button>

                      {activeItem?.imageType === 'product' && (
                        <button
                          type="button"
                          onClick={handleSynthesizePrompt}
                          disabled={isSynthesizingPrompt || isGeneratingImage}
                          className="w-full py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 touch-manipulation"
                        >
                          {isSynthesizingPrompt ? (
                            <>
                              <RefreshCw size={12} className="animate-spin" />
                              <span>Analyzing Prompt...</span>
                            </>
                          ) : (
                            <>
                              <Wand2 size={12} />
                              <span>Synthesize Prompt for Web Gemini Chat</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Column: AI Output & Live Preview (7 cols) */}
                  <div className="lg:col-span-7 bg-neutral-50 rounded-2xl p-4 sm:p-5 border border-neutral-200 flex flex-col justify-between space-y-4">
                    <div className="space-y-3 flex-1">
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
                        <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2">
                          <div className="flex items-center gap-2 text-amber-800">
                            <Sparkles size={14} className="text-amber-600 shrink-0" />
                            <span className="text-xs font-bold">Google Cloud Project Activation Needed for Direct API</span>
                          </div>
                          <p className="text-[11px] text-amber-700 leading-relaxed">
                            Google Generative AI image generation requires a Google Cloud project with billing/quota enabled on your API key.
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <a
                              href="https://console.cloud.google.com/billing"
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-900 hover:bg-black text-white text-[11px] font-semibold rounded-lg shadow-sm"
                            >
                              <span>Open Google Cloud Billing</span>
                              <ExternalLink size={10} />
                            </a>
                            <span className="text-[11px] text-amber-700">
                              Or upload images generated in your free gemini.google.com chat below!
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Side-by-side: Source vs Result */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Source Image */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                              Source Image #{activeQueueIndex + 1}
                            </span>
                            <span className="text-[9px] text-neutral-400 font-medium">Direct Input</span>
                          </div>
                          <div className="aspect-square w-full rounded-xl overflow-hidden border border-neutral-300 bg-white relative flex items-center justify-center">
                            <img
                              src={activeItem?.sourceUrl || studioSourceImage}
                              alt="Source preview"
                              className="w-full h-full object-contain p-1"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/Logo.jpg';
                              }}
                            />
                            {activeItem?.imageType === 'size_guide' && (
                              <div className="absolute top-2 left-2 bg-neutral-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1">
                                <Ruler size={10} className="text-amber-400" />
                                <span>Supplier Sizing</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Gemini Re-imagined Image */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-900">
                              Gemini Multimodal Result
                            </span>
                            {activeItem?.status === 'completed' && (
                              <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                                <CheckCircle2 size={10} />
                                <span>Ready</span>
                              </span>
                            )}
                          </div>

                          <div className="aspect-square w-full rounded-xl overflow-hidden border-2 border-neutral-900 bg-neutral-900 relative flex items-center justify-center">
                            {activeItem?.generatedUrl ? (
                              <>
                                <img
                                  src={activeItem.generatedUrl}
                                  alt="Gemini Re-imagined"
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute top-2 right-2 px-2 py-0.5 text-[9px] font-bold bg-neutral-950/80 backdrop-blur-sm text-emerald-400 border border-emerald-400/30 rounded">
                                  Gemini Editorial
                                </span>
                              </>
                            ) : activeItem?.status === 'generating' ? (
                              <div className="p-4 text-center space-y-2 text-white">
                                <RefreshCw size={24} className="animate-spin text-amber-400 mx-auto" />
                                <span className="text-xs font-bold block">Transforming Directly...</span>
                                <span className="text-[10px] text-neutral-300 block max-w-xs leading-relaxed">
                                  {activeItem?.imageType === 'size_guide'
                                    ? 'Re-creating sizing chart with Meow Bark brand logo...'
                                    : `Applying ${studioBreed} model and 85mm British studio lighting...`}
                                </span>
                              </div>
                            ) : (
                              <div className="p-4 text-center space-y-2 text-neutral-400">
                                <Sparkles size={24} className="text-neutral-500 mx-auto" />
                                <span className="text-xs font-bold text-neutral-200 block">
                                  No Generated Image Yet
                                </span>
                                <span className="text-[10px] text-neutral-400 block max-w-xs leading-tight">
                                  Tap &quot;Re-imagine Active Image&quot; or &quot;Re-imagine All&quot; to generate directly with Gemini.
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Post-Generation Actions for Active Item */}
                      {activeItem?.generatedUrl && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleReplaceImageInGallery(activeItem.sourceUrl, activeItem.generatedUrl!)}
                            className="py-2 px-3 bg-neutral-950 hover:bg-black text-white text-xs font-bold rounded-lg transition-all shadow flex items-center justify-center gap-1.5 touch-manipulation"
                          >
                            <CheckCircle2 size={13} className="text-emerald-400" />
                            <span>Replace in Gallery</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPrimaryImageUrl(activeItem.generatedUrl!);
                              handleReplaceImageInGallery(activeItem.sourceUrl, activeItem.generatedUrl!);
                            }}
                            className="py-2 px-3 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 touch-manipulation"
                          >
                            <span>Set as Primary</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedImageUrls((prev) => [activeItem.generatedUrl!, ...prev]);
                              if (stagedProduct) {
                                setStagedProduct({
                                  ...stagedProduct,
                                  images: [activeItem.generatedUrl!, ...stagedProduct.images]
                                });
                              }
                            }}
                            className="py-2 px-3 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 touch-manipulation"
                          >
                            <span>Add as New Photo</span>
                          </button>
                        </div>
                      )}

                      {/* Synthesized Prompt Card if available */}
                      {synthesizedPrompt && (
                        <div className="bg-white p-3 rounded-xl border border-neutral-200 space-y-2 shadow-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5 truncate">
                              <Sparkles size={12} className="text-amber-500 shrink-0" />
                              <span className="truncate">Synthesized Prompt for Gemini Chat</span>
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyPrompt}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg transition-colors touch-manipulation shrink-0"
                            >
                              {hasCopiedPrompt ? (
                                <>
                                  <Check size={12} className="text-emerald-600" />
                                  <span className="text-emerald-700">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          {synthesizedAnalysis && (
                            <p className="text-[10px] text-neutral-500 italic bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                              &quot;{synthesizedAnalysis}&quot;
                            </p>
                          )}
                          <div className="p-2 bg-neutral-900 text-neutral-100 rounded-lg text-[11px] font-mono leading-relaxed max-h-24 overflow-y-auto select-all">
                            {synthesizedPrompt}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Manual Drop-In Upload Box */}
                    <div className="pt-2 border-t border-neutral-200 shrink-0">
                      <label className="flex items-center justify-between p-2.5 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl cursor-pointer transition-colors group touch-manipulation">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-neutral-100 group-hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors shrink-0">
                            <UploadCloud size={15} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-neutral-800 block truncate">
                              {isUploadingManual ? 'Uploading to Store...' : 'Upload Image from Gemini Chat'}
                            </span>
                            <span className="text-[10px] text-neutral-500 block truncate">
                              Generated via gemini.google.com? Click to upload and attach directly
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
                        <span className="text-[11px] font-semibold text-neutral-900 px-2.5 py-1 bg-neutral-100 group-hover:bg-neutral-200 rounded-lg transition-colors shrink-0">
                          Browse
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* RELINK SUPPLIER & LIVE STOCK SYNC MODAL                     */}
        {/* ========================================================= */}
        {relinkModalProduct && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-4 sm:p-6 border-b border-neutral-200 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Supplier Management
                  </span>
                  <h3 className="text-lg font-bold text-neutral-900">
                    Relink AliExpress Supplier
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCloseRelinkModal}
                  disabled={isSubmittingRelink}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
                {/* Target Store Product Summary */}
                <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-3">
                  {relinkModalProduct.primaryImage && (
                    <img
                      src={relinkModalProduct.primaryImage}
                      alt={relinkModalProduct.name}
                      className="w-12 h-12 object-cover rounded-lg border border-neutral-200 shrink-0 bg-white"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                      Target Store Catalog Item
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                      {relinkModalProduct.name}
                    </h4>
                    <p className="text-[11px] text-neutral-500 font-mono">
                      Current Supplier ID: {relinkModalProduct.aliexpressProductId}
                    </p>
                  </div>
                </div>

                {/* Input New Supplier URL or ID */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">
                    New AliExpress Product URL or Item ID
                  </label>
                  <p className="text-xs text-neutral-500">
                    Paste the replacement listing URL (e.g. from search, image search, or recommendation) or numerical product ID.
                  </p>

                  <form onSubmit={handleFetchRelinkPreview} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={relinkNewUrl}
                      onChange={(e) => setRelinkNewUrl(e.target.value)}
                      placeholder="e.g. https://www.aliexpress.com/item/1005007826530450.html or 1005007826530450"
                      className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-neutral-50/50 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isFetchingRelinkPreview || !relinkNewUrl.trim()}
                      className="px-4 py-2.5 bg-neutral-900 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shrink-0"
                    >
                      {isFetchingRelinkPreview ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Fetching Listing...</span>
                        </>
                      ) : (
                        <>
                          <Search size={13} />
                          <span>Preview Supplier</span>
                        </>
                      )}
                    </button>
                  </form>

                  {relinkPreviewError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{relinkPreviewError}</span>
                    </div>
                  )}
                </div>

                {/* Preview Card (Once supplier listing is fetched) */}
                {relinkSupplierPreview && (
                  <div className="space-y-4 border-t border-neutral-200 pt-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                        <Check size={14} className="text-emerald-600" />
                        Replacement Supplier Found
                      </span>
                      <span className="text-[11px] font-mono text-neutral-500">
                        ID: {relinkSupplierPreview.productId}
                      </span>
                    </div>

                    <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl flex items-start gap-3">
                      {relinkSupplierPreview.images?.[0] && (
                        <img
                          src={relinkSupplierPreview.images[0]}
                          alt="Supplier product"
                          className="w-16 h-16 object-cover rounded-lg border border-neutral-200 shrink-0 bg-white"
                        />
                      )}
                      <div className="min-w-0 flex-1 space-y-1">
                        <h5 className="text-xs font-bold text-neutral-900 line-clamp-2">
                          {relinkSupplierPreview.title}
                        </h5>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                          <span className="font-semibold text-neutral-900">
                            Supplier Cost: £{relinkSupplierPreview.priceMin.toFixed(2)}
                            {relinkSupplierPreview.priceMax > relinkSupplierPreview.priceMin &&
                              ` - £${relinkSupplierPreview.priceMax.toFixed(2)}`}
                          </span>
                          <span>•</span>
                          <span>{relinkSupplierPreview.variants.length} supplier variants</span>
                        </div>
                      </div>
                    </div>

                    {/* Variant Mapping Comparison Table */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">
                        Variant Inventory Mapping Preview
                      </label>
                      <div className="border border-neutral-200 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                            <tr>
                              <th className="py-2.5 px-3">Size / Option</th>
                              <th className="py-2.5 px-3">Current Store</th>
                              <th className="py-2.5 px-3">New Supplier</th>
                              <th className="py-2.5 px-3">Sync Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 font-mono">
                            {(() => {
                              // Build mapping between store variants and supplier variants
                              const supplierSizes = relinkSupplierPreview.variants.map((sv) => {
                                const sizeProp = sv.properties.find((p) => /size/i.test(p.name))?.value || '';
                                return {
                                  rawSize: sizeProp,
                                  cleanSize: extractCleanSizeCode(sizeProp),
                                  stock: sv.stock
                                };
                              });

                              // Collect all unique sizes
                              const uniqueSizes = Array.from(
                                new Set([
                                  ...relinkModalProduct.variants.map((v) => v.size || v.sku),
                                  ...supplierSizes.map((s) => s.cleanSize || s.rawSize)
                                ])
                              ).filter(Boolean);

                              return uniqueSizes.map((sizeName) => {
                                const cleanKey = extractCleanSizeCode(sizeName);
                                const storeVar = relinkModalProduct.variants.find(
                                  (v) => (v.size && extractCleanSizeCode(v.size) === cleanKey) || v.sku === sizeName
                                );
                                const supplierMatch = supplierSizes.find(
                                  (s) => s.cleanSize === cleanKey || s.rawSize === sizeName
                                );

                                const storeStock = storeVar ? storeVar.quantity : null;
                                const supplierStock = supplierMatch ? supplierMatch.stock : null;

                                return (
                                  <tr key={sizeName} className="hover:bg-neutral-50/50">
                                    <td className="py-2 px-3 font-sans font-bold text-neutral-900">
                                      {sizeName}
                                    </td>
                                    <td className="py-2 px-3">
                                      {storeStock !== null ? (
                                        <span className={storeStock === 0 ? 'text-red-600' : 'text-neutral-700'}>
                                          {storeStock} units
                                        </span>
                                      ) : (
                                        <span className="text-neutral-400 font-sans italic">Not in store</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3">
                                      {supplierStock !== null ? (
                                        <span className={supplierStock > 0 ? 'text-emerald-700 font-bold' : 'text-red-600'}>
                                          {supplierStock} in stock
                                        </span>
                                      ) : (
                                        <span className="text-red-500 font-sans">Unavailable</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 font-sans">
                                      {storeStock !== null && supplierStock !== null ? (
                                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                          Update to {supplierStock}
                                        </span>
                                      ) : storeStock !== null && supplierStock === null ? (
                                        <span className="text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                          Set to 0 (Out of Stock)
                                        </span>
                                      ) : (
                                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                          {relinkAddNewVariants ? `Add (+${supplierStock} units)` : 'Skip'}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Add missing variants option toggle */}
                    <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={relinkAddNewVariants}
                        onChange={(e) => setRelinkAddNewVariants(e.target.checked)}
                        className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                      />
                      <span>
                        Add newly discovered sizes to store if offered by the replacement supplier
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Modal Actions Footer */}
              <div className="p-4 sm:p-6 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseRelinkModal}
                  disabled={isSubmittingRelink}
                  className="px-4 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 border border-neutral-300 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRelink}
                  disabled={isSubmittingRelink || !relinkSupplierPreview}
                  className="px-5 py-2 text-xs font-semibold bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmittingRelink ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Updating Supplier & Stock...</span>
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      <span>Confirm Relink & Sync Stock</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
