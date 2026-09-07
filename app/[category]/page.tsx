'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import PublicPageLayout from '@/components/PublicPageLayout';
import StorePage from '@/components/StorePage';
import { useProducts } from '@/context/ProductContext';
import { useProductTypes } from '@/context/ProductTypeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { translations } from '@/lib/translations';

export default function CategoryPage() {
  const { category } = useParams();
  const { products } = useProducts();
  const { productTypes } = useProductTypes();
  const [isAdmin, setIsAdmin] = useState(false);
  const { language } = useLanguage();
  const { settings } = useStoreSettings();
  const t = translations[language];

  useEffect(() => {
    const productType = productTypes.find(type =>
      type.producttypeid === category || type.code === category
    );
    const pageTitle = productType?.name || t.products || 'Products';
    const storeName = settings?.storename || '';
    document.title = storeName ? `${pageTitle} - ${storeName}` : pageTitle;
  }, [category, productTypes, language, t, settings?.storename]);

  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin');
    if (adminState === 'true') {
      setIsAdmin(true);
    }
  }, []);

  const handleSetIsAdmin = (value: boolean) => {
    setIsAdmin(value);
    localStorage.setItem('isAdmin', value.toString());
  };

  const productType = productTypes.find(type =>
    type.code.toLowerCase() === category ||
    type.producttypeid === category
  );

  if (productType) {
    return (
      <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
        <StorePage products={products} currentPage={productType.producttypeid} />
      </PublicPageLayout>
    );
  }

  return (
    <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-center">
          <h1 className="font-serif-display text-2xl font-bold mb-4">Category Not Found</h1>
          <p>The category &quot;{category}&quot; does not exist.</p>
        </div>
      </div>
    </PublicPageLayout>
  );
}
