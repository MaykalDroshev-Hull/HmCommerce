'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import PublicPageLayout from '@/components/PublicPageLayout';
import ProductView from '@/components/ProductView';
import ProductSkeleton from '@/components/ProductSkeleton';
import { Product } from '@/lib/data';
import { useLanguage } from '@/context/LanguageContext';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { translations } from '@/lib/translations';
import { trackStoreEvent } from '@/lib/vercel-analytics';
import type { SuperPromoDisplayItem } from '@/lib/super-promo';

function ProductDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const { isLoading: settingsLoading } = useStoreSettings();
  const t = translations[language];
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [superPromo, setSuperPromo] = useState<SuperPromoDisplayItem | null>(null);
  const superPromoVariantId = searchParams.get('superPromo');

  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin');
    if (adminState === 'true') {
      setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    if (!superPromoVariantId) {
      setSuperPromo(null);
      return;
    }

    const loadSuperPromo = async () => {
      try {
        const response = await fetch(
          `/api/super-promo?variantId=${encodeURIComponent(superPromoVariantId)}`
        );
        const data = await response.json();
        setSuperPromo(data.success && data.item ? data.item : null);
      } catch {
        setSuperPromo(null);
      }
    };

    loadSuperPromo();
  }, [superPromoVariantId]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${params.id}`);
        if (!response.ok) {
          throw new Error('Product not found');
        }
        const data = await response.json();
        
        // API returns { success: true, product: {...} }
        if (data.success && data.product) {
          // Ensure images array exists and has at least one image
          const productData = {
            ...data.product,
            // Map Variants to variants for compatibility with ProductDetails component
            variants: data.product.Variants || data.product.variants || [],
            Variants: data.product.Variants || data.product.variants || [],
            images: data.product.images && data.product.images.length > 0
              ? data.product.images
              : data.product.Images && data.product.Images.length > 0
              ? data.product.Images.map((img: any) => img.imageurl || img.url)
              : ['/image.png'], // Fallback image
            brand: data.product.brand || 'Unknown',
            model: data.product.model || data.product.Name || 'Product',
            // Ensure propertyValues is properly mapped (API returns propertyvalues in lowercase)
            propertyValues: data.product.propertyValues || data.product.propertyvalues || {}
          };
          setProduct(productData);
          trackStoreEvent('Product View', {
            productId: String(params.id),
            productName: productData.name || productData.model || 'Product',
            category: productData.category || 'clothes',
          });
        } else {
          throw new Error('Invalid product data');
        }
      } catch {
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchProduct();
    }
  }, [params.id, router]);

  const handleSetIsAdmin = (value: boolean) => {
    setIsAdmin(value);
    localStorage.setItem('isAdmin', value.toString());
  };

  // Show skeleton loading while product or store settings are fetching
  if (isLoading || settingsLoading) {
    return (
      <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
        <ProductSkeleton />
      </PublicPageLayout>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
      <ProductView product={product} superPromo={superPromo} />
    </PublicPageLayout>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={
        <PublicPageLayout isAdmin={false} setIsAdmin={() => {}}>
          <ProductSkeleton />
        </PublicPageLayout>
      }
    >
      <ProductDetailContent />
    </Suspense>
  );
}

