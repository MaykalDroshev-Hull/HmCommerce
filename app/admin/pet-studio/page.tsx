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
} from 'lucide-react';

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

export type StudioMode = 'single' | 'versus' | 'dual_costume';

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
  /*  File handlers                                                    */
  /* ---------------------------------------------------------------- */

  const handleFileUpload = useCallback((file: File, setter: (v: string | null) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setter(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Stitch Original Photos (Instant Slide 1)                         */
  /* ---------------------------------------------------------------- */

  const canStitchOriginals = () => {
    if (!petImageA) return false;
    if (mode !== 'single' && !petImageB) return false;
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
        mode: mode === 'single' ? 'single' : 'versus',
        layout: versusLayout,
        aspectRatio: activeRatio,
      });

      setGeneratedImage(stitchedDataUrl);
      const newItem: GalleryItem = {
        id: `original-${Date.now()}`,
        url: stitchedDataUrl,
        label: mode === 'single' ? 'Slide 1: Original Photo' : 'Slide 1: Originals (50/50)',
        type: 'original',
        createdAt: Date.now(),
      };
      setGallery(prev => [newItem, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Failed to stitch original photos.');
    } finally {
      setStitching(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  AI Fashion Generation (Slide 2 or Slide 3 CTA)                   */
  /* ---------------------------------------------------------------- */

  const canGenerate = () => {
    if (!petImageA) return false;
    if (!selectedProductImage) return false;
    if (mode === 'versus' && !petImageB) return false;
    if (mode === 'dual_costume') {
      if (!petImageB) return false;
      if (!selectedProductImageB) return false;
    }
    return true;
  };

  const handleGenerate = async () => {
    if (!canGenerate() || generating) return;
    setGenerating(true);
    setError('');

    try {
      const petImages = mode === 'single'
        ? [petImageA!]
        : [petImageA!, petImageB!];

      const res = await fetch('/api/admin/pet-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          petImages,
          productImageUrl: selectedProductImage,
          productName: productDetail?.name || 'Pet Outfit A',
          productImageUrlB: mode === 'dual_costume' ? selectedProductImageB : undefined,
          productNameB: mode === 'dual_costume' ? (productDetailB?.name || 'Pet Outfit B') : undefined,
          customInstructions: customInstructions.trim() || undefined,
          aspectRatio: aspectRatio === 'custom' ? customRatio.trim() : aspectRatio,
          versusLayout: mode !== 'single' ? versusLayout : undefined,
        })
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        setGeneratedImage(data.imageUrl);

        let label = 'AI Dressed Shot';
        if (mode === 'versus') label = 'Slide 2: Same Outfit (50/50)';
        if (mode === 'dual_costume') label = 'Slide 3: 2 Costumes (CTA)';

        const newItem: GalleryItem = {
          id: `ai-${Date.now()}`,
          url: data.imageUrl,
          label,
          type: 'ai',
          createdAt: Date.now(),
        };
        setGallery(prev => [newItem, ...prev]);
      } else {
        setError(data.error || 'Generation failed. Please try again.');
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
            onClick={() => setMode('single')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all"
            style={mode === 'single' ? btnPrimary : btnSecondary}
          >
            <Camera size={16} />
            Single Pet
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
            onClick={() => setMode('dual_costume')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all"
            style={mode === 'dual_costume' ? btnPrimary : btnSecondary}
            title="Both pets wearing 2 different costumes for your final Call-to-Action slide"
          >
            <Sparkles size={16} />
            2 Different Costumes (Final CTA Slide)
          </button>

          {/* Versus / Dual Costume layout direction */}
          {mode !== 'single' && (
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
                {mode !== 'single' ? 'Upload Pet Photos (A & B)' : 'Upload Pet Photo'}
              </h2>

              <div className={`grid gap-4 ${mode !== 'single' ? 'grid-cols-2' : 'grid-cols-1'}`}>

                {/* Pet A */}
                <div className="space-y-2">
                  {mode !== 'single' && (
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
                      Pet A
                    </span>
                  )}
                  {petImageA ? (
                    <div className="relative group rounded-lg overflow-hidden aspect-square border" style={{ borderColor: theme.colors.border }}>
                      <Image
                        src={petImageA}
                        alt="Pet A photo"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <button
                        onClick={() => setPetImageA(null)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove pet A photo"
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
                        {mode !== 'single' ? 'Upload Pet A' : 'Upload Pet Photo'}
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

                {/* Pet B (versus & dual_costume mode) */}
                {mode !== 'single' && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
                      Pet B
                    </span>
                    {petImageB ? (
                      <div className="relative group rounded-lg overflow-hidden aspect-square border" style={{ borderColor: theme.colors.border }}>
                        <Image
                          src={petImageB}
                          alt="Pet B photo"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <button
                          onClick={() => setPetImageB(null)}
                          className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove pet B photo"
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
                        <span className="text-sm font-medium">Upload Pet B</span>
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

            {/* Product Selector(s) */}
            <div style={cardStyle} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: theme.colors.text }}>
                  <ImageIcon size={18} />
                  {mode === 'dual_costume' ? 'Select 2 Costumes' : 'Select Product for AI Dressing'}
                </h2>
                {mode === 'dual_costume' && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                    Dual Outfit Mode
                  </span>
                )}
              </div>

              {/* Product A Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider block" style={{ color: theme.colors.textSecondary }}>
                  {mode === 'dual_costume' ? 'Costume for Pet A' : 'Product to Model'}
                </label>
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
                        : 'Choose product...'}
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
                  <div className="pt-1">
                    <p className="text-[11px] mb-1.5" style={{ color: theme.colors.textSecondary }}>
                      Select image angle for Pet A:
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

              {/* Product B Selector (Dual Costume mode only) */}
              {mode === 'dual_costume' && (
                <div className="space-y-2 pt-3 border-t" style={{ borderColor: theme.colors.border }}>
                  <label className="text-xs font-bold uppercase tracking-wider block" style={{ color: theme.colors.textSecondary }}>
                    Costume for Pet B
                  </label>
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
                          : 'Choose second costume for Pet B...'}
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
                    <div className="pt-1">
                      <p className="text-[11px] mb-1.5" style={{ color: theme.colors.textSecondary }}>
                        Select image angle for Pet B:
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
                placeholder="e.g. 'Sunny modern studio background', 'Make them both looking at camera smiling'..."
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
                  { id: '9:16', label: '9:16 (Default - TikTok/Reels)' },
                  { id: '16:9', label: '16:9 (Landscape)' },
                  { id: '4.5:16', label: '4.5:16 (Ultrawide Mobile)' },
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

            {/* Creation Action Buttons (Slide 1, Slide 2, Slide 3) */}
            <div className="space-y-3 pt-1">
              {/* Combine Originals Button (Instant / Slide 1) */}
              <button
                onClick={handleStitchOriginals}
                disabled={!canStitchOriginals() || stitching}
                className="w-full flex items-center justify-between px-5 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed border shadow-xs"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.primary,
                  color: theme.colors.text,
                }}
                title="Stitch the original uploaded photos together into an instant 50/50 comparison image for Slide 1"
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
                      {mode !== 'single' ? '1. Combine Originals (Slide 1)' : '1. Frame Original Photo'}
                    </div>
                    <div className="text-[11px] opacity-75 font-normal">
                      Instant 50/50 split • No API wait • Ready for template & overlays
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

              {/* Generate AI Button */}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate() || generating}
                className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                style={btnPrimary}
                title={
                  mode === 'dual_costume'
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
                      {mode === 'dual_costume'
                        ? '3. Generate 2 Costumes Comparison (Final CTA Slide)'
                        : mode === 'versus'
                        ? '2. Generate "Who Wears It Better" (Slide 2 - Same Outfit)'
                        : 'Generate AI Dressed Shot'}
                    </div>
                    <div className="text-[11px] opacity-85 font-normal">
                      {mode === 'dual_costume'
                        ? 'Pet A in Outfit A & Pet B in Outfit B • 30-60s'
                        : mode === 'versus'
                        ? 'Both pets wearing selected product • 30-60s'
                        : 'AI Pet Fashion • Dressed in product'}
                    </div>
                  </div>
                </div>
                {generating && <Loader2 size={18} className="animate-spin" />}
              </button>
            </div>

            {/* Validation hints */}
            {!generating && !stitching && (
              <div
                className="text-xs space-y-1 p-3 rounded-xl border"
                style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textSecondary }}
              >
                {!petImageA && <p>• Upload Pet A photo to enable stitching and generation.</p>}
                {mode !== 'single' && !petImageB && <p>• Upload Pet B photo for the 50/50 comparison.</p>}
                {!selectedProductImage && <p>• Select product for Pet A.</p>}
                {mode === 'dual_costume' && !selectedProductImageB && <p>• Select second product for Pet B.</p>}
                {canStitchOriginals() && (
                  <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    ✓ Pet photos ready! You can combine originals for Slide 1 right now.
                  </p>
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
                {generatedImage && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Ready to Style
                  </span>
                )}
              </div>

              {error && (
                <div
                  className="p-3 rounded-lg text-sm mb-3"
                  style={{
                    backgroundColor: '#fef2f2',
                    color: '#b91c1c',
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: '#fecaca',
                  }}
                >
                  {error}
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
                  />

                  <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: theme.colors.border }}>
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
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16" style={{ color: theme.colors.textSecondary }}>
                  <Sparkles size={44} strokeWidth={1.2} />
                  <div className="text-center max-w-sm">
                    <p className="text-sm font-semibold mb-1" style={{ color: theme.colors.text }}>
                      No image selected yet
                    </p>
                    <p className="text-xs">
                      Upload your pet photos and click <b>1. Combine Originals</b> for Slide 1, <b>2. Generate Same Outfit</b> for Slide 2, or <b>3. Generate 2 Costumes</b> for your final Call to Action slide.
                    </p>
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
                                : '#7c3aed',
                              color: '#fff',
                            }}
                          >
                            {item.label.includes('Slide 1')
                              ? 'Slide 1 (Raw)'
                              : item.label.includes('Slide 3')
                              ? 'Slide 3 (CTA)'
                              : 'Slide 2 (Dressed)'}
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
      </div>
    </AdminLayout>
  );
}
