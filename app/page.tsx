'use client';

import { useState, useEffect } from 'react';
import PublicPageLayout from '@/components/PublicPageLayout';
import ProductView from '@/components/ProductView';
import LoadingScreen from '@/components/LoadingScreen';
import { Product } from '@/lib/data';
import { useStoreSettings } from '@/context/StoreSettingsContext';

const FLAGSHIP_PRODUCT_ID = 'a51e34f9-bdf0-41dc-a266-bc1e37fcb816';

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { settings, isLoading: settingsLoading } = useStoreSettings();

  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin');
    if (adminState === 'true') {
      setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    const storeName = settings?.storename || 'M-B Something';
    document.title = `${storeName} | Premium Adventure Dog Collars`;
  }, [settings?.storename]);

  useEffect(() => {
    const loadFlagshipProduct = async () => {
      try {
        setIsLoading(true);
        // Attempt to fetch our flagship product by ID first
        let res = await fetch(`/api/products/${FLAGSHIP_PRODUCT_ID}`);
        let data = await res.json();

        // If not found by static ID, fetch the first available storefront product
        if (!data.success || !data.product) {
          const listRes = await fetch('/api/products');
          const listData = await listRes.json();
          if (listData.success && listData.products && listData.products.length > 0) {
            const firstId = listData.products[0].id || listData.products[0].productid;
            res = await fetch(`/api/products/${firstId}`);
            data = await res.json();
          }
        }

        if (data.success && data.product) {
          const raw = data.product;
          const productData: Product = {
            ...raw,
            variants: raw.Variants || raw.variants || [],
            Variants: raw.Variants || raw.variants || [],
            images: raw.images && raw.images.length > 0
              ? raw.images
              : raw.Images && raw.Images.length > 0
              ? raw.Images.map((img: any) => img.imageurl || img.url)
              : ['/products/collar-graphite-grey.jpg'],
            brand: raw.brand || 'M-B Something',
            model: raw.model || raw.Name || 'Daydrift Adventure Dog Collar',
            propertyValues: raw.propertyValues || raw.propertyvalues || {},
          };
          setProduct(productData);
        }
      } catch (error) {
        console.error('Failed to load flagship product:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFlagshipProduct();
  }, []);

  const handleSetIsAdmin = (value: boolean) => {
    setIsAdmin(value);
    localStorage.setItem('isAdmin', value.toString());
  };

  if (settingsLoading || isLoading) {
    return <LoadingScreen />;
  }

  if (!product) {
    return (
      <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
        <div className="flex-1 flex items-center justify-center py-24">
          <p className="text-sm text-neutral-500">No product found.</p>
        </div>
      </PublicPageLayout>
    );
  }

  return (
    <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
      <ProductView product={product} />
    </PublicPageLayout>
  );
}
