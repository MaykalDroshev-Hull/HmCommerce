'use client';

import { useState, useEffect } from 'react';
import PublicPageLayout from '@/components/PublicPageLayout';
import StorePage from '@/components/StorePage';
import LoadingScreen from '@/components/LoadingScreen';
import { useProducts } from '@/context/ProductContext';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

export default function ProductsPage() {
  const { products } = useProducts();
  const [isAdmin, setIsAdmin] = useState(false);
  const { isLoading: settingsLoading, settings } = useStoreSettings();
  const { language } = useLanguage();
  const t = translations[language];

  useEffect(() => {
    const pageTitle = t.products || 'Products';
    const storeName = settings?.storename || '';
    document.title = storeName ? `${pageTitle} - ${storeName}` : pageTitle;
  }, [t, settings?.storename]);

  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin');
    if (adminState === 'true') {
      setIsAdmin(true);
    }
  }, []);

  if (settingsLoading) {
    return <LoadingScreen />;
  }

  const handleSetIsAdmin = (value: boolean) => {
    setIsAdmin(value);
    localStorage.setItem('isAdmin', value.toString());
  };

  return (
    <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
      <StorePage products={products} currentPage="home" />
    </PublicPageLayout>
  );
}
