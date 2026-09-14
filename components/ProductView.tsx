'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import ProductMediaGallery from './ProductMediaGallery';
import ProductDetails from './ProductDetails';
import ProductStickyBanner from './ProductStickyBanner';
import ProductCard from './ProductCard';
import { Product } from '@/lib/data';
import { ChevronRight } from 'lucide-react';

interface ProductViewProps {
  product: Product;
  superPromo?: any;
}

export default function ProductView({ product }: ProductViewProps) {
  const [galleryImages, setGalleryImages] = useState<string[]>(() => {
    const rawImages = product?.images || (product as any)?.Images || [];
    if (Array.isArray(rawImages) && rawImages.length > 0) {
      const valid = rawImages.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
      if (valid.length > 0) return valid;
    }
    return [
      'https://rrpmpvffewatuldyytqf.supabase.co/storage/v1/object/public/products/collar-graphite-grey.jpg',
      'https://rrpmpvffewatuldyytqf.supabase.co/storage/v1/object/public/products/collar-sand-khaki.jpg',
      'https://rrpmpvffewatuldyytqf.supabase.co/storage/v1/object/public/products/collar-hardware-detail.jpg',
      'https://rrpmpvffewatuldyytqf.supabase.co/storage/v1/object/public/products/collar-lifestyle.jpg',
    ];
  });
  const [focusImage, setFocusImage] = useState<string | null>(null);

  // Sticky banner state
  const [isStickyVisible, setIsStickyVisible] = useState(false);
  const [selectedColour, setSelectedColour] = useState('Heathered Graphite Grey');
  const [selectedColourHex, setSelectedColourHex] = useState('#4A4D50');
  const [selectedSize, setSelectedSize] = useState('XS');
  const [activePrice, setActivePrice] = useState<number>(() => Number(product?.price || 36.00));
  const [isOutOfStock, setIsOutOfStock] = useState(false);

  // Related products state
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isAssigned, setIsAssigned] = useState(false);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);

  const buyButtonRef = useRef<HTMLButtonElement | null>(null);

  // Sync Gallery Images if product changes
  useEffect(() => {
    const rawImages = product?.images || (product as any)?.Images || [];
    if (Array.isArray(rawImages) && rawImages.length > 0) {
      const valid = rawImages.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
      if (valid.length > 0) {
        setGalleryImages(valid);
        return;
      }
    }
    setGalleryImages([
      'https://rrpmpvffewatuldyytqf.supabase.co/storage/v1/object/public/products/collar-graphite-grey.jpg',
      'https://rrpmpvffewatuldyytqf.supabase.co/storage/v1/object/public/products/collar-sand-khaki.jpg',
      'https://rrpmpvffewatuldyytqf.supabase.co/storage/v1/object/public/products/collar-hardware-detail.jpg',
      'https://rrpmpvffewatuldyytqf.supabase.co/storage/v1/object/public/products/collar-lifestyle.jpg',
    ]);
  }, [product.images, (product as any).Images]);

  // Load related products
  const currentProductId = product.id || (product as any).productid;
  useEffect(() => {
    if (!currentProductId) return;
    let isCancelled = false;

    const fetchRelated = async () => {
      try {
        setIsLoadingRelated(true);
        const res = await fetch(`/api/products/${currentProductId}/related`);
        const data = await res.json();
        if (!isCancelled && data.success && Array.isArray(data.products)) {
          setRelatedProducts(data.products);
          setIsAssigned(Boolean(data.isAssigned));
        }
      } catch (err) {
        console.error('Failed to load related products', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingRelated(false);
        }
      }
    };

    fetchRelated();
    return () => {
      isCancelled = true;
    };
  }, [currentProductId]);


  // Variant change callback
  const handleVariantImageChange = useCallback((images: string[] | string | undefined) => {
    if (images) {
      const first = Array.isArray(images) ? images[0] : images;
      setFocusImage(first || null);
    }
  }, []);

  // Option change callback from ProductDetails
  const handleOptionChange = (col: string, hex: string, sz: string, price?: number, outOfStock?: boolean) => {
    setSelectedColour(col);
    setSelectedColourHex(hex);
    setSelectedSize(sz);
    if (typeof price === 'number' && !Number.isNaN(price)) {
      setActivePrice(price);
    }
    setIsOutOfStock(!!outOfStock);
  };

  // Scroll observer to trigger sticky banners
  useEffect(() => {
    const btn = buyButtonRef.current;
    if (!btn) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When buy button is above the viewport (scrolled past), show sticky banner
        const isAbove = entry.boundingClientRect.bottom < 0;
        setIsStickyVisible(isAbove);
      },
      { threshold: 0, rootMargin: '-60px 0px 0px 0px' }
    );

    observer.observe(btn);

    // Also track scroll directly for responsiveness
    const handleScroll = () => {
      if (btn) {
        const rect = btn.getBoundingClientRect();
        setIsStickyVisible(rect.bottom < 60);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const productName = product.name || 'Daydrift Adventure Dog Collar';
  const price = Number(product.price || 36.00);
  const categoryLabel =
    product.type ||
    (product.category === 'clothes'
      ? 'Collars'
      : product.category === 'shoes'
      ? 'Harnesses'
      : product.category === 'accessories'
      ? 'Accessories'
      : product.category || 'Gear');

  const handleStickyAddToCart = () => {
    if (buyButtonRef.current) {
      buyButtonRef.current.click();
    }
  };

  return (
    <div className="bg-white min-h-screen text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Sticky Banner (Desktop Top & Mobile Bottom) */}
      <ProductStickyBanner
        isVisible={isStickyVisible}
        productName={productName}
        price={activePrice}
        currencySymbol="£"
        selectedColour={selectedColour}
        selectedColourHex={selectedColourHex}
        selectedSize={selectedSize}
        isOutOfStock={isOutOfStock}
        onAddToCart={handleStickyAddToCart}
      />

      {/* Main Product Section: 2-Column Grid */}
      <main id="product" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Editorial Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-4 sm:mb-6 text-xs font-medium text-neutral-500">
          <ol className="flex items-center gap-1.5 flex-wrap">
            <li>
              <Link href="/" className="hover:text-neutral-900 transition-colors">
                Home
              </Link>
            </li>
            <li className="text-neutral-400">
              <ChevronRight size={13} />
            </li>
            <li>
              <Link href="/products" className="hover:text-neutral-900 transition-colors">
                Products
              </Link>
            </li>
            {categoryLabel && (
              <>
                <li className="text-neutral-400">
                  <ChevronRight size={13} />
                </li>
                <li>
                  <Link
                    href="/products"
                    className="hover:text-neutral-900 transition-colors"
                  >
                    {categoryLabel}
                  </Link>
                </li>
              </>
            )}
            <li className="text-neutral-400">
              <ChevronRight size={13} />
            </li>
            <li>
              <span className="text-neutral-900 font-semibold truncate max-w-[200px] sm:max-w-none inline-block align-bottom">
                {productName}
              </span>
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-14 items-start">

          {/* Left Column: 2x2 Image Grid (7 cols on desktop) */}
          <div className="md:col-span-7 space-y-4">
            <ProductMediaGallery
              images={galleryImages}
              productName={productName}
              focusImage={focusImage}
            />
          </div>

          {/* Right Column: Sticky Purchase Details Panel (5 cols on desktop) */}
          <div className="md:col-span-5 md:sticky md:top-24 self-start">
            <ProductDetails
              product={product}
              onVariantChange={handleVariantImageChange}
              onOptionChangeCallback={handleOptionChange}
              buyButtonRef={buyButtonRef}
            />
          </div>
        </div>
      </main>

      {/* Related Products Section */}
      {(relatedProducts.length > 0 || isLoadingRelated) && (
        <section className="border-t border-neutral-200 py-16 sm:py-24 bg-neutral-50/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-12 gap-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 mb-1.5">
                  {isAssigned ? 'Pairs Well With This' : 'Recommended For You'}
                </h2>
                <p className="text-2xl sm:text-3xl font-bold text-neutral-950 tracking-tight">
                  {isAssigned ? 'Complete The Look' : 'You May Also Like'}
                </p>
              </div>
              <Link
                href="/products"
                className="text-xs font-bold uppercase tracking-wider text-neutral-900 hover:text-neutral-600 underline shrink-0 inline-flex items-center gap-1.5"
              >
                <span>View All Products</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {isLoadingRelated ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse space-y-3">
                    <div className="aspect-square bg-neutral-200/80 rounded-lg" />
                    <div className="h-4 bg-neutral-200/80 rounded w-3/4" />
                    <div className="h-4 bg-neutral-200/80 rounded w-1/4" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((relProduct) => (
                  <ProductCard
                    key={relProduct.id || (relProduct as any).productid}
                    product={relProduct}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
