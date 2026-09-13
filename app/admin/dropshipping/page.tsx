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
  ArrowRight
} from 'lucide-react';
import { AliExpressProductDetails, AliExpressVariant } from '@/lib/aliexpress/types';

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

  // Staged product state
  const [stagedProduct, setStagedProduct] = useState<AliExpressProductDetails | null>(null);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [selectedProductTypeId, setSelectedProductTypeId] = useState<string>('');

  // Editable fields in Staging Customizer
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [sellingPrice, setSellingPrice] = useState<string>('24.99');
  const [compareAtPrice, setCompareAtPrice] = useState<string>('34.99');
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
  const [primaryImageUrl, setPrimaryImageUrl] = useState<string>('');
  const [selectedVariants, setSelectedVariants] = useState<Array<AliExpressVariant & { isIncluded: boolean; customSku?: string; customPrice?: number }>>([]);

  // Import execution state
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<{ productId: string; name: string } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Settings & Connection state
  const [authStatus, setAuthStatus] = useState<{ isConnected: boolean; authUrl: string; tokenExpiresAt?: string | null } | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

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
      
      const defaultSell = prod.priceMin ? (Math.ceil(prod.priceMin * 1.5) - 0.01).toFixed(2) : '24.99';
      const defaultOriginal = prod.priceMin ? (Math.ceil(prod.priceMin * 2.1) - 0.01).toFixed(2) : '34.99';
      setSellingPrice(defaultSell);
      setCompareAtPrice(defaultOriginal);

      setSelectedImageUrls(prod.images || []);
      setPrimaryImageUrl(prod.images?.[0] || '');

      setSelectedVariants(
        (prod.variants || []).map((v) => ({
          ...v,
          isIncluded: true,
          customPrice: Number(defaultSell)
        }))
      );
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
        selectedVariants: includedVariants.map((v) => ({
          skuId: v.skuId,
          sku: v.skuCode,
          price: v.customPrice || sellPriceNum,
          compareAtPrice: comparePriceNum,
          quantity: v.stock || 40,
          size: v.properties.find((p) => /size/i.test(p.name))?.value || undefined,
          colour: v.properties.find((p) => /colou?r/i.test(p.name))?.value || undefined,
          imageUrl: v.imageUrl || orderedImages[0]
        }))
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Fulfillment & Supplier Sync
              </span>
              {authStatus?.isConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  AliExpress Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Direct Scraper Mode
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
              AliExpress Dropshipping Hub
            </h1>
          </div>

          {/* Tab navigation */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-lg self-start">
            <button
              onClick={() => setActiveTab('import')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'import'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Product Importer
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'orders'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Order Fulfillment
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
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
          <div className="space-y-8">
            {/* Import Success Banner */}
            {importSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-4">
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
                <div className="flex items-center gap-2">
                  <Link
                    href={`/products/${importSuccess.productId}`}
                    target="_blank"
                    className="px-3 py-1.5 text-xs font-semibold bg-white border border-emerald-300 text-emerald-800 rounded-md hover:bg-emerald-50 flex items-center gap-1.5"
                  >
                    <span>View on Store</span>
                    <ExternalLink size={12} />
                  </Link>
                  <Link
                    href="/admin/products"
                    className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded-md hover:bg-emerald-800"
                  >
                    Manage in Items
                  </Link>
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                Import by URL or Product ID
              </h2>
              <p className="text-xs text-neutral-600 mb-4">
                Enter any AliExpress product URL or item ID to pull product details, images, sizes, and specs into your customizable staging editor.
              </p>

              <form onSubmit={handleFetch} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={urlOrId}
                    onChange={(e) => setUrlOrId(e.target.value)}
                    placeholder="e.g. https://www.aliexpress.com/item/1005006247926174.html or 1005006247926174"
                    className="w-full px-4 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-neutral-50/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isFetching || !urlOrId.trim()}
                  className="px-6 py-2.5 bg-neutral-900 text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0"
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
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                      Product Title
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomTitle(cleanTitleForPetBrand(stagedProduct.title))}
                      className="text-xs text-neutral-600 hover:text-neutral-900 flex items-center gap-1 underline"
                    >
                      <Sparkles size={12} />
                      <span>Re-clean Title</span>
                    </button>
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
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                      Product Description (British Pet Parent Tone)
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomDescription(enhanceDescriptionForPetParents(stagedProduct.description, customTitle))}
                      className="text-xs text-neutral-600 hover:text-neutral-900 flex items-center gap-1 underline"
                    >
                      <Sparkles size={12} />
                      <span>Generate British Pet Copy</span>
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    className="w-full px-4 py-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 font-sans leading-relaxed"
                  />
                  <p className="text-[11px] text-neutral-400">
                    Pre-formatted in British English with warm, affectionate terminology (&apos;furbaby&apos;, &apos;pet parent&apos;, &apos;tail-wagging&apos;).
                  </p>
                </div>

                {/* Section C: Image Selector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                        Product Images
                      </label>
                      <p className="text-xs text-neutral-500">
                        Select which images to include ({selectedImageUrls.length} selected). Click &quot;Make Primary&quot; to set the main photo.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {(stagedProduct.images || []).map((imgUrl, idx) => {
                      const isSelected = selectedImageUrls.includes(imgUrl);
                      const isPrimary = primaryImageUrl === imgUrl;

                      return (
                        <div
                          key={idx}
                          className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                            isPrimary
                              ? 'border-neutral-950 ring-2 ring-neutral-950/20'
                              : isSelected
                              ? 'border-neutral-900'
                              : 'border-neutral-200 opacity-50'
                          }`}
                        >
                          <div className="aspect-square bg-neutral-100">
                            <img
                              src={imgUrl}
                              alt="Import Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Checkbox badge */}
                          <button
                            type="button"
                            onClick={() => toggleImageSelection(imgUrl)}
                            className={`absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-neutral-950 text-white' : 'bg-white/80 text-neutral-400 border'
                            }`}
                          >
                            <Check size={14} className={isSelected ? 'opacity-100' : 'opacity-0'} />
                          </button>

                          {/* Primary marker */}
                          {isPrimary ? (
                            <span className="absolute bottom-1 left-1 right-1 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider bg-neutral-950 text-white rounded">
                              Primary
                            </span>
                          ) : (
                            isSelected && (
                              <button
                                type="button"
                                onClick={() => setPrimaryImageUrl(imgUrl)}
                                className="absolute bottom-1 left-1 right-1 py-0.5 text-center text-[10px] font-semibold bg-white/90 text-neutral-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
                <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-4">
                    Pricing & Profit Margin (£ GBP)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <span className="text-[11px] font-medium text-neutral-500 block mb-1">
                        Supplier Base Cost
                      </span>
                      <p className="text-lg font-bold text-neutral-900">
                        £{stagedProduct.priceMin.toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-neutral-700 block mb-1">
                        Selling Price (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white font-medium"
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
                      {parseFloat(sellingPrice) > stagedProduct.priceMin ? (
                        <p className="text-lg font-bold text-emerald-600">
                          +£{(parseFloat(sellingPrice) - stagedProduct.priceMin).toFixed(2)}{' '}
                          <span className="text-xs text-neutral-500 font-normal">
                            ({Math.round(((parseFloat(sellingPrice) - stagedProduct.priceMin) / parseFloat(sellingPrice)) * 100)}%)
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm font-bold text-red-500">Below Cost</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section E: Variants */}
                {selectedVariants.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">
                      Product Variants & Stock ({selectedVariants.filter((v) => v.isIncluded).length} included)
                    </label>

                    <div className="border border-neutral-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600">
                          <tr>
                            <th className="py-2.5 px-3 w-10 text-center">Include</th>
                            <th className="py-2.5 px-3">Option / Size</th>
                            <th className="py-2.5 px-3">Supplier SKU</th>
                            <th className="py-2.5 px-3">Price (£)</th>
                            <th className="py-2.5 px-3">Stock Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {selectedVariants.map((variant, idx) => (
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
                                {variant.properties.map((p) => `${p.name}: ${p.value}`).join(' / ') || `Variant #${idx + 1}`}
                              </td>
                              <td className="py-2.5 px-3 text-neutral-500">
                                {variant.skuCode || variant.skuId}
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
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

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
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
